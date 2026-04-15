import { Router } from "express";
import { db } from "@workspace/db";
import { shippingAgents } from "@workspace/db/schema";
import { eq, ilike, or, count } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { writeAuditLog } from "../lib/audit";
import { parsePagination, paginate } from "../lib/pagination";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

const agentSchema = z.object({
  code: z.string().min(1),
  nameAr: z.string().min(2),
  nameEn: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
  branchId: z.string().uuid().optional(),
  paymentTerms: z.enum(["CASH","CREDIT_7","CREDIT_15","CREDIT_30","CREDIT_60","CREDIT_90"]).optional(),
  payableAccountId: z.string().uuid().optional(),
  status: z.enum(["ACTIVE","INACTIVE","ARCHIVED"]).optional(),
});

router.get("/", requirePermission("agents", "view"), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const search = String(req.query.search ?? "");
    const where = search ? or(ilike(shippingAgents.nameAr, `%${search}%`), ilike(shippingAgents.code, `%${search}%`)) : undefined;
    const [items, [{ total }]] = await Promise.all([
      db.select().from(shippingAgents).where(where).limit(limit).offset(offset).orderBy(shippingAgents.nameAr),
      db.select({ total: count() }).from(shippingAgents).where(where),
    ]);
    res.json(paginate(items, Number(total), { page, limit, offset }));
  } catch (err) { next(err); }
});

router.get("/:id", requirePermission("agents", "view"), async (req, res, next) => {
  try {
    const agent = await db.query.shippingAgents.findFirst({ where: eq(shippingAgents.id, req.params.id) });
    if (!agent) { res.status(404).json({ error: "وكيل الشحن غير موجود" }); return; }
    res.json(agent);
  } catch (err) { next(err); }
});

router.post("/", requirePermission("agents", "create"), async (req, res, next) => {
  try {
    const body = agentSchema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة", details: body.error.issues }); return; }
    const existing = await db.query.shippingAgents.findFirst({ where: eq(shippingAgents.code, body.data.code) });
    if (existing) { res.status(409).json({ error: "كود الوكيل موجود بالفعل" }); return; }
    const [created] = await db.insert(shippingAgents).values({ ...body.data as any, createdBy: req.user!.sub as any }).returning();
    await writeAuditLog({ req, entityType: "shipping_agents", entityId: created.id, action: "CREATE", after: created });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

router.put("/:id", requirePermission("agents", "edit"), async (req, res, next) => {
  try {
    const existing = await db.query.shippingAgents.findFirst({ where: eq(shippingAgents.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "وكيل الشحن غير موجود" }); return; }
    const body = agentSchema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة" }); return; }
    const [updated] = await db.update(shippingAgents).set({ ...body.data as any, updatedAt: new Date() as any, updatedBy: req.user!.sub as any })
      .where(eq(shippingAgents.id, req.params.id)).returning();
    await writeAuditLog({ req, entityType: "shipping_agents", entityId: req.params.id, action: "UPDATE", before: existing, after: updated });
    res.json(updated);
  } catch (err) { next(err); }
});

router.patch("/:id/status", requirePermission("agents", "edit"), async (req, res, next) => {
  try {
    const { status } = req.body;
    const [updated] = await db.update(shippingAgents).set({ status, updatedAt: new Date() as any })
      .where(eq(shippingAgents.id, req.params.id)).returning();
    await writeAuditLog({ req, entityType: "shipping_agents", entityId: req.params.id, action: "STATUS_CHANGE", after: { status } });
    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
