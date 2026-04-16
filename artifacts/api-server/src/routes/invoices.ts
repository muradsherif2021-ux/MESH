import { Router } from "express";
import { db } from "@workspace/db";
import {
  invoices, invoiceLines, costSourceAllocations, costSources,
  customers, chargeTypes, accounts,
} from "@workspace/db/schema";
import { eq, ilike, or, count, and, sql, inArray } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { writeAuditLog } from "../lib/audit";
import { parsePagination, paginate } from "../lib/pagination";
import { postInvoice, nextDocNumber } from "../lib/posting";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

const VAT_RATE = 15;

const lineSchema = z.object({
  id: z.string().optional(),
  chargeTypeId: z.string().uuid().optional(),
  description: z.string().min(1),
  quantity: z.coerce.number().default(1),
  unitPrice: z.coerce.number().positive(),
  amount: z.coerce.number().positive(),
  accountingType: z.enum(["PASS_THROUGH", "REVENUE"]),
  vatApplicable: z.boolean().default(false),
  costSourceId: z.string().uuid().optional(),
  revenueAccountId: z.string().uuid().optional(),
  displayOrder: z.string().optional(),
  allocatedAmount: z.coerce.number().optional(),
});

const headerSchema = z.object({
  customerId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  dueDate: z.string().optional(),
  branchId: z.string().uuid().optional(),
  notes: z.string().optional(),
  vatEnabled: z.boolean().default(true),
  vatRate: z.coerce.number().default(15),
  lines: z.array(lineSchema).min(1, "الفاتورة يجب أن تحتوي على سطر واحد على الأقل"),
});

function computeTotals(lines: z.infer<typeof lineSchema>[], vatRate: number, vatEnabled: boolean) {
  let subtotalPassThrough = 0;
  let subtotalRevenue = 0;
  let vatAmount = 0;

  for (const line of lines) {
    const lineAmt = Number(line.amount);
    if (line.accountingType === "PASS_THROUGH") {
      subtotalPassThrough += lineAmt;
    } else {
      subtotalRevenue += lineAmt;
      if (vatEnabled && line.vatApplicable) {
        vatAmount += lineAmt * (vatRate / 100);
      }
    }
  }
  return {
    subtotalPassThrough,
    subtotalRevenue,
    vatAmount: Math.round(vatAmount * 100) / 100,
    totalAmount: Math.round((subtotalPassThrough + subtotalRevenue + vatAmount) * 100) / 100,
  };
}

// GET /api/invoices
router.get("/", requirePermission("invoices", "view"), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const search = String(req.query.search ?? "");
    const status = req.query.status as string | undefined;

    const conditions = [];
    if (search) conditions.push(or(ilike(invoices.number, `%${search}%`)));
    if (status) conditions.push(eq(invoices.status, status as any));
    const where = conditions.length ? and(...conditions) : undefined;

    const [items, [{ total }]] = await Promise.all([
      db.select({
        inv: invoices,
        customerNameAr: customers.nameAr,
        customerCode: customers.code,
      })
        .from(invoices)
        .leftJoin(customers, eq(invoices.customerId, customers.id))
        .where(where)
        .limit(limit).offset(offset)
        .orderBy(invoices.createdAt),
      db.select({ total: count() }).from(invoices).where(where),
    ]);

    const data = items.map(r => ({ ...r.inv, customerNameAr: r.customerNameAr, customerCode: r.customerCode }));
    res.json(paginate(data, Number(total), { page, limit, offset }));
  } catch (err) { next(err); }
});

