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
} from "drizzle-orm/pg-core";
import { branches, users } from "./platform";
import { accounts } from "./accounting";

// ─── Enums ─────────────────────────────────────────────────────────────────────

export const customerTypeEnum = pgEnum("customer_type", [
  "COMPANY", "INDIVIDUAL", "GOVERNMENT",
]);
export const paymentTermsEnum = pgEnum("payment_terms", [
  "CASH", "CREDIT_7", "CREDIT_15", "CREDIT_30", "CREDIT_60", "CREDIT_90",
]);
export const chargeAccountTypeEnum = pgEnum("charge_account_type", [
  "PASS_THROUGH", "REVENUE",
]);
export const entityStatusEnum = pgEnum("entity_status", ["ACTIVE", "INACTIVE", "ARCHIVED"]);

// ─── Customers ────────────────────────────────────────────────────────────────

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  type: customerTypeEnum("type").notNull().default("COMPANY"),
  vatNumber: text("vat_number"),
  crNumber: text("cr_number"),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  notes: text("notes"),
  branchId: uuid("branch_id").references(() => branches.id),
  paymentTerms: paymentTermsEnum("payment_terms").notNull().default("CASH"),
  creditLimit: numeric("credit_limit", { precision: 18, scale: 2 }),
  receivableAccountId: uuid("receivable_account_id").references(() => accounts.id),
  status: entityStatusEnum("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
}, (t) => [
  index("idx_customers_code").on(t.code),
  index("idx_customers_status").on(t.status),
  index("idx_customers_name_ar").on(t.nameAr),
]);

// ─── Shipping Agents ──────────────────────────────────────────────────────────

export const shippingAgents = pgTable("shipping_agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  notes: text("notes"),
  branchId: uuid("branch_id").references(() => branches.id),
  paymentTerms: paymentTermsEnum("payment_terms").notNull().default("CASH"),
  payableAccountId: uuid("payable_account_id").references(() => accounts.id),
  status: entityStatusEnum("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
}, (t) => [
  index("idx_agents_code").on(t.code),
  index("idx_agents_status").on(t.status),
]);

// ─── Treasuries / Cashboxes ───────────────────────────────────────────────────

export const treasuries = pgTable("treasuries", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  cashAccountId: uuid("cash_account_id").notNull().references(() => accounts.id),
  branchId: uuid("branch_id").references(() => branches.id),
  responsibleUserId: uuid("responsible_user_id").references(() => users.id),
  notes: text("notes"),
  status: entityStatusEnum("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
}, (t) => [
  index("idx_treasuries_code").on(t.code),
]);

// ─── Bank Accounts ────────────────────────────────────────────────────────────

export const bankAccounts = pgTable("bank_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number"),
  iban: text("iban"),
  currency: text("currency").notNull().default("SAR"),
  linkedAccountId: uuid("linked_account_id").notNull().references(() => accounts.id),
  branchId: uuid("branch_id").references(() => branches.id),
  notes: text("notes"),
  status: entityStatusEnum("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
}, (t) => [
  index("idx_bank_accounts_code").on(t.code),
]);

// ─── Charge Types (Invoice Item Types) ────────────────────────────────────────

export const chargeTypes = pgTable("charge_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  accountingType: chargeAccountTypeEnum("accounting_type").notNull(),
  defaultRevenueAccountId: uuid("default_revenue_account_id").references(() => accounts.id),
  defaultSettlementAccountId: uuid("default_settlement_account_id").references(() => accounts.id),
  vatApplicable: boolean("vat_applicable").notNull().default(false),
  requiresCostSource: boolean("requires_cost_source").notNull().default(false),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
}, (t) => [
  index("idx_charge_types_code").on(t.code),
  index("idx_charge_types_accounting_type").on(t.accountingType),
]);
