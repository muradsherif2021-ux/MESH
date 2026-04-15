import { Router } from "express";
import { db } from "@workspace/db";
import { fiscalYears, fiscalPeriods } from "@workspace/db/schema";
import { eq, count } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { writeAuditLog } from "../lib/audit";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

const fySchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().min(2),
  startDate: z.string(),
  endDate: z.string(),
  notes: z.string().optional(),
});

const periodSchema = z.object({
  periodNumber: z.number().int().min(1).max(12),
  nameAr: z.string().min(2),
  startDate: z.string(),
  endDate: z.string(),
});

// GET /api/fiscal-years
router.get("/", requirePermission("fiscal_years", "view"), async (req, res, next) => {
  try {
    const items = await db.select().from(fiscalYears).orderBy(fiscalYears.name);
    res.json(items);
  } catch (err) { next(err); }
});

// GET /api/fiscal-years/:id
router.get("/:id", requirePermission("fiscal_years", "view"), async (req, res, next) => {
  try {
    const fy = await db.query.fiscalYears.findFirst({ where: eq(fiscalYears.id, req.params.id) });
    if (!fy) { res.status(404).json({ error: "السنة المالية غير موجودة" }); return; }
    const periods = await db.select().from(fiscalPeriods).where(eq(fiscalPeriods.fiscalYearId, req.params.id)).orderBy(fiscalPeriods.periodNumber);
    res.json({ ...fy, periods });
  } catch (err) { next(err); }
});

// POST /api/fiscal-years
router.post("/", requirePermission("fiscal_years", "create"), async (req, res, next) => {
  try {
    const body = fySchema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة", details: body.error.issues }); return; }
    const [created] = await db.insert(fiscalYears).values({ ...body.data, createdBy: req.user!.sub as any }).returning();
    // Auto-generate 12 monthly periods
    const startYear = new Date(body.data.startDate).getFullYear();
    const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
    const periodsToCreate = Array.from({ length: 12 }, (_, i) => {
      const start = new Date(startYear, i, 1);
      const end = new Date(startYear, i + 1, 0);
      return {
        fiscalYearId: created.id,
        periodNumber: i + 1,
        nameAr: `${monthNames[i]} ${startYear}`,
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      };
    });
    await db.insert(fiscalPeriods).values(periodsToCreate);
    await writeAuditLog({ req, entityType: "fiscal_years", entityId: created.id, action: "CREATE", after: created });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

// PATCH /api/fiscal-years/:id/close
router.patch("/:id/close", requirePermission("fiscal_years", "post"), async (req, res, next) => {
  try {
    const fy = await db.query.fiscalYears.findFirst({ where: eq(fiscalYears.id, req.params.id) });
    if (!fy) { res.status(404).json({ error: "السنة المالية غير موجودة" }); return; }
    if (fy.status === "CLOSED") { res.status(409).json({ error: "السنة المالية مغلقة بالفعل" }); return; }
    const [updated] = await db.update(fiscalYears)
      .set({ status: "CLOSED", closedAt: new Date() as any, closedBy: req.user!.sub as any, updatedAt: new Date() as any })
      .where(eq(fiscalYears.id, req.params.id)).returning();
    await writeAuditLog({ req, entityType: "fiscal_years", entityId: req.params.id, action: "STATUS_CHANGE", after: { status: "CLOSED" } });
    res.json(updated);
  } catch (err) { next(err); }
});

// GET /api/fiscal-years/:id/periods
router.get("/:id/periods", requirePermission("fiscal_years", "view"), async (req, res, next) => {
  try {
    const periods = await db.select().from(fiscalPeriods)
      .where(eq(fiscalPeriods.fiscalYearId, req.params.id)).orderBy(fiscalPeriods.periodNumber);
    res.json(periods);
  } catch (err) { next(err); }
});

// PATCH /api/fiscal-years/:id/periods/:periodId/close
router.patch("/:id/periods/:periodId/close", requirePermission("fiscal_years", "post"), async (req, res, next) => {
  try {
    const period = await db.query.fiscalPeriods.findFirst({ where: eq(fiscalPeriods.id, req.params.periodId) });
    if (!period) { res.status(404).json({ error: "الفترة المالية غير موجودة" }); return; }
    if (period.status === "CLOSED") { res.status(409).json({ error: "الفترة مغلقة بالفعل" }); return; }
    const [updated] = await db.update(fiscalPeriods)
      .set({ status: "CLOSED", closedAt: new Date() as any, closedBy: req.user!.sub as any })
      .where(eq(fiscalPeriods.id, req.params.periodId)).returning();
    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