// GET /api/invoices/available-cost-sources — cost sources picker for allocation
router.get("/available-cost-sources", requirePermission("cost_sources", "view"), async (req, res, next) => {
  try {
    const excludeInvoiceId = req.query.excludeInvoiceId as string | undefined;

    // Get cost sources that are not fully allocated
    const sources = await db.select({
      cs: costSources,
    })
      .from(costSources)
      .where(
        and(
          or(
            eq(costSources.status, "UNALLOCATED"),
            eq(costSources.status, "PARTIALLY_ALLOCATED"),
          ),
        ),
      )
      .orderBy(costSources.date)
      .limit(200);

    // If editing an existing draft invoice, we need to know its existing draft allocations
    // so we can show the remaining balance excluding them
    let draftAllocations: { costSourceId: string; allocatedAmount: string }[] = [];
    if (excludeInvoiceId) {
      const allocs = await db.select({
        costSourceId: costSourceAllocations.costSourceId,
        allocatedAmount: costSourceAllocations.allocatedAmount,
      })
        .from(costSourceAllocations)
        .where(
          and(
            eq(costSourceAllocations.invoiceId, excludeInvoiceId as any),
            eq(costSourceAllocations.status, "DRAFT"),
          ),
        );
      draftAllocations = allocs.map(a => ({ costSourceId: String(a.costSourceId), allocatedAmount: String(a.allocatedAmount) }));
    }

    const SOURCE_TYPE_LABELS: Record<string, string> = {
      AGENT_TRIP: "رحلة وكيل شحن",
      AGENT_EXTRA_FEE: "رسوم إضافية وكيل",
      CUSTOMS_PAYMENT: "سداد رسوم جمركية",
      FIELD_ADVANCE: "سلفة ميدانية",
      OTHER_ON_BEHALF_COST: "تكلفة بالنيابة",
    };

    const data = sources.map(r => {
      const existing = draftAllocations.find(a => a.costSourceId === r.cs.id);
      const alreadyDraftAllocated = existing ? Number(existing.allocatedAmount) : 0;
      const available = Number(r.cs.remainingAmount) + alreadyDraftAllocated;
      return {
        ...r.cs,
        sourceTypeLabel: SOURCE_TYPE_LABELS[r.cs.sourceType ?? ""] ?? r.cs.sourceType,
        availableForAllocation: Math.max(0, available).toFixed(2),
        alreadyDraftAllocated: alreadyDraftAllocated.toFixed(2),
      };
    }).filter(r => Number(r.availableForAllocation) > 0);

    res.json({ data });
  } catch (err) { next(err); }
});

// GET /api/invoices/:id
router.get("/:id", requirePermission("invoices", "view"), async (req, res, next) => {
  try {
    const rows = await db.select({
      inv: invoices,
      customerNameAr: customers.nameAr,
      customerCode: customers.code,
      customerVatNumber: customers.vatNumber,
    })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(eq(invoices.id, req.params.id))
      .limit(1);

    if (!rows.length) { res.status(404).json({ error: "الفاتورة غير موجودة" }); return; }
    const row = rows[0];

    const lines = await db.select({
      line: invoiceLines,
      chargeTypeName: chargeTypes.nameAr,
    })
      .from(invoiceLines)
      .leftJoin(chargeTypes, eq(invoiceLines.chargeTypeId, chargeTypes.id))
      .where(eq(invoiceLines.invoiceId, req.params.id))
      .orderBy(invoiceLines.displayOrder);

    const allocs = await db.select({
      alloc: costSourceAllocations,
      sourceNumber: costSources.sourceNumber,
      sourceType: costSources.sourceType,
    })
      .from(costSourceAllocations)
      .leftJoin(costSources, eq(costSourceAllocations.costSourceId, costSources.id))
      .where(eq(costSourceAllocations.invoiceId, req.params.id));

    res.json({
      ...row.inv,
      customerNameAr: row.customerNameAr,
      customerCode: row.customerCode,
      customerVatNumber: row.customerVatNumber,
      lines: lines.map(l => ({ ...l.line, chargeTypeName: l.chargeTypeName })),
      allocations: allocs.map(a => ({ ...a.alloc, sourceNumber: a.sourceNumber, sourceType: a.sourceType })),
    });
  } catch (err) { next(err); }
});

