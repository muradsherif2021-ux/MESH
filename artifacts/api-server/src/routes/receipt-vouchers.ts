import { Router } from "express";
import { db } from "@workspace/db";
import {
  receiptVouchers, receiptApplications, invoices,
  customers, treasuries, bankAccounts,
} from "@workspace/db/schema";
import { eq, count, and, ilike, or, sql } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { writeAuditLog } from "../lib/audit";
import { parsePagination, paginate } from "../lib/pagination";
import { postReceiptVoucher, nextDocNumber } from "../lib/posting";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  customerId: z.string().uuid(),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE"]).default("CASH"),
  treasuryId: z.string().uuid().optional(),
  bankAccountId: z.string().uuid().optional(),
  amount: z.coerce.number().positive(),
  branchId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

// GET /api/receipt-vouchers
router.get("/", requirePermission("receipt_vouchers", "view"), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const search = String(req.query.search ?? "");
    const status = req.query.status as string | undefined;
    const customerId = req.query.customerId as string | undefined;

    const conditions = [];
    if (search) conditions.push(or(ilike(receiptVouchers.number, `%${search}%`)));
    if (status) conditions.push(eq(receiptVouchers.status, status as any));
    if (customerId) conditions.push(eq(receiptVouchers.customerId, customerId as any));
    const where = conditions.length ? and(...conditions) : undefined;

    const [items, [{ total }]] = await Promise.all([
      db.select({
        rv: receiptVouchers,
        customerNameAr: customers.nameAr,
        customerCode: customers.code,
        treasuryNameAr: treasuries.nameAr,
        bankNameAr: bankAccounts.nameAr,
      })
        .from(receiptVouchers)
        .leftJoin(customers, eq(receiptVouchers.customerId, customers.id))
        .leftJoin(treasuries, eq(receiptVouchers.treasuryId, treasuries.id))
        .leftJoin(bankAccounts, eq(receiptVouchers.bankAccountId, bankAccounts.id))
        .where(where)
        .limit(limit).offset(offset)
        .orderBy(receiptVouchers.createdAt),
      db.select({ total: count() }).from(receiptVouchers).where(where),
    ]);

    const data = items.map(r => ({
      ...r.rv,
      customerNameAr: r.customerNameAr,
      customerCode: r.customerCode,
      treasuryNameAr: r.treasuryNameAr,
      bankNameAr: r.bankNameAr,
    }));
    res.json(paginate(data, Number(total), { page, limit, offset }));
  } catch (err) { next(err); }
});

// GET /api/receipt-vouchers/:id — with applications
router.get("/:id", requirePermission("receipt_vouchers", "view"), async (req, res, next) => {
  try {
    const rows = await db.select({
      rv: receiptVouchers,
      customerNameAr: customers.nameAr,
      customerCode: customers.code,
    })
      .from(receiptVouchers)
      .leftJoin(customers, eq(receiptVouchers.customerId, customers.id))
      .where(eq(receiptVouchers.id, req.params.id))
      .limit(1);

    if (!rows.length) { res.status(404).json({ error: "سند القبض غير موجود" }); return; }
    const row = rows[0];

    const applications = await db.select({
      app: receiptApplications,
      invoiceNumber: invoices.number,
      invoiceDate: invoices.date,
      invoiceTotalAmount: invoices.totalAmount,
      invoiceOutstandingAmount: invoices.outstandingAmount,
    })
      .from(receiptApplications)
      .leftJoin(invoices, eq(receiptApplications.invoiceId, invoices.id))
      .where(eq(receiptApplications.receiptVoucherId, req.params.id as any));

    res.json({
      ...row.rv,
      customerNameAr: row.customerNameAr,
      customerCode: row.customerCode,
      applications: applications.map(a => ({
        ...a.app,
        invoiceNumber: a.invoiceNumber,
        invoiceDate: a.invoiceDate,
        invoiceTotalAmount: a.invoiceTotalAmount,
        invoiceOutstandingAmount: a.invoiceOutstandingAmount,
      })),
    });
  } catch (err) { next(err); }
});

// GET /api/receipt-vouchers/customer/:customerId/open-invoices
router.get("/customer/:customerId/open-invoices", requirePermission("invoices", "view"), async (req, res, next) => {
  try {
    const openInvoices = await db.select({
      inv: invoices,
    })
      .from(invoices)
      .where(
        and(
          eq(invoices.customerId, req.params.customerId as any),
          eq(invoices.status, "POSTED"),
          sql`${invoices.outstandingAmount} > 0`,
        ),
      )
      .orderBy(invoices.date);

    res.json({ data: openInvoices.map(r => r.inv) });
  } catch (err) { next(err); }
});

// POST /api/receipt-vouchers — create draft
router.post("/", requirePermission("receipt_vouchers", "create"), async (req, res, next) => {
  try {
    const body = schema.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: "بيانات غير صحيحة", details: body.error.issues }); return; }

    const customer = await db.query.customers.findFirst({ where: eq(customers.id, body.data.customerId) });
    if (!customer || customer.status !== "ACTIVE") { res.status(400).json({ error: "العميل غير موجود أو غير نشط" }); return; }

    const number = await db.transaction(async (tx) => nextDocNumber(tx, "receipts"));

    const [created] = await db.insert(receiptVouchers).values({
      number,
      date: body.data.date,
      customerId: body.data.customerId as any,
      paymentMethod: body.data.paymentMethod,
      treasuryId: body.data.treasuryId as any,
      bankAccountId: body.data.bankAccountId as any,
      amount: String(body.data.amount),
      appliedAmount: "0",
      unappliedAmount: String(body.data.amount),
      branchId: body.data.branchId as any,
      notes: body.data.notes,
      status: "DRAFT",
      createdBy: req.user!.sub as any,
    }).returning();

    await writeAuditLog({ req, entityType: "receipt_vouchers", entityId: created.id, action: "CREATE", after: created });
    res.status(201).json(created);
  } catch (err) { next(err); }
});

