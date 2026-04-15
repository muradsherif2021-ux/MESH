import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
  numeric,
  pgEnum,
  index,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users, branches } from "./platform";
import { accounts, fiscalPeriods } from "./accounting";
import { shippingAgents, treasuries, bankAccounts } from "./masterdata";

// ─── Enums ─────────────────────────────────────────────────────────────────────

export const docStatusEnum = pgEnum("doc_status", [
  "DRAFT", "CONFIRMED", "CANCELLED",
]);

export const costSourceTypeEnum = pgEnum("cost_source_type", [
  "AGENT_TRIP",
  "AGENT_EXTRA_FEE",
  "CUSTOMS_PAYMENT",
  "FIELD_ADVANCE",
  "OTHER_ON_BEHALF_COST",
]);

export const costSourceStatusEnum = pgEnum("cost_source_status", [
  "UNALLOCATED",
  "PARTIALLY_ALLOCATED",
  "FULLY_ALLOCATED",
  "CANCELLED",
]);

export const jeStatusEnum = pgEnum("je_status", ["DRAFT", "POSTED"]);

export const jeTypeEnum = pgEnum("je_type", [
  "AGENT_TRIP_CHARGE",
  "AGENT_EXTRA_FEE",
  "CUSTOMS_PAYMENT",
  "ON_BEHALF_COST",
  "PAYABLE_SETTLEMENT",
  "MANUAL",
]);

export const debitCreditEnum = pgEnum("debit_credit", ["DEBIT", "CREDIT"]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "CREDIT", "CASH", "BANK_TRANSFER", "CHEQUE",
]);

export const advanceCategoryEnum = pgEnum("advance_category", [
  "DRIVER_ADVANCE",
  "FIELD_ADVANCE",
  "DOCUMENT_RELEASE",
  "MISC_RECOVERABLE",
]);

// ─── Journal Entries ──────────────────────────────────────────────────────────

export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: text("number").notNull().unique(),
  date: text("date").notNull(),
  type: jeTypeEnum("type").notNull().default("MANUAL"),
  status: jeStatusEnum("status").notNull().default("POSTED"),
  description: text("description"),
  refEntityType: text("ref_entity_type"),
  refEntityId: uuid("ref_entity_id"),
  branchId: uuid("branch_id").references(() => branches.id),
  fiscalPeriodId: uuid("fiscal_period_id").references(() => fiscalPeriods.id),
  totalDebit: numeric("total_debit", { precision: 18, scale: 2 }).notNull().default("0"),
  totalCredit: numeric("total_credit", { precision: 18, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  postedBy: uuid("posted_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
}, (t) => [
  index("idx_je_number").on(t.number),
  index("idx_je_date").on(t.date),
  index("idx_je_ref").on(t.refEntityType, t.refEntityId),
  index("idx_je_branch").on(t.branchId),
  index("idx_je_type").on(t.type),
]);

export const journalEntryLines = pgTable("journal_entry_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  journalEntryId: uuid("journal_entry_id").notNull().references(() => journalEntries.id, { onDelete: "cascade" }),
  lineNumber: text("line_number").notNull(),
  accountId: uuid("account_id").notNull().references(() => accounts.id),
  side: debitCreditEnum("side").notNull(),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_jel_journal").on(t.journalEntryId),
  index("idx_jel_account").on(t.accountId),
  check("chk_jel_amount_positive", sql`${t.amount} > 0`),
]);

// ─── Cost Sources ─────────────────────────────────────────────────────────────