// POST /api/invoices — create draft
router.post("/", requirePermission("invoices", "create"), async (req, res, next) => {
  try {
    const body = headerSchema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة", details: body.error.issues }); return; }

    const customer = await db.query.customers.findFirst({ where: eq(customers.id, body.data.customerId) });
    if (!customer || customer.status !== "ACTIVE") { res.status(400).json({ error: "العميل غير موجود أو غير نشط" }); return; }

    const { subtotalPassThrough, subtotalRevenue, vatAmount, totalAmount } = computeTotals(
      body.data.lines, body.data.vatRate, body.data.vatEnabled,
    );

    const result = await db.transaction(async (tx) => {
      const number = await nextDocNumber(tx, "invoices");

      const [inv] = await tx.insert(invoices).values({
        number,
        customerId: body.data.customerId as any,
        date: body.data.date,
        dueDate: body.data.dueDate,
        branchId: body.data.branchId as any,
        status: "DRAFT",
        notes: body.data.notes,
        vatEnabled: body.data.vatEnabled,
        vatRate: String(body.data.vatRate),
        subtotalPassThrough: String(subtotalPassThrough),
        subtotalRevenue: String(subtotalRevenue),
        vatAmount: String(vatAmount),
        totalAmount: String(totalAmount),
        paidAmount: "0",
        outstandingAmount: String(totalAmount),
        createdBy: req.user!.sub as any,
      }).returning();

      // Insert lines
      for (let i = 0; i < body.data.lines.length; i++) {
        const line = body.data.lines[i];
        const lineVat = body.data.vatEnabled && line.vatApplicable && line.accountingType === "REVENUE"
          ? Number(line.amount) * (body.data.vatRate / 100) : 0;

        const [insertedLine] = await tx.insert(invoiceLines).values({
          invoiceId: inv.id as any,
          lineNo: String(i + 1),
          chargeTypeId: line.chargeTypeId as any,
          description: line.description,
          quantity: String(line.quantity),
          unitPrice: String(line.unitPrice),
          amount: String(line.amount),
          accountingType: line.accountingType,
          vatApplicable: line.vatApplicable,
          vatRate: String(body.data.vatRate),
          vatAmount: String(Math.round(lineVat * 100) / 100),
          lineTotal: String(Math.round((Number(line.amount) + lineVat) * 100) / 100),
          costSourceId: line.costSourceId as any,
          revenueAccountId: line.revenueAccountId as any,
          displayOrder: String(i + 1),
        }).returning();

        // Draft allocation for PASS_THROUGH lines
        if (line.accountingType === "PASS_THROUGH" && line.costSourceId && line.allocatedAmount) {
          await tx.insert(costSourceAllocations).values({
            costSourceId: line.costSourceId as any,
            invoiceId: inv.id as any,
            invoiceLineId: insertedLine.id as any,
            customerId: body.data.customerId as any,
            allocatedAmount: String(line.allocatedAmount),
            allocationDate: body.data.date,
            status: "DRAFT",
            createdBy: req.user!.sub as any,
          });
        }
      }

      return inv;
    });

    await writeAuditLog({ req, entityType: "invoices", entityId: result.id, action: "CREATE", after: result });
    res.status(201).json(result);
  } catch (err) { next(err); }
});

