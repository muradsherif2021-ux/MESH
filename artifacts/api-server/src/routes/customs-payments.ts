import { Router } from "express";
import { db } from "@workspace/db";
import { customsPayments, treasuries, bankAccounts } from "@workspace/db/schema";
import { eq, ilike, or, count, and } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { writeAuditLog } from "../lib/audit";
import { parsePagination, paginate } from "../lib/pagination";
import { postCustomsPayment, createCostSource, nextDocNumber } from "../lib/posting";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  amount: z.string().refine(v => parseFloat(v) > 0, "المبلغ يجب أن يكون أكبر من صفر"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE"]).default("BANK_TRANSFER"),
  treasuryId: z.string().uuid().optional(),
  bankAccountId: z.string().uuid().optional(),
  externalRef: z.string().optional(),
  operationRef: z.string().optional(),
  description: z.string().optional(),
  branchId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

// GET /api/customs-payments
router.get("/", requirePermission("customs_payments", "view"), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const search = String(req.query.search ?? "");
    const status = req.query.status as string | undefined;

    const conditions = [];
    if (search) conditions.push(or(
      ilike(customsPayments.number, `%${search}%`),
      ilike(customsPayments.externalRef, `%${search}%`),
      ilike(customsPayments.operationRef, `%${search}%`),
    ));
    if (status) conditions.push(eq(customsPayments.status, status as any));
    const where = conditions.length ? and(...conditions) : undefined;

    const [items, [{ total }]] = await Promise.all([
      db.select({
        cp: customsPayments,
        treasuryNameAr: treasuries.nameAr,
        bankNameAr: bankAccounts.nameAr,
      })
        .from(customsPayments)
        .leftJoin(treasuries, eq(customsPayments.treasuryId, treasuries.id))
        .leftJoin(bankAccounts, eq(customsPayments.bankAccountId, bankAccounts.id))
        .where(where).limit(limit).offset(offset).orderBy(customsPayments.createdAt),
      db.select({ total: count() }).from(customsPayments).where(where),
    ]);

    const data = items.map(r => ({ ...r.cp, treasuryNameAr: r.treasuryNameAr, bankNameAr: r.bankNameAr }));
    res.json(paginate(data, Number(total), { page, limit, offset }));
  } catch (err) { next(err); }
});

// GET /api/customs-payments/:id
router.get("/:id", requirePermission("customs_payments", "view"), async (req, res, next) => {
  try {
    const rows = await db.select({
      cp: customsPayments,
      treasuryNameAr: treasuries.nameAr,
      bankNameAr: bankAccounts.nameAr,
    })
      .from(customsPayments)
      .leftJoin(treasuries, eq(customsPayments.treasuryId, treasuries.id))
      .leftJoin(bankAccounts, eq(customsPayments.bankAccountId, bankAccounts.id))
      .where(eq(customsPayments.id, req.params.id)).limit(1);

    if (!rows.length) { res.status(404).json({ error: "السجل غير موجود" }); return; }
    const row = rows[0];
    res.json({ ...row.cp, treasuryNameAr: row.treasuryNameAr, bankNameAr: row.bankNameAr });
  } catch (err) { next(err); }
});

// POST /api/customs-payments
router.post("/", requirePermission("customs_payments", "create"), async (req, res, next) => {
  try {
    const body = schema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة", details: body.error.issues }); return; }

    const number = await db.transaction(async (tx) => nextDocNumber(tx, "customs_payments"));

    const [created] = await db.insert(customsPayments).values({
      ...body.data as any, number, status: "DRAFT", createdBy: req.user!.sub as any,
    }).returning();

    await writeAuditLog({ req, entityType: "customs_payments", entityId: created.id, action: "CREATE", after: created });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

// PUT /api/customs-payments/:id
router.put("/:id", requirePermission("customs_payments", "edit"), async (req, res, next) => {
  try {
    const existing = await db.query.customsPayments.findFirst({ where: eq(customsPayments.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "السجل غير موجود" }); return; }
    if (existing.status !== "DRAFT") { res.status(400).json({ error: "لا يمكن تعديل سجل محوّل أو ملغى" }); return; }

    const body = schema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة" }); return; }

    const [updated] = await db.update(customsPayments)
      .set({ ...body.data as any, updatedAt: new Date() as any, updatedBy: req.user!.sub as any })
      .where(eq(customsPayments.id, req.params.id)).returning();

    await writeAuditLog({ req, entityType: "customs_payments", entityId: req.params.id, action: "UPDATE", before: existing, after: updated });
    res.json(updated);
  } catch (err) { next(err); }
});

// POST /api/customs-payments/:id/post
router.post("/:id/post", requirePermission("customs_payments", "post"), async (req, res, next) => {
  try {
    const existing = await db.query.customsPayments.findFirst({ where: eq(customsPayments.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "السجل غير موجود" }); return; }
    if (existing.status !== "DRAFT") { res.status(400).json({ error: "السجل محوّل مسبقاً أو ملغى" }); return; }

    const userId = req.user!.sub as string;

    const result = await db.transaction(async (tx) => {
      const je = await postCustomsPayment({
        tx, docId: existing.id, docNumber: existing.number, date: existing.date,
        amount: String(existing.amount), paymentMethod: existing.paymentMethod,
        branchId: existing.branchId,
        description: existing.description ?? `سداد رسوم جمركية — ${existing.number}`,
        userId,
      });
      const cs = await createCostSource({
        tx, sourceType: "CUSTOMS_PAYMENT", sourceId: existing.id,
        sourceNumber: existing.number, date: existing.date, branchId: existing.branchId,
        description: existing.description ?? `سداد رسوم جمركية — ${existing.number}`,
        operationRef: existing.operationRef, totalAmount: String(existing.amount),
        journalEntryId: je.id, userId,
      });
      const [updated] = await tx.update(customsPayments).set({
        status: "CONFIRMED", journalEntryId: je.id as any,
        postedAt: new Date(), postedBy: userId as any, updatedAt: new Date() as any,
      }).where(eq(customsPayments.id, existing.id)).returning();
      return { doc: updated, je, costSource: cs };
    });

    await writeAuditLog({ req, entityType: "customs_payments", entityId: existing.id, action: "POST", before: existing, after: result.doc });
    res.json(result);
  } catch (err) { next(err); }
});

// PATCH /api/customs-payments/:id/cancel
router.patch("/:id/cancel", requirePermission("customs_payments", "edit"), async (req, res, next) => {
  try {
    const existing = await db.query.customsPayments.findFirst({ where: eq(customsPayments.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "السجل غير موجود" }); return; }
    if (existing.status !== "DRAFT") { res.status(400).json({ error: "لا يمكن إلغاء سجل محوّل" }); return; }
    const [updated] = await db.update(customsPayments)
      .set({ status: "CANCELLED", updatedAt: new Date() as any })
      .where(eq(customsPayments.id, req.params.id)).returning();
    await writeAuditLog({ req, entityType: "customs_payments", entityId: req.params.id, action: "STATUS_CHANGE", before: existing, after: updated });
    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