export const costSources = pgTable("cost_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceType: costSourceTypeEnum("source_type").notNull(),
  sourceId: uuid("source_id").notNull(),
  sourceNumber: text("source_number").notNull(),
  date: text("date").notNull(),
  branchId: uuid("branch_id").references(() => branches.id),
  description: text("description"),
  agentId: uuid("agent_id").references(() => shippingAgents.id),
  operationRef: text("operation_ref"),
  totalAmount: numeric("total_amount", { precision: 18, scale: 2 }).notNull(),
  allocatedAmount: numeric("allocated_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  remainingAmount: numeric("remaining_amount", { precision: 18, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("SAR"),
  status: costSourceStatusEnum("status").notNull().default("UNALLOCATED"),
  journalEntryId: uuid("journal_entry_id").references(() => journalEntries.id),
  notes: text("notes"),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  postedBy: uuid("posted_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("uq_cost_source_ref").on(t.sourceType, t.sourceId),
  index("idx_cost_sources_type").on(t.sourceType),
  index("idx_cost_sources_status").on(t.status),
  index("idx_cost_sources_agent").on(t.agentId),
  index("idx_cost_sources_date").on(t.date),
  index("idx_cost_sources_branch").on(t.branchId),
  check("chk_cost_source_amounts", sql`${t.allocatedAmount} <= ${t.totalAmount} AND ${t.remainingAmount} >= 0`),
]);

// ─── Agent Trip Charges ───────────────────────────────────────────────────────

export const agentTripCharges = pgTable("agent_trip_charges", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: text("number").notNull().unique(),
  agentId: uuid("agent_id").notNull().references(() => shippingAgents.id),
  date: text("date").notNull(),
  description: text("description").notNull(),
  operationRef: text("operation_ref"),
  totalAmount: numeric("total_amount", { precision: 18, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("CREDIT"),
  dueDate: text("due_date"),
  branchId: uuid("branch_id").references(() => branches.id),
  notes: text("notes"),
  status: docStatusEnum("status").notNull().default("DRAFT"),
  journalEntryId: uuid("journal_entry_id").references(() => journalEntries.id),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  postedBy: uuid("posted_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
}, (t) => [
  index("idx_agent_trip_charges_number").on(t.number),
  index("idx_agent_trip_charges_agent").on(t.agentId),
  index("idx_agent_trip_charges_date").on(t.date),
  index("idx_agent_trip_charges_status").on(t.status),
  index("idx_agent_trip_charges_branch").on(t.branchId),
  check("chk_atc_amount", sql`${t.totalAmount} > 0`),
]);

// ─── Agent Additional Fees ────────────────────────────────────────────────────

export const agentAdditionalFees = pgTable("agent_additional_fees", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: text("number").notNull().unique(),
  agentId: uuid("agent_id").notNull().references(() => shippingAgents.id),
  date: text("date").notNull(),
  feeCategory: text("fee_category"),
  description: text("description").notNull(),
  totalAmount: numeric("total_amount", { precision: 18, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("CREDIT"),
  dueDate: text("due_date"),
  operationRef: text("operation_ref"),
  branchId: uuid("branch_id").references(() => branches.id),
  notes: text("notes"),
  status: docStatusEnum("status").notNull().default("DRAFT"),
  journalEntryId: uuid("journal_entry_id").references(() => journalEntries.id),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  postedBy: uuid("posted_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
}, (t) => [
  index("idx_agent_extra_fees_number").on(t.number),
  index("idx_agent_extra_fees_agent").on(t.agentId),
  index("idx_agent_extra_fees_date").on(t.date),
  index("idx_agent_extra_fees_status").on(t.status),
  check("chk_aef_amount", sql`${t.totalAmount} > 0`),
]);

// ─── Customs Payments ─────────────────────────────────────────────────────────

export const customsPayments = pgTable("customs_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: text("number").notNull().unique(),
  date: text("date").notNull(),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("BANK_TRANSFER"),
  treasuryId: uuid("treasury_id").references(() => treasuries.id),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id),
  externalRef: text("external_ref"),
  operationRef: text("operation_ref"),
  description: text("description"),
  branchId: uuid("branch_id").references(() => branches.id),
  notes: text("notes"),
  status: docStatusEnum("status").notNull().default("DRAFT"),
  journalEntryId: uuid("journal_entry_id").references(() => journalEntries.id),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  postedBy: uuid("posted_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
}, (t) => [
  index("idx_customs_payments_number").on(t.number),
  index("idx_customs_payments_date").on(t.date),
  index("idx_customs_payments_status").on(t.status),
  index("idx_customs_payments_branch").on(t.branchId),
  check("chk_cp_amount", sql`${t.amount} > 0`),
]);

// ─── On-Behalf Costs (Field Advances / Driver Advances / Misc) ────────────────

export const onBehalfCosts = pgTable("on_behalf_costs", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: text("number").notNull().unique(),
  category: advanceCategoryEnum("category").notNull().default("MISC_RECOVERABLE"),
  date: text("date").notNull(),
  payeeName: text("payee_name"),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("CASH"),
  treasuryId: uuid("treasury_id").references(() => treasuries.id),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id),
  operationRef: text("operation_ref"),
  description: text("description").notNull(),
  branchId: uuid("branch_id").references(() => branches.id),
  notes: text("notes"),
  status: docStatusEnum("status").notNull().default("DRAFT"),
  journalEntryId: uuid("journal_entry_id").references(() => journalEntries.id),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  postedBy: uuid("posted_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
}, (t) => [
  index("idx_on_behalf_costs_number").on(t.number),
  index("idx_on_behalf_costs_date").on(t.date),
  index("idx_on_behalf_costs_status").on(t.status),
  index("idx_on_behalf_costs_category").on(t.category),
  check("chk_obc_amount", sql`${t.amount} > 0`),
]);