// PUT /api/invoices/:id — update draft
router.put("/:id", requirePermission("invoices", "edit"), async (req, res, next) => {
  try {
    const existing = await db.query.invoices.findFirst({ where: eq(invoices.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "الفاتورة غير موجودة" }); return; }
    if (existing.status !== "DRAFT") { res.status(400).json({ error: "لا يمكن تعديل فاتورة مرحّلة" }); return; }

    const body = headerSchema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة" }); return; }

    const { subtotalPassThrough, subtotalRevenue, vatAmount, totalAmount } = computeTotals(
      body.data.lines, body.data.vatRate, body.data.vatEnabled,
    );

    const result = await db.transaction(async (tx) => {
      // Delete existing lines and draft allocations
      await tx.delete(costSourceAllocations).where(
        and(eq(costSourceAllocations.invoiceId, req.params.id as any), eq(costSourceAllocations.status, "DRAFT")),
      );
      await tx.delete(invoiceLines).where(eq(invoiceLines.invoiceId, req.params.id as any));

      const [updated] = await tx.update(invoices).set({
        customerId: body.data.customerId as any,
        date: body.data.date,
        dueDate: body.data.dueDate,
        branchId: body.data.branchId as any,
        notes: body.data.notes,
        vatEnabled: body.data.vatEnabled,
        vatRate: String(body.data.vatRate),
        subtotalPassThrough: String(subtotalPassThrough),
        subtotalRevenue: String(subtotalRevenue),
        vatAmount: String(vatAmount),
        totalAmount: String(totalAmount),
        outstandingAmount: String(totalAmount),
        updatedAt: new Date() as any,
        updatedBy: req.user!.sub as any,
      }).where(eq(invoices.id, req.params.id)).returning();

      for (let i = 0; i < body.data.lines.length; i++) {
        const line = body.data.lines[i];
        const lineVat = body.data.vatEnabled && line.vatApplicable && line.accountingType === "REVENUE"
          ? Number(line.amount) * (body.data.vatRate / 100) : 0;

        const [insertedLine] = await tx.insert(invoiceLines).values({
          invoiceId: updated.id as any,
          lineNo: String(i + 1),
          chargeTypeId: line.chargeTypeId as any,
          description: line.description,
          quantity: String(line.quantity),
          unitPrice: String(line.unitPrice),
          amount: String(line.amount),
          accountingType: line.accountingType,
          vatApplicable: line.vatApplicable,
          vatRate: String(body.data.vatRate),
          vatAmount: String(Math.round(lineVat * 100) / 100),
          lineTotal: String(Math.round((Number(line.amount) + lineVat) * 100) / 100),
          costSourceId: line.costSourceId as any,
          revenueAccountId: line.revenueAccountId as any,
          displayOrder: String(i + 1),
        }).returning();

        if (line.accountingType === "PASS_THROUGH" && line.costSourceId && line.allocatedAmount) {
          await tx.insert(costSourceAllocations).values({
            costSourceId: line.costSourceId as any,
            invoiceId: updated.id as any,
            invoiceLineId: insertedLine.id as any,
            customerId: body.data.customerId as any,
            allocatedAmount: String(line.allocatedAmount),
            allocationDate: body.data.date,
            status: "DRAFT",
            createdBy: req.user!.sub as any,
          });
        }
      }

      return updated;
    });

    await writeAuditLog({ req, entityType: "invoices", entityId: req.params.id, action: "UPDATE", before: existing, after: result });
    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/invoices/:id/post — finalize and create journal entry
router.post("/:id/post", requirePermission("invoices", "post"), async (req, res, next) => {
  try {
    const existing = await db.query.invoices.findFirst({ where: eq(invoices.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "الفاتورة غير موجودة" }); return; }
    if (existing.status !== "DRAFT") { res.status(400).json({ error: "الفاتورة مرحّلة مسبقاً أو ملغاة" }); return; }
    if (Number(existing.totalAmount) <= 0) { res.status(400).json({ error: "إجمالي الفاتورة يجب أن يكون أكبر من صفر" }); return; }

    const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, req.params.id as any));
    if (!lines.length) { res.status(400).json({ error: "الفاتورة لا تحتوي على أسطر" }); return; }

    const draftAllocs = await db.select().from(costSourceAllocations).where(
      and(eq(costSourceAllocations.invoiceId, req.params.id as any), eq(costSourceAllocations.status, "DRAFT")),
    );

    const userId = req.user!.sub as string;

    const result = await db.transaction(async (tx) => {
      // Validate cost source allocations — check remaining balances
      for (const alloc of draftAllocs) {
        const cs = await tx.query.costSources.findFirst({ where: eq(costSources.id, alloc.costSourceId) });
        if (!cs) throw new Error(`مصدر التكلفة ${alloc.costSourceId} غير موجود`);
        if (Number(cs.remainingAmount) < Number(alloc.allocatedAmount)) {
          throw new Error(`الرصيد المتبقي لمصدر التكلفة ${cs.sourceNumber} غير كافٍ. المتبقي: ${cs.remainingAmount}، المطلوب: ${alloc.allocatedAmount}`);
        }
      }

      // Create journal entry
      const je = await postInvoice({
        tx,
        invoiceId: existing.id,
        invoiceNumber: existing.number,
        date: existing.date,
        customerId: existing.customerId,
        subtotalPassThrough: Number(existing.subtotalPassThrough),
        subtotalRevenue: Number(existing.subtotalRevenue),
        vatAmount: Number(existing.vatAmount),
        totalAmount: Number(existing.totalAmount),
        branchId: existing.branchId,
        lines: lines.map(l => ({
          id: l.id,
          description: l.description,
          amount: Number(l.amount),
          accountingType: l.accountingType,
          vatAmount: Number(l.vatAmount),
          revenueAccountId: l.revenueAccountId,
          costSourceId: l.costSourceId,
        })),
        userId,
      });

      // Confirm allocations and update cost source balances
      for (const alloc of draftAllocs) {
        await tx.update(costSourceAllocations)
          .set({ status: "CONFIRMED", postedBy: userId as any, postedAt: new Date() })
          .where(eq(costSourceAllocations.id, alloc.id));

        const cs = await tx.query.costSources.findFirst({ where: eq(costSources.id, alloc.costSourceId) });
        if (cs) {
          const newAllocated = Number(cs.allocatedAmount) + Number(alloc.allocatedAmount);
          const newRemaining = Number(cs.totalAmount) - newAllocated;
          const newStatus = newRemaining <= 0 ? "FULLY_ALLOCATED"
            : newAllocated > 0 ? "PARTIALLY_ALLOCATED" : "UNALLOCATED";
          await tx.update(costSources).set({
            allocatedAmount: String(newAllocated.toFixed(2)),
            remainingAmount: String(Math.max(0, newRemaining).toFixed(2)),
            status: newStatus,
            updatedAt: new Date() as any,
          }).where(eq(costSources.id, cs.id));
        }
      }

      // Update invoice to POSTED
      const [updated] = await tx.update(invoices).set({
        status: "POSTED",
        journalEntryId: je.id as any,
        postedAt: new Date(),
        postedBy: userId as any,
        updatedAt: new Date() as any,
      }).where(eq(invoices.id, existing.id)).returning();

      return { invoice: updated, journalEntry: je };
    });

    await writeAuditLog({ req, entityType: "invoices", entityId: existing.id, action: "POST", before: existing, after: result.invoice });
    res.json(result);
  } catch (err: any) {
    if (err.message?.includes("مصدر التكلفة") || err.message?.includes("الرصيد")) {
      res.status(400).json({ error: err.message });
    } else {
      next(err);
    }
  }
});

// PATCH /api/invoices/:id/cancel
router.patch("/:id/cancel", requirePermission("invoices", "edit"), async (req, res, next) => {
  try {
    const existing = await db.query.invoices.findFirst({ where: eq(invoices.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "الفاتورة غير موجودة" }); return; }
    if (existing.status !== "DRAFT") { res.status(400).json({ error: "لا يمكن إلغاء فاتورة مرحّلة" }); return; }

    await db.transaction(async (tx) => {
      await tx.update(costSourceAllocations).set({ status: "CANCELLED" })
        .where(and(eq(costSourceAllocations.invoiceId, req.params.id as any), eq(costSourceAllocations.status, "DRAFT")));
      await tx.update(invoices).set({ status: "CANCELLED", updatedAt: new Date() as any })
        .where(eq(invoices.id, req.params.id));
    });

    await writeAuditLog({ req, entityType: "invoices", entityId: req.params.id, action: "STATUS_CHANGE", before: existing, after: { status: "CANCELLED" } });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
