import { Router } from "express";
import { db } from "@workspace/db";
import { users, roles, branches } from "@workspace/db/schema";
import { eq, ilike, or, count, and } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { hashPassword } from "../lib/password";
import { writeAuditLog } from "../lib/audit";
import { parsePagination, paginate } from "../lib/pagination";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

const createUserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email().optional(),
  nameAr: z.string().min(2),
  nameEn: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(8),
  roleId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
});

const updateUserSchema = createUserSchema.omit({ password: true }).extend({
  password: z.string().min(8).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "LOCKED"]).optional(),
});

// GET /api/users
router.get("/", requirePermission("users", "view"), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const search = String(req.query.search ?? "");

    const where = search
      ? or(ilike(users.nameAr, `%${search}%`), ilike(users.username, `%${search}%`))
      : undefined;

    const [items, [{ total }]] = await Promise.all([
      db.select({
        id: users.id,
        username: users.username,
        nameAr: users.nameAr,
        nameEn: users.nameEn,
        email: users.email,
        status: users.status,
        roleId: users.roleId,
        branchId: users.branchId,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
        .from(users)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(users.createdAt),
      db.select({ total: count() }).from(users).where(where),
    ]);

    res.json(paginate(items, Number(total), { page, limit, offset }));
  } catch (err) { next(err); }
});

// GET /api/users/:id
router.get("/:id", requirePermission("users", "view"), async (req, res, next) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.params.id),
      columns: { passwordHash: false },
    });
    if (!user) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }
    res.json(user);
  } catch (err) { next(err); }
});

// POST /api/users
router.post("/", requirePermission("users", "create"), async (req, res, next) => {
  try {
    const body = createUserSchema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة", details: body.error.issues }); return; }

    const existing = await db.query.users.findFirst({ where: eq(users.username, body.data.username) });
    if (existing) { res.status(409).json({ error: "اسم المستخدم موجود بالفعل" }); return; }

    const passwordHash = await hashPassword(body.data.password);
    const [created] = await db.insert(users).values({
      ...body.data,
      passwordHash,
      createdBy: req.user!.sub as any,
    }).returning({ id: users.id, username: users.username, nameAr: users.nameAr, status: users.status });

    await writeAuditLog({ req, entityType: "users", entityId: created.id, action: "CREATE", after: created });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

// PUT /api/users/:id
router.put("/:id", requirePermission("users", "edit"), async (req, res, next) => {
  try {
    const body = updateUserSchema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة", details: body.error.issues }); return; }

    const existing = await db.query.users.findFirst({ where: eq(users.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "المستخدم غير موجود" }); return; }

    const updateData: Partial<typeof users.$inferInsert> = {
      ...body.data,
      updatedAt: new Date() as any,
    } as any;

    if (body.data.password) {
      (updateData as any).passwordHash = await hashPassword(body.data.password);
    }
    delete (updateData as any).password;

    const [updated] = await db.update(users).set(updateData).where(eq(users.id, req.params.id))
      .returning({ id: users.id, username: users.username, nameAr: users.nameAr, status: users.status });

    await writeAuditLog({ req, entityType: "users", entityId: req.params.id, action: "UPDATE", before: existing, after: updated });
    res.json(updated);
  } catch (err) { next(err); }
});

// PATCH /api/users/:id/status
router.patch("/:id/status", requirePermission("users", "edit"), async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["ACTIVE", "INACTIVE", "LOCKED"].includes(status)) {
      res.status(400).json({ error: "حالة غير صالحة" }); return;
    }
    const [updated] = await db.update(users).set({ status, updatedAt: new Date() as any }).where(eq(users.id, req.params.id))
      .returning({ id: users.id, status: users.status });
    await writeAuditLog({ req, entityType: "users", entityId: req.params.id, action: "STATUS_CHANGE", after: { status } });
    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
