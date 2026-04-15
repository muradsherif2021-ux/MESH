import { Router } from "express";
import { db } from "@workspace/db";
import { users, refreshTokens, roles } from "@workspace/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { comparePassword, hashPassword } from "../lib/password";
import { writeAuditLog } from "../lib/audit";
import { requireAuth } from "../middlewares/auth";
import { z } from "zod";

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبان" });
      return;
    }

    const user = await db.query.users.findFirst({
      where: eq(users.username, body.data.username),
      with: { role: true },
    });

    if (!user || !(await comparePassword(body.data.password, user.passwordHash))) {
      res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      return;
    }

    if (user.status !== "ACTIVE") {
      res.status(403).json({ error: "الحساب غير نشط أو مقفول" });
      return;
    }

    const role = await db.query.roles.findFirst({ where: eq(roles.id, user.roleId ?? "") });

    const payload = {
      sub: user.id,
      username: user.username,
      roleId: user.roleId,
      roleName: role?.name ?? null,
      branchId: user.branchId,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(user.id);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.insert(refreshTokens).values({
      userId: user.id,
      token: refreshToken,
      expiresAt,
    });

    // Update last login
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    await writeAuditLog({ req, entityType: "users", entityId: user.id, action: "LOGIN" });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        nameAr: user.nameAr,
        nameEn: user.nameEn,
        roleId: user.roleId,
        roleName: role?.name ?? null,
        roleNameAr: role?.nameAr ?? null,
        branchId: user.branchId,
        status: user.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post("/refresh", async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) {
      res.status(401).json({ error: "لا يوجد رمز تحديث" });
      return;
    }

    const payload = verifyRefreshToken(token);
    if (!payload) {
      res.status(401).json({ error: "رمز التحديث غير صالح أو منتهي الصلاحية" });
      return;
    }

    const stored = await db.query.refreshTokens.findFirst({
      where: and(
        eq(refreshTokens.token, token),
        isNull(refreshTokens.revokedAt),
      ),
    });

    if (!stored || stored.expiresAt < new Date()) {
      res.clearCookie("refresh_token");
      res.status(401).json({ error: "الجلسة منتهية" });
      return;
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, payload.sub) });
    if (!user || user.status !== "ACTIVE") {
      res.status(403).json({ error: "الحساب غير نشط" });
      return;
    }

    const role = await db.query.roles.findFirst({ where: eq(roles.id, user.roleId ?? "") });

    const accessToken = signAccessToken({
      sub: user.id,
      username: user.username,
      roleId: user.roleId,
      roleName: role?.name ?? null,
      branchId: user.branchId,
    });

    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token;
    if (token) {
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.token, token));
    }
    await writeAuditLog({ req, entityType: "users", entityId: req.user?.sub, action: "LOGOUT" });
    res.clearCookie("refresh_token");
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user!.sub),
      columns: {
        passwordHash: false,
      },
    });
    if (!user) {
      res.status(404).json({ error: "المستخدم غير موجود" });
      return;
    }
    const role = user.roleId ? await db.query.roles.findFirst({ where: eq(roles.id, user.roleId) }) : null;
    res.json({ ...user, roleName: role?.name, roleNameAr: role?.nameAr });
  } catch (err) {
    next(err);
  }
});

export default router;
