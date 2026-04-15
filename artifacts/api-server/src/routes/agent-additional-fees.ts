import { Router } from "express";
import { db } from "@workspace/db";
import { agentAdditionalFees, shippingAgents } from "@workspace/db/schema";
import { eq, ilike, or, count, and } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { writeAuditLog } from "../lib/audit";
import { parsePagination, paginate } from "../lib/pagination";
import { postAgentAdditionalFee, createCostSource, nextDocNumber } from "../lib/posting";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

const schema = z.object({
  agentId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  feeCategory: z.string().optional(),
  description: z.string().min(2),
  totalAmount: z.string().refine(v => parseFloat(v) > 0, "المبلغ يجب أن يكون أكبر من صفر"),
  paymentMethod: z.enum(["CREDIT", "CASH", "BANK_TRANSFER", "CHEQUE"]).default("CREDIT"),
  dueDate: z.string().optional(),
  operationRef: z.string().optional(),
  branchId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

// GET /api/agent-additional-fees
router.get("/", requirePermission("agent_additional_fees", "view"), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const search = String(req.query.search ?? "");
    const status = req.query.status as string | undefined;

    const conditions = [];
    if (search) conditions.push(or(ilike(agentAdditionalFees.description, `%${search}%`), ilike(agentAdditionalFees.number, `%${search}%`)));
    if (status) conditions.push(eq(agentAdditionalFees.status, status as any));
    const where = conditions.length ? and(...conditions) : undefined;

    const [items, [{ total }]] = await Promise.all([
      db.select({ aaf: agentAdditionalFees, agentNameAr: shippingAgents.nameAr, agentCode: shippingAgents.code })
        .from(agentAdditionalFees)
        .leftJoin(shippingAgents, eq(agentAdditionalFees.agentId, shippingAgents.id))
        .where(where).limit(limit).offset(offset).orderBy(agentAdditionalFees.createdAt),
      db.select({ total: count() }).from(agentAdditionalFees).where(where),
    ]);

    const data = items.map(r => ({ ...r.aaf, agentNameAr: r.agentNameAr, agentCode: r.agentCode }));
    res.json(paginate(data, Number(total), { page, limit, offset }));
  } catch (err) { next(err); }
});

// GET /api/agent-additional-fees/:id
router.get("/:id", requirePermission("agent_additional_fees", "view"), async (req, res, next) => {
  try {
    const rows = await db.select({ aaf: agentAdditionalFees, agentNameAr: shippingAgents.nameAr, agentCode: shippingAgents.code })
      .from(agentAdditionalFees)
      .leftJoin(shippingAgents, eq(agentAdditionalFees.agentId, shippingAgents.id))
      .where(eq(agentAdditionalFees.id, req.params.id)).limit(1);
    if (!rows.length) { res.status(404).json({ error: "السجل غير موجود" }); return; }
    const row = rows[0];
    res.json({ ...row.aaf, agentNameAr: row.agentNameAr, agentCode: row.agentCode });
  } catch (err) { next(err); }
});

// POST /api/agent-additional-fees
router.post("/", requirePermission("agent_additional_fees", "create"), async (req, res, next) => {
  try {
    const body = schema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة", details: body.error.issues }); return; }

    const agent = await db.query.shippingAgents.findFirst({ where: eq(shippingAgents.id, body.data.agentId) });
    if (!agent) { res.status(404).json({ error: "وكيل الشحن غير موجود" }); return; }

    const number = await db.transaction(async (tx) => nextDocNumber(tx, "agent_additional_fees"));

    const [created] = await db.insert(agentAdditionalFees).values({
      ...body.data as any, number, status: "DRAFT", createdBy: req.user!.sub as any,
    }).returning();

    await writeAuditLog({ req, entityType: "agent_additional_fees", entityId: created.id, action: "CREATE", after: created });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

// PUT /api/agent-additional-fees/:id
router.put("/:id", requirePermission("agent_additional_fees", "edit"), async (req, res, next) => {
  try {
    const existing = await db.query.agentAdditionalFees.findFirst({ where: eq(agentAdditionalFees.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "السجل غير موجود" }); return; }
    if (existing.status !== "DRAFT") { res.status(400).json({ error: "لا يمكن تعديل سجل محوّل أو ملغى" }); return; }

    const body = schema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة" }); return; }

    const [updated] = await db.update(agentAdditionalFees)
      .set({ ...body.data as any, updatedAt: new Date() as any, updatedBy: req.user!.sub as any })
      .where(eq(agentAdditionalFees.id, req.params.id)).returning();

    await writeAuditLog({ req, entityType: "agent_additional_fees", entityId: req.params.id, action: "UPDATE", before: existing, after: updated });
    res.json(updated);
  } catch (err) { next(err); }
});

// POST /api/agent-additional-fees/:id/post
router.post("/:id/post", requirePermission("agent_additional_fees", "post"), async (req, res, next) => {
  try {
    const existing = await db.query.agentAdditionalFees.findFirst({ where: eq(agentAdditionalFees.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "السجل غير موجود" }); return; }
    if (existing.status !== "DRAFT") { res.status(400).json({ error: "السجل محوّل مسبقاً أو ملغى" }); return; }

    const userId = req.user!.sub as string;

    const result = await db.transaction(async (tx) => {
      const je = await postAgentAdditionalFee({
        tx, docId: existing.id, docNumber: existing.number, date: existing.date,
        amount: String(existing.totalAmount), agentId: existing.agentId,
        branchId: existing.branchId, description: existing.description, userId,
      });
      const cs = await createCostSource({
        tx, sourceType: "AGENT_EXTRA_FEE", sourceId: existing.id,
        sourceNumber: existing.number, date: existing.date, branchId: existing.branchId,
        description: existing.description, agentId: existing.agentId,
        operationRef: existing.operationRef, totalAmount: String(existing.totalAmount),
        journalEntryId: je.id, userId,
      });
      const [updated] = await tx.update(agentAdditionalFees).set({
        status: "CONFIRMED", journalEntryId: je.id as any,
        postedAt: new Date(), postedBy: userId as any, updatedAt: new Date() as any,
      }).where(eq(agentAdditionalFees.id, existing.id)).returning();
      return { doc: updated, je, costSource: cs };
    });

    await writeAuditLog({ req, entityType: "agent_additional_fees", entityId: existing.id, action: "POST", before: existing, after: result.doc });
    res.json(result);
  } catch (err) { next(err); }
});

// PATCH /api/agent-additional-fees/:id/cancel
router.patch("/:id/cancel", requirePermission("agent_additional_fees", "edit"), async (req, res, next) => {
  try {
    const existing = await db.query.agentAdditionalFees.findFirst({ where: eq(agentAdditionalFees.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "السجل غير موجود" }); return; }
    if (existing.status !== "DRAFT") { res.status(400).json({ error: "لا يمكن إلغاء سجل محوّل" }); return; }
    const [updated] = await db.update(agentAdditionalFees)
      .set({ status: "CANCELLED", updatedAt: new Date() as any })
      .where(eq(agentAdditionalFees.id, req.params.id)).returning();
    await writeAuditLog({ req, entityType: "agent_additional_fees", entityId: req.params.id, action: "STATUS_CHANGE", before: existing, after: updated });
    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