// POST /api/receipt-vouchers/:id/post — post receipt + apply to invoices
router.post("/:id/post", requirePermission("receipt_vouchers", "post"), async (req, res, next) => {
  try {
    const existing = await db.query.receiptVouchers.findFirst({ where: eq(receiptVouchers.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "سند القبض غير موجود" }); return; }
    if (existing.status !== "DRAFT") { res.status(400).json({ error: "سند القبض مرحّل مسبقاً أو ملغى" }); return; }

    // Optional: apply to invoices list from body
    const applications: Array<{ invoiceId: string; appliedAmount: number }> = req.body.applications ?? [];
    const totalApplied = applications.reduce((s, a) => s + Number(a.appliedAmount), 0);
    if (totalApplied > Number(existing.amount) + 0.01) {
      res.status(400).json({ error: "المبلغ المطبّق يتجاوز قيمة السند" }); return;
    }

    const userId = req.user!.sub as string;

    const result = await db.transaction(async (tx) => {
      // Validate invoices
      for (const app of applications) {
        const inv = await tx.query.invoices.findFirst({ where: eq(invoices.id, app.invoiceId as any) });
        if (!inv) throw new Error(`الفاتورة ${app.invoiceId} غير موجودة`);
        if (inv.status !== "POSTED") throw new Error(`لا يمكن التسوية على فاتورة غير مرحّلة`);
        if (Number(inv.outstandingAmount) < Number(app.appliedAmount) - 0.01) {
          throw new Error(`المبلغ المطبّق (${app.appliedAmount}) يتجاوز الرصيد المستحق للفاتورة ${inv.number}`);
        }
      }

      // Create journal entry: DR 1101/1102 / CR 1103
      const je = await postReceiptVoucher({
        tx,
        receiptId: existing.id,
        receiptNumber: existing.number,
        date: existing.date,
        customerId: existing.customerId,
        amount: Number(existing.amount),
        paymentMethod: existing.paymentMethod,
        branchId: existing.branchId,
        userId,
      });

      // Create receipt applications and update invoice outstanding
      let applied = 0;
      for (const app of applications) {
        await tx.insert(receiptApplications).values({
          receiptVoucherId: existing.id as any,
          invoiceId: app.invoiceId as any,
          appliedAmount: String(app.appliedAmount),
          applicationDate: existing.date,
          status: "ACTIVE",
          createdBy: userId as any,
        });

        const inv = await tx.query.invoices.findFirst({ where: eq(invoices.id, app.invoiceId as any) });
        if (inv) {
          const newPaid = Number(inv.paidAmount) + Number(app.appliedAmount);
          const newOutstanding = Math.max(0, Number(inv.totalAmount) - newPaid);
          await tx.update(invoices).set({
            paidAmount: String(newPaid.toFixed(2)),
            outstandingAmount: String(newOutstanding.toFixed(2)),
            updatedAt: new Date() as any,
          }).where(eq(invoices.id, app.invoiceId as any));
        }
        applied += Number(app.appliedAmount);
      }

      const [updated] = await tx.update(receiptVouchers).set({
        status: "POSTED",
        journalEntryId: je.id as any,
        appliedAmount: String(applied.toFixed(2)),
        unappliedAmount: String((Number(existing.amount) - applied).toFixed(2)),
        postedAt: new Date(),
        postedBy: userId as any,
        updatedAt: new Date() as any,
      }).where(eq(receiptVouchers.id, existing.id)).returning();

      return { receipt: updated, journalEntry: je };
    });

    await writeAuditLog({ req, entityType: "receipt_vouchers", entityId: existing.id, action: "POST", before: existing, after: result.receipt });
    res.json(result);
  } catch (err: any) {
    if (err.message?.includes("الفاتورة") || err.message?.includes("المبلغ") || err.message?.includes("لا يمكن")) {
      res.status(400).json({ error: err.message });
    } else {
      next(err);
    }
  }
});

// PATCH /api/receipt-vouchers/:id/cancel
router.patch("/:id/cancel", requirePermission("receipt_vouchers", "edit"), async (req, res, next) => {
  try {
    const existing = await db.query.receiptVouchers.findFirst({ where: eq(receiptVouchers.id, req.params.id) });
    if (!existing) { res.status(404).json({ error: "السند غير موجود" }); return; }
    if (existing.status !== "DRAFT") { res.status(400).json({ error: "لا يمكن إلغاء سند مرحّل" }); return; }
    const [updated] = await db.update(receiptVouchers).set({ status: "CANCELLED", updatedAt: new Date() as any })
      .where(eq(receiptVouchers.id, req.params.id)).returning();
    await writeAuditLog({ req, entityType: "receipt_vouchers", entityId: req.params.id, action: "STATUS_CHANGE", before: existing, after: updated });
    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
