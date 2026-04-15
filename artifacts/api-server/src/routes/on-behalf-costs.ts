import { Router } from "express";
import { db } from "@workspace/db";
import { onBehalfCosts, treasuries, bankAccounts } from "@workspace/db/schema";
import { eq, ilike, or, count, and } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { writeAuditLog } from "../lib/audit";
import { parsePagination, paginate } from "../lib/pagination";
import { postOnBehalfCost, createCostSource, nextDocNumber } from "../lib/posting";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

const schema = z.object({
  category: z.enum(["DRIVER_ADVANCE", "FIELD_ADVANCE", "DOCUMENT_RELEASE", "MISC_RECOVERABLE"]).default("MISC_RECOVERABLE"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  payeeName: z.string().optional(),
  amount: z.string().refine(v => parseFloat(v) > 0, "المبلغ يجب أن يكون أكبر من صفر"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE"]).default("CASH"),
  treasuryId: z.string().uuid().optional(),
  bankAccountId: z.string().uuid().optional(),
  operationRef: z.string().optional(),
  description: z.string().min(2),
  branchId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const CATEGORY_LABELS: Record<string, string> = {
  DRIVER_ADVANCE: "سلفة سائق",
  FIELD_ADVANCE: "سلفة ميدانية",
  DOCUMENT_RELEASE: "دفعة تحرير مستندات",
  MISC_RECOVERABLE: "تكلفة متنوعة قابلة للاسترداد",
};

// GET /api/on-behalf-costs
router.get("/", requirePermission("on_behalf_costs", "view"), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const search = String(req.query.search ?? "");
    const status = req.query.status as string | undefined;
    const category = req.query.category as string | undefined;

    const conditions = [];
    if (search) conditions.push(or(
      ilike(onBehalfCosts.description, `%${search}%`),
      ilike(onBehalfCosts.number, `%${search}%`),
      ilike(onBehalfCosts.payeeName, `%${search}%`),
    ));
    if (status) conditions.push(eq(onBehalfCosts.status, status as any));
    if (category) conditions.push(eq(onBehalfCosts.category, category as any));
    const where = conditions.length ? and(...conditions) : undefined;

    const [items, [{ total }]] = await Promise.all([
      db.select({
        obc: onBehalfCosts,
        treasuryNameAr: treasuries.nameAr,
        bankNameAr: bankAccounts.nameAr,
      })
        .from(onBehalfCosts)
        .leftJoin(treasuries, eq(onBehalfCosts.treasuryId, treasuries.id))
        .leftJoin(bankAccounts, eq(onBehalfCosts.bankAccountId, bankAccounts.id))
        .where(where).limit(limit).offset(offset).orderBy(onBehalfCosts.createdAt),
      db.select({ total: count() }).from(onBehalfCosts).where(where),
    ]);

    const data = items.map(r => ({
      ...r.obc,
      categoryLabel: CATEGORY_LABELS[r.obc.category ?? "MISC_RECOVERABLE"],
      treasuryNameAr: r.treasuryNameAr,
      bankNameAr: r.bankNameAr,
    }));
    res.json(paginate(data, Number(total), { page, limit, offset }));
  } catch (err) { next(err); }
});

// GET /api/on-behalf-costs/:id
router.get("/:id", requirePermission("on_behalf_costs", "view"), async (req, res, next) => {
  try {
    const rows = await db.select({
      obc: onBehalfCosts,
      treasuryNameAr: treasuries.nameAr,
      bankNameAr: bankAccounts.nameAr,
    })
      .from(onBehalfCosts)
      .leftJoin(treasuries, eq(onBehalfCosts.treasuryId, treasuries.id))
      .leftJoin(bankAccounts, eq(onBehalfCosts.bankAccountId, bankAccounts.id))
      .where(eq(onBehalfCosts.id, req.params.id)).limit(1);

    if (!rows.length) { res.status(404).json({ error: "السجل غير موجود" }); return; }
    const row = rows[0];
    res.json({
      ...row.obc,
      categoryLabel: CATEGORY_LABELS[row.obc.category ?? "MISC_RECOVERABLE"],
      treasuryNameAr: row.treasuryNameAr,
      bankNameAr: row.bankNameAr,
    });
  } catch (err) { next(err); }
});

// POST /api/on-behalf-costs
router.post("/", requirePermission("on_behalf_costs", "create"), async (req, res, next) => {
  try {
    const body = schema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة", details: body.error.issues }); return; }

    const number = await db.transaction(async (tx) => nextDocNumber(tx, "on_behalf_costs"));

    const [created] = await db.insert(onBehalfCosts).values({
      ...body.data as any, number, status: "DRAFT", createdBy: req.user!.sub as any,
    }).returning();

    await writeAuditLog({ req, entityType: "on_behalf_costs", entityId: created.id, action: "CREATE", after: created });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

// PUT /api/on-behalf-costs/:id
router.put("/:id", requirePermission("on_behalf_costs", "edit"), async (req, res, next) => {
  try {
    const existing = await db.query.onBehalfCosts.findFirst({ where: eq(onBehalfCosts.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "السجل غير موجود" }); return; }
    if (existing.status !== "DRAFT") { res.status(400).json({ error: "لا يمكن تعديل سجل محوّل أو ملغى" }); return; }

    const body = schema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة" }); return; }

    const [updated] = await db.update(onBehalfCosts)
      .set({ ...body.data as any, updatedAt: new Date() as any, updatedBy: req.user!.sub as any })
      .where(eq(onBehalfCosts.id, req.params.id)).returning();

    await writeAuditLog({ req, entityType: "on_behalf_costs", entityId: req.params.id, action: "UPDATE", before: existing, after: updated });
    res.json(updated);
  } catch (err) { next(err); }
});

// POST /api/on-behalf-costs/:id/post
router.post("/:id/post", requirePermission("on_behalf_costs", "post"), async (req, res, next) => {
  try {
    const existing = await db.query.onBehalfCosts.findFirst({ where: eq(onBehalfCosts.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "السجل غير موجود" }); return; }
    if (existing.status !== "DRAFT") { res.status(400).json({ error: "السجل محوّل مسبقاً أو ملغى" }); return; }

    const userId = req.user!.sub as string;
    const sourceType = existing.category === "DRIVER_ADVANCE" || existing.category === "FIELD_ADVANCE"
      ? "FIELD_ADVANCE" : "OTHER_ON_BEHALF_COST";

    const result = await db.transaction(async (tx) => {
      const je = await postOnBehalfCost({
        tx, docId: existing.id, docNumber: existing.number, date: existing.date,
        amount: String(existing.amount), paymentMethod: existing.paymentMethod,
        branchId: existing.branchId, description: existing.description, userId,
      });
      const cs = await createCostSource({
        tx, sourceType, sourceId: existing.id,
        sourceNumber: existing.number, date: existing.date, branchId: existing.branchId,
        description: existing.description, operationRef: existing.operationRef,
        totalAmount: String(existing.amount), journalEntryId: je.id, userId,
      });
      const [updated] = await tx.update(onBehalfCosts).set({
        status: "CONFIRMED", journalEntryId: je.id as any,
        postedAt: new Date(), postedBy: userId as any, updatedAt: new Date() as any,
      }).where(eq(onBehalfCosts.id, existing.id)).returning();
      return { doc: updated, je, costSource: cs };
    });

    await writeAuditLog({ req, entityType: "on_behalf_costs", entityId: existing.id, action: "POST", before: existing, after: result.doc });
    res.json(result);
  } catch (err) { next(err); }
});

// PATCH /api/on-behalf-costs/:id/cancel
router.patch("/:id/cancel", requirePermission("on_behalf_costs", "edit"), async (req, res, next) => {
  try {
    const existing = await db.query.onBehalfCosts.findFirst({ where: eq(onBehalfCosts.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "السجل غير موجود" }); return; }
    if (existing.status !== "DRAFT") { res.status(400).json({ error: "لا يمكن إلغاء سجل محوّل" }); return; }
    const [updated] = await db.update(onBehalfCosts)
      .set({ status: "CANCELLED", updatedAt: new Date() as any })
      .where(eq(onBehalfCosts.id, req.params.id)).returning();
    await writeAuditLog({ req, entityType: "on_behalf_costs", entityId: req.params.id, action: "STATUS_CHANGE", before: existing, after: updated });
    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
