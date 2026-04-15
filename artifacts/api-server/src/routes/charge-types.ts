import { Router } from "express";
import { db } from "@workspace/db";
import { chargeTypes } from "@workspace/db/schema";
import { eq, ilike, count } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { writeAuditLog } from "../lib/audit";
import { parsePagination, paginate } from "../lib/pagination";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

const chargeTypeSchema = z.object({
  code: z.string().min(1),
  nameAr: z.string().min(2),
  nameEn: z.string().optional(),
  accountingType: z.enum(["PASS_THROUGH","REVENUE"]),
  defaultRevenueAccountId: z.string().uuid().optional(),
  defaultSettlementAccountId: z.string().uuid().optional(),
  vatApplicable: z.boolean().default(false),
  requiresCostSource: z.boolean().default(false),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

router.get("/", requirePermission("charge_types", "view"), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const search = String(req.query.search ?? "");
    const where = search ? ilike(chargeTypes.nameAr, `%${search}%`) : undefined;
    const [items, [{ total }]] = await Promise.all([
      db.select().from(chargeTypes).where(where).limit(limit).offset(offset).orderBy(chargeTypes.nameAr),
      db.select({ total: count() }).from(chargeTypes).where(where),
    ]);
    res.json(paginate(items, Number(total), { page, limit, offset }));
  } catch (err) { next(err); }
});

router.get("/:id", requirePermission("charge_types", "view"), async (req, res, next) => {
  try {
    const ct = await db.query.chargeTypes.findFirst({ where: eq(chargeTypes.id, req.params.id) });
    if (!ct) { res.status(404).json({ error: "نوع الرسوم غير موجود" }); return; }
    res.json(ct);
  } catch (err) { next(err); }
});

router.post("/", requirePermission("charge_types", "create"), async (req, res, next) => {
  try {
    const body = chargeTypeSchema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة", details: body.error.issues }); return; }
    const existing = await db.query.chargeTypes.findFirst({ where: eq(chargeTypes.code, body.data.code) });
    if (existing) { res.status(409).json({ error: "كود نوع الرسوم موجود بالفعل" }); return; }
    const [created] = await db.insert(chargeTypes).values({ ...body.data as any, createdBy: req.user!.sub as any }).returning();
    await writeAuditLog({ req, entityType: "charge_types", entityId: created.id, action: "CREATE", after: created });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

router.put("/:id", requirePermission("charge_types", "edit"), async (req, res, next) => {
  try {
    const existing = await db.query.chargeTypes.findFirst({ where: eq(chargeTypes.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "نوع الرسوم غير موجود" }); return; }
    const body = chargeTypeSchema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة" }); return; }
    const [updated] = await db.update(chargeTypes).set({ ...body.data as any, updatedAt: new Date() as any })
      .where(eq(chargeTypes.id, req.params.id)).returning();
    await writeAuditLog({ req, entityType: "charge_types", entityId: req.params.id, action: "UPDATE", before: existing, after: updated });
    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
