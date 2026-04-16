/**
 * Phase 3 Posting Service
 * Handles journal entry creation for cost source documents.
 * All posting happens within DB transactions.
 */
import { db } from "@workspace/db";
import {
  accounts, journalEntries, journalEntryLines, costSources,
  sequences,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { Request } from "express";

// ─── Account Code Constants ────────────────────────────────────────────────────

const ACCOUNT_CODES = {
  ON_BEHALF_RECOVERABLE: "1104",
  AGENT_PAYABLES: "2102",
  CASH: "1101",
  BANK: "1102",
};

// ─── Next JE Number ────────────────────────────────────────────────────────────

export async function nextJeNumber(tx: typeof db): Promise<string> {
  const seq = await tx.query.sequences.findFirst({ where: eq(sequences.module, "journal_entries") });
  if (!seq) throw new Error("تسلسل القيود اليومية غير موجود");
  const year = new Date().getFullYear();
  let next = seq.nextNumber;
  if (seq.resetYearly && seq.currentYear !== year) {
    next = 1;
    await tx.update(sequences).set({ nextNumber: 2, currentYear: year }).where(eq(sequences.module, "journal_entries"));
  } else {
    await tx.update(sequences).set({ nextNumber: next + 1 }).where(eq(sequences.module, "journal_entries"));
  }
  const padded = String(next).padStart(seq.paddingLength ?? 5, "0");
  const yearPart = seq.includeYear ? `-${year}` : "";
  return `${seq.prefix}${padded}${yearPart}`;
}

// ─── Next Document Number ──────────────────────────────────────────────────────

export async function nextDocNumber(tx: typeof db, module: string): Promise<string> {
  const seq = await tx.query.sequences.findFirst({ where: eq(sequences.module, module) });
  if (!seq) throw new Error(`تسلسل الوحدة ${module} غير موجود`);
  const year = new Date().getFullYear();
  let next = seq.nextNumber;
  if (seq.resetYearly && seq.currentYear !== year) {
    next = 1;
    await tx.update(sequences).set({ nextNumber: 2, currentYear: year }).where(eq(sequences.module, module));
  } else {
    await tx.update(sequences).set({ nextNumber: next + 1 }).where(eq(sequences.module, module));
  }
  const padded = String(next).padStart(seq.paddingLength ?? 5, "0");
  const yearPart = seq.includeYear ? `-${year}` : "";
  return `${seq.prefix}${padded}${yearPart}`;
}

// ─── Resolve Account ───────────────────────────────────────────────────────────

async function resolveAccount(tx: typeof db, code: string): Promise<string> {
  const acc = await tx.query.accounts.findFirst({ where: eq(accounts.code, code) });
  if (!acc) throw new Error(`الحساب برقم ${code} غير موجود في دليل الحسابات`);
  if (!acc.allowPosting) throw new Error(`الحساب ${acc.nameAr} لا يقبل الترحيل المباشر`);
  return acc.id;
}

// ─── Post Agent Trip Charge (Credit basis) ────────────────────────────────────
// DR 1104 On-Behalf Recoverable | CR 2102 Agent Payables

export async function postAgentTripCharge(params: {
  tx: typeof db;
  docId: string;
  docNumber: string;
  date: string;
  amount: string;
  agentId: string;
  branchId?: string | null;
  description: string;
  userId: string;
}) {
  const { tx, docId, docNumber, date, amount, branchId, description, userId } = params;
  const drAccountId = await resolveAccount(tx, ACCOUNT_CODES.ON_BEHALF_RECOVERABLE);
  const crAccountId = await resolveAccount(tx, ACCOUNT_CODES.AGENT_PAYABLES);
  const jeNumber = await nextJeNumber(tx);

  const [je] = await tx.insert(journalEntries).values({
    number: jeNumber,
    date,
    type: "AGENT_TRIP_CHARGE",
    status: "POSTED",
    description: `رسوم رحلة وكيل شحن — ${docNumber}`,
    refEntityType: "agent_trip_charges",
    refEntityId: docId as any,
    branchId: branchId as any,
    totalDebit: amount,
    totalCredit: amount,
    postedAt: new Date(),
    postedBy: userId as any,
    createdBy: userId as any,
  }).returning();

  await tx.insert(journalEntryLines).values([
    {
      journalEntryId: je.id,
      lineNumber: "1",
      accountId: drAccountId as any,
      side: "DEBIT",
      amount,
      description: `${description} — مدين`,
    },
    {
      journalEntryId: je.id,
      lineNumber: "2",
      accountId: crAccountId as any,
      side: "CREDIT",
      amount,
      description: `${description} — دائن`,
    },
  ]);

  return je;
}

// ─── Post Agent Additional Fee (Credit basis) ─────────────────────────────────
// DR 1104 On-Behalf Recoverable | CR 2102 Agent Payables

export async function postAgentAdditionalFee(params: {
  tx: typeof db;
  docId: string;
  docNumber: string;
  date: string;
  amount: string;
  agentId: string;
  branchId?: string | null;
  description: string;
  userId: string;
}) {
  const { tx, docId, docNumber, date, amount, branchId, description, userId } = params;
  const drAccountId = await resolveAccount(tx, ACCOUNT_CODES.ON_BEHALF_RECOVERABLE);
  const crAccountId = await resolveAccount(tx, ACCOUNT_CODES.AGENT_PAYABLES);
  const jeNumber = await nextJeNumber(tx);

  const [je] = await tx.insert(journalEntries).values({
    number: jeNumber,
    date,
    type: "AGENT_EXTRA_FEE",
    status: "POSTED",
    description: `رسوم إضافية وكيل شحن — ${docNumber}`,
    refEntityType: "agent_additional_fees",
    refEntityId: docId as any,
    branchId: branchId as any,
    totalDebit: amount,
    totalCredit: amount,
    postedAt: new Date(),
    postedBy: userId as any,
    createdBy: userId as any,
  }).returning();

  await tx.insert(journalEntryLines).values([
    {
      journalEntryId: je.id,
      lineNumber: "1",
      accountId: drAccountId as any,
      side: "DEBIT",
      amount,
      description: `${description} — مدين`,
    },
    {
      journalEntryId: je.id,
      lineNumber: "2",
      accountId: crAccountId as any,
      side: "CREDIT",
      amount,
      description: `${description} — دائن`,
    },
  ]);

  return je;
}

// ─── Post Customs Payment (Cash/Bank basis) ───────────────────────────────────
// DR 1104 On-Behalf Recoverable | CR 1101/1102 Cash or Bank

export async function postCustomsPayment(params: {
  tx: typeof db;
  docId: string;
  docNumber: string;
  date: string;
  amount: string;
  paymentMethod: string;
  treasuryAccountCode?: string;
  bankAccountCode?: string;
  branchId?: string | null;
  description: string;
  userId: string;
}) {
  const {
    tx, docId, docNumber, date, amount, paymentMethod,
    branchId, description, userId,
  } = params;

  const drAccountId = await resolveAccount(tx, ACCOUNT_CODES.ON_BEHALF_RECOVERABLE);
  const crCode = paymentMethod === "BANK_TRANSFER" || paymentMethod === "CHEQUE"
    ? ACCOUNT_CODES.BANK
    : ACCOUNT_CODES.CASH;
  const crAccountId = await resolveAccount(tx, crCode);
  const jeNumber = await nextJeNumber(tx);

  const [je] = await tx.insert(journalEntries).values({
    number: jeNumber,
    date,
    type: "CUSTOMS_PAYMENT",
    status: "POSTED",
    description: `سداد رسوم جمركية — ${docNumber}`,
    refEntityType: "customs_payments",
    refEntityId: docId as any,
    branchId: branchId as any,
    totalDebit: amount,
    totalCredit: amount,
    postedAt: new Date(),
    postedBy: userId as any,
    createdBy: userId as any,
  }).returning();

  await tx.insert(journalEntryLines).values([
    {
      journalEntryId: je.id,
      lineNumber: "1",
      accountId: drAccountId as any,
      side: "DEBIT",
      amount,
      description: `${description} — مدين`,
    },
    {
      journalEntryId: je.id,
      lineNumber: "2",
      accountId: crAccountId as any,
      side: "CREDIT",
      amount,
      description: `${description} — دائن`,
    },
  ]);

  return je;
}

// ─── Post On-Behalf Cost (Cash/Bank basis) ────────────────────────────────────
// DR 1104 On-Behalf Recoverable | CR 1101/1102 Cash or Bank

export async function postOnBehalfCost(params: {
  tx: typeof db;
  docId: string;
  docNumber: string;
  date: string;
  amount: string;
  paymentMethod: string;
  branchId?: string | null;
  description: string;
  userId: string;
}) {
  const {
    tx, docId, docNumber, date, amount, paymentMethod,
    branchId, description, userId,
  } = params;

  const drAccountId = await resolveAccount(tx, ACCOUNT_CODES.ON_BEHALF_RECOVERABLE);
  const crCode = paymentMethod === "BANK_TRANSFER" || paymentMethod === "CHEQUE"
    ? ACCOUNT_CODES.BANK
    : ACCOUNT_CODES.CASH;
  const crAccountId = await resolveAccount(tx, crCode);
  const jeNumber = await nextJeNumber(tx);

  const [je] = await tx.insert(journalEntries).values({
    number: jeNumber,
    date,
    type: "ON_BEHALF_COST",
    status: "POSTED",
    description: `تكلفة بالنيابة — ${docNumber}`,
    refEntityType: "on_behalf_costs",
    refEntityId: docId as any,
    branchId: branchId as any,
    totalDebit: amount,
    totalCredit: amount,
    postedAt: new Date(),
    postedBy: userId as any,
    createdBy: userId as any,
  }).returning();

  await tx.insert(journalEntryLines).values([
    {
      journalEntryId: je.id,
      lineNumber: "1",
      accountId: drAccountId as any,
      side: "DEBIT",
      amount,
      description: `${description} — مدين`,
    },
    {
      journalEntryId: je.id,
      lineNumber: "2",
      accountId: crAccountId as any,
      side: "CREDIT",
      amount,
      description: `${description} — دائن`,
    },
  ]);

  return je;
}

// ─── Post Invoice (Final/POSTED) ──────────────────────────────────────────────
// DR 1103 AR | CR 1104 Pass-Through | CR 4101+ Revenue | CR 2104 VAT

export async function postInvoice(params: {
  tx: typeof db;
  invoiceId: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  subtotalPassThrough: number;
  subtotalRevenue: number;
  vatAmount: number;
  totalAmount: number;
  branchId?: string | null;
  lines: Array<{
    id: string;
    description: string;
    amount: number;
    accountingType: string;
    vatAmount: number;
    revenueAccountId?: string | null;
    costSourceId?: string | null;
  }>;
  userId: string;
}) {
  const { tx, invoiceId, invoiceNumber, date, subtotalPassThrough, subtotalRevenue, vatAmount, totalAmount, branchId, lines, userId } = params;

  const arAccountId = await resolveAccount(tx, "1103");
  const recoverableAccountId = await resolveAccount(tx, ACCOUNT_CODES.ON_BEHALF_RECOVERABLE);
  const vatAccountId = await resolveAccount(tx, "2104");
  const jeNumber = await nextJeNumber(tx);

  const jeLines: Array<{ accountId: string; side: "DEBIT" | "CREDIT"; amount: string; description: string; lineNumber: string }> = [];
  let lineCounter = 1;

  // DR 1103 — full receivable
  jeLines.push({
    accountId: arAccountId,
    side: "DEBIT",
    amount: String(totalAmount.toFixed(2)),
    description: `ذمة مدينة — فاتورة ${invoiceNumber}`,
    lineNumber: String(lineCounter++),
  });

  // CR 1104 — pass-through recovery (if any)
  if (subtotalPassThrough > 0) {
    jeLines.push({
      accountId: recoverableAccountId,
      side: "CREDIT",
      amount: String(subtotalPassThrough.toFixed(2)),
      description: `تسوية تكاليف قابلة للاسترداد — ${invoiceNumber}`,
      lineNumber: String(lineCounter++),
    });
  }

  // CR revenue accounts — one line per revenue line (grouped by account)
  const revenueByAccount = new Map<string, number>();
  for (const line of lines) {
    if (line.accountingType === "REVENUE") {
      const accId = line.revenueAccountId ?? (await resolveAccount(tx, "4101"));
      revenueByAccount.set(accId, (revenueByAccount.get(accId) ?? 0) + line.amount);
    }
  }
  for (const [accId, amount] of revenueByAccount) {
    jeLines.push({
      accountId: accId,
      side: "CREDIT",
      amount: String(amount.toFixed(2)),
      description: `إيراد خدمات — فاتورة ${invoiceNumber}`,
      lineNumber: String(lineCounter++),
    });
  }

  // CR 2104 — VAT payable (if any)
  if (vatAmount > 0) {
    jeLines.push({
      accountId: vatAccountId,
      side: "CREDIT",
      amount: String(vatAmount.toFixed(2)),
      description: `ضريبة القيمة المضافة — فاتورة ${invoiceNumber}`,
      lineNumber: String(lineCounter++),
    });
  }

  const [je] = await tx.insert(journalEntries).values({
    number: jeNumber,
    date,
    type: "MANUAL",
    status: "POSTED",
    description: `فاتورة خدمة مرحّلة — ${invoiceNumber}`,
    refEntityType: "invoices",
    refEntityId: invoiceId as any,
    branchId: branchId as any,
    totalDebit: String(totalAmount.toFixed(2)),
    totalCredit: String(totalAmount.toFixed(2)),
    postedAt: new Date(),
    postedBy: userId as any,
    createdBy: userId as any,
  }).returning();

  await tx.insert(journalEntryLines).values(
    jeLines.map(l => ({
      journalEntryId: je.id,
      lineNumber: l.lineNumber,
      accountId: l.accountId as any,
      side: l.side as any,
      amount: l.amount,
      description: l.description,
    }))
  );

  return je;
}

// ─── Post Receipt Voucher ─────────────────────────────────────────────────────
// DR 1101/1102 Cash/Bank | CR 1103 AR

export async function postReceiptVoucher(params: {
  tx: typeof db;
  receiptId: string;
  receiptNumber: string;
  date: string;
  customerId: string;
  amount: number;
  paymentMethod: string;
  branchId?: string | null;
  userId: string;
}) {
  const { tx, receiptId, receiptNumber, date, amount, paymentMethod, branchId, userId } = params;

  const arAccountId = await resolveAccount(tx, "1103");
  const drCode = paymentMethod === "BANK_TRANSFER" || paymentMethod === "CHEQUE"
    ? ACCOUNT_CODES.BANK : ACCOUNT_CODES.CASH;
  const drAccountId = await resolveAccount(tx, drCode);
  const jeNumber = await nextJeNumber(tx);

  const [je] = await tx.insert(journalEntries).values({
    number: jeNumber,
    date,
    type: "MANUAL",
    status: "POSTED",
    description: `سند قبض — ${receiptNumber}`,
    refEntityType: "receipt_vouchers",
    refEntityId: receiptId as any,
    branchId: branchId as any,
    totalDebit: String(amount.toFixed(2)),
    totalCredit: String(amount.toFixed(2)),
    postedAt: new Date(),
    postedBy: userId as any,
    createdBy: userId as any,
  }).returning();

  await tx.insert(journalEntryLines).values([
    {
      journalEntryId: je.id,
      lineNumber: "1",
      accountId: drAccountId as any,
      side: "DEBIT",
      amount: String(amount.toFixed(2)),
      description: `سند قبض ${receiptNumber} — مدين`,
    },
    {
      journalEntryId: je.id,
      lineNumber: "2",
      accountId: arAccountId as any,
      side: "CREDIT",
      amount: String(amount.toFixed(2)),
      description: `سند قبض ${receiptNumber} — دائن`,
    },
  ]);

  return je;
}

// ─── Create Cost Source ────────────────────────────────────────────────────────

export async function createCostSource(params: {
  tx: typeof db;
  sourceType: "AGENT_TRIP" | "AGENT_EXTRA_FEE" | "CUSTOMS_PAYMENT" | "FIELD_ADVANCE" | "OTHER_ON_BEHALF_COST";
  sourceId: string;
  sourceNumber: string;
  date: string;
  branchId?: string | null;
  description: string;
  agentId?: string | null;
  operationRef?: string | null;
  totalAmount: string;
  journalEntryId: string;
  userId: string;
}) {
  const { tx, totalAmount } = params;

  const [cs] = await tx.insert(costSources).values({
    sourceType: params.sourceType,
    sourceId: params.sourceId as any,
    sourceNumber: params.sourceNumber,
    date: params.date,
    branchId: params.branchId as any,
    description: params.description,
    agentId: params.agentId as any,
    operationRef: params.operationRef,
    totalAmount,
    allocatedAmount: "0",
    remainingAmount: totalAmount,
    currency: "SAR",
    status: "UNALLOCATED",
    journalEntryId: params.journalEntryId as any,
    postedAt: new Date(),
    postedBy: params.userId as any,
    createdBy: params.userId as any,
  }).returning();

  return cs;
}
