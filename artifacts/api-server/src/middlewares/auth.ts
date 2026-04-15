import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type TokenPayload } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "غير مصرح به" });
    return;
  }
  const token = auth.slice(7);
  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({ error: "الجلسة منتهية أو غير صالحة" });
    return;
  }
  req.user = payload;
  next();
}

export function requirePermission(module: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "غير مصرح به" });
      return;
    }
    // Super-admin bypasses permission checks
    if (req.user.roleName === "super_admin") {
      next();
      return;
    }
    // Load permissions from DB for the user's role
    try {
      const { db } = await import("@workspace/db");
      const { permissions, rolePermissions } = await import("@workspace/db/schema");
      const { eq, and } = await import("drizzle-orm");

      if (!req.user.roleId) {
        res.status(403).json({ error: "لا يوجد دور مخصص لهذا المستخدم" });
        return;
      }

      const result = await db
        .select({ action: permissions.action })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(
          and(
            eq(rolePermissions.roleId, req.user.roleId),
            eq(permissions.module, module),
            eq(permissions.action, action),
          ),
        )
        .limit(1);

      if (result.length === 0) {
        res.status(403).json({ error: "ليس لديك صلاحية لهذا الإجراء" });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
