import { Router } from "express";
import { db } from "@workspace/db";
import { roles, permissions, rolePermissions } from "@workspace/db/schema";
import { eq, count, inArray } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { writeAuditLog } from "../lib/audit";
import { parsePagination, paginate } from "../lib/pagination";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

const roleSchema = z.object({
  name: z.string().min(2),
  nameAr: z.string().min(2),
  description: z.string().optional(),
});

// GET /api/roles
router.get("/", requirePermission("roles", "view"), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const [items, [{ total }]] = await Promise.all([
      db.select().from(roles).limit(limit).offset(offset).orderBy(roles.nameAr),
      db.select({ total: count() }).from(roles),
    ]);
    res.json(paginate(items, Number(total), { page, limit, offset }));
  } catch (err) { next(err); }
});

// GET /api/roles/:id
router.get("/:id", requirePermission("roles", "view"), async (req, res, next) => {
  try {
    const role = await db.query.roles.findFirst({ where: eq(roles.id, req.params.id) });
    if (!role) { res.status(404).json({ error: "الدور غير موجود" }); return; }
    const perms = await db.select({ permission: permissions })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, req.params.id));
    res.json({ ...role, permissions: perms.map(p => p.permission) });
  } catch (err) { next(err); }
});

// POST /api/roles
router.post("/", requirePermission("roles", "create"), async (req, res, next) => {
  try {
    const body = roleSchema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة" }); return; }
    const [created] = await db.insert(roles).values(body.data).returning();
    await writeAuditLog({ req, entityType: "roles", entityId: created.id, action: "CREATE", after: created });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

// PUT /api/roles/:id
router.put("/:id", requirePermission("roles", "edit"), async (req, res, next) => {
  try {
    const existing = await db.query.roles.findFirst({ where: eq(roles.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "الدور غير موجود" }); return; }
    if (existing.isSystem) { res.status(403).json({ error: "لا يمكن تعديل الأدوار النظامية" }); return; }
    const body = roleSchema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة" }); return; }
    const [updated] = await db.update(roles).set({ ...body.data, updatedAt: new Date() as any })
      .where(eq(roles.id, req.params.id)).returning();
    await writeAuditLog({ req, entityType: "roles", entityId: req.params.id, action: "UPDATE", before: existing, after: updated });
    res.json(updated);
  } catch (err) { next(err); }
});

// PUT /api/roles/:id/permissions
router.put("/:id/permissions", requirePermission("roles", "edit"), async (req, res, next) => {
  try {
    const { permissionIds } = req.body as { permissionIds: string[] };
    if (!Array.isArray(permissionIds)) { res.status(400).json({ error: "permissionIds مطلوب" }); return; }
    const role = await db.query.roles.findFirst({ where: eq(roles.id, req.params.id) });
    if (!role) { res.status(404).json({ error: "الدور غير موجود" }); return; }

    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, req.params.id));
    if (permissionIds.length > 0) {
      await db.insert(rolePermissions).values(
        permissionIds.map(pid => ({ roleId: req.params.id, permissionId: pid }))
      );
    }
    await writeAuditLog({ req, entityType: "roles", entityId: req.params.id, action: "PERMISSION_GRANT", after: { permissionIds } });
    res.json({ ok: true, count: permissionIds.length });
  } catch (err) { next(err); }
});

export default router;
