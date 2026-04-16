import { Router } from "express";
import { db } from "@workspace/db";
import { invoices, receiptVouchers, customers } from "@workspace/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth, requirePermission } from "../middlewares/auth";
import { parsePagination, paginate } from "../lib/pagination";
import { count } from "drizzle-orm";

const router = Router();
router.use(requireAuth);

// GET /api/customer-balances — AR aging / open balances
router.get("/", requirePermission("invoices", "view"), async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);

    // Aggregate AR per customer from posted invoices
    const balances = await db.select({
      customerId: invoices.customerId,
      customerNameAr: customers.nameAr,
      customerCode: customers.code,
      customerVatNumber: customers.vatNumber,
      totalInvoiced: sql<string>`COALESCE(SUM(${invoices.totalAmount}), 0)`,
      totalPaid: sql<string>`COALESCE(SUM(${invoices.paidAmount}), 0)`,
      totalOutstanding: sql<string>`COALESCE(SUM(${invoices.outstandingAmount}), 0)`,
      invoiceCount: sql<number>`COUNT(${invoices.id})`,
    })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(eq(invoices.status, "POSTED"))
      .groupBy(invoices.customerId, customers.nameAr, customers.code, customers.vatNumber)
      .orderBy(sql`SUM(${invoices.outstandingAmount}) DESC`);

    res.json({ data: balances });
  } catch (err) { next(err); }
});

// GET /api/customer-balances/:customerId — customer open items
router.get("/:customerId", requirePermission("invoices", "view"), async (req, res, next) => {
  try {
    const customer = await db.query.customers.findFirst({ where: eq(customers.id, req.params.customerId) });
    if (!customer) { res.status(404).json({ error: "العميل غير موجود" }); return; }

    const openInvoices = await db.select().from(invoices)
      .where(and(eq(invoices.customerId, req.params.customerId as any), eq(invoices.status, "POSTED")))
      .orderBy(invoices.date);

    const receipts = await db.select().from(receiptVouchers)
      .where(and(eq(receiptVouchers.customerId, req.params.customerId as any), eq(receiptVouchers.status, "POSTED")))
      .orderBy(receiptVouchers.date);

    const totalInvoiced = openInvoices.reduce((s, i) => s + Number(i.totalAmount), 0);
    const totalPaid = openInvoices.reduce((s, i) => s + Number(i.paidAmount), 0);
    const totalOutstanding = openInvoices.reduce((s, i) => s + Number(i.outstandingAmount), 0);

    res.json({
      customer: {
        id: customer.id,
        code: customer.code,
        nameAr: customer.nameAr,
        vatNumber: customer.vatNumber,
      },
      summary: {
        totalInvoiced: totalInvoiced.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        totalOutstanding: totalOutstanding.toFixed(2),
      },
      openInvoices,
      receipts,
    });
  } catch (err) { next(err); }
});

export default router;
