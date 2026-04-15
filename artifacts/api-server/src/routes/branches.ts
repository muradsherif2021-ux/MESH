import { Router } from "express";
import { db } from "@workspace/db";
import { branches } from "@workspace/db/schema";
import { eq, ilike, count } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { writeAuditLog } from "../lib/audit";
import { parsePagination, paginate } from "../lib/pagination";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

const branchSchema = z.object({
  code: z.string().min(1),
  nameAr: z.string().min(2),
  nameEn: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/branches
router.get("/", requirePermission("branches", "view"), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const search = String(req.query.search ?? "");
    const where = search ? ilike(branches.nameAr, `%${search}%`) : undefined;
    const [items, [{ total }]] = await Promise.all([
      db.select().from(branches).where(where).limit(limit).offset(offset).orderBy(branches.nameAr),
      db.select({ total: count() }).from(branches).where(where),
    ]);
    res.json(paginate(items, Number(total), { page, limit, offset }));
  } catch (err) { next(err); }
});

// GET /api/branches/:id
router.get("/:id", requirePermission("branches", "view"), async (req, res, next) => {
  try {
    const branch = await db.query.branches.findFirst({ where: eq(branches.id, req.params.id) });
    if (!branch) { res.status(404).json({ error: "الفرع غير موجود" }); return; }
    res.json(branch);
  } catch (err) { next(err); }
});

// POST /api/branches
router.post("/", requirePermission("branches", "create"), async (req, res, next) => {
  try {
    const body = branchSchema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة", details: body.error.issues }); return; }
    const [created] = await db.insert(branches).values({ ...body.data, createdBy: req.user!.sub as any }).returning();
    await writeAuditLog({ req, entityType: "branches", entityId: created.id, action: "CREATE", after: created });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

// PUT /api/branches/:id
router.put("/:id", requirePermission("branches", "edit"), async (req, res, next) => {
  try {
    const existing = await db.query.branches.findFirst({ where: eq(branches.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "الفرع غير موجود" }); return; }
    const body = branchSchema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة" }); return; }
    const [updated] = await db.update(branches).set({ ...body.data, updatedAt: new Date() as any })
      .where(eq(branches.id, req.params.id)).returning();
    await writeAuditLog({ req, entityType: "branches", entityId: req.params.id, action: "UPDATE", before: existing, after: updated });
    res.json(updated);
  } catch (err) { next(err); }
});

// PATCH /api/branches/:id/status
router.patch("/:id/status", requirePermission("branches", "edit"), async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const [updated] = await db.update(branches).set({ isActive, updatedAt: new Date() as any })
      .where(eq(branches.id, req.params.id)).returning();
    await writeAuditLog({ req, entityType: "branches", entityId: req.params.id, action: "STATUS_CHANGE", after: { isActive } });
    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
