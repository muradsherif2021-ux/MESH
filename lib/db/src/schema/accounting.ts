import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
  integer,
  numeric,
  pgEnum,
  index,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./platform";

// ─── Enums ─────────────────────────────────────────────────────────────────────

export const accountTypeEnum = pgEnum("account_type", [
  "ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE",
]);
export const normalBalanceEnum = pgEnum("normal_balance", ["DEBIT", "CREDIT"]);
export const fiscalPeriodStatusEnum = pgEnum("fiscal_period_status", [
  "OPEN", "CLOSED", "LOCKED",
]);

// ─── Chart of Accounts ────────────────────────────────────────────────────────

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  type: accountTypeEnum("type").notNull(),
  normalBalance: normalBalanceEnum("normal_balance").notNull(),
  level: integer("level").notNull(),
  parentId: uuid("parent_id"),
  allowPosting: boolean("allow_posting").notNull().default(false),
  isSystemAccount: boolean("is_system_account").notNull().default(false),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
}, (t) => [
  index("idx_accounts_code").on(t.code),
  index("idx_accounts_parent").on(t.parentId),
  index("idx_accounts_type").on(t.type),
  check("chk_accounts_level", sql`${t.level} BETWEEN 1 AND 3`),
]);

// ─── Fiscal Years ─────────────────────────────────────────────────────────────

export const fiscalYears = pgTable("fiscal_years", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  status: fiscalPeriodStatusEnum("status").notNull().default("OPEN"),
  notes: text("notes"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  closedBy: uuid("closed_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
});

// ─── Fiscal Periods ───────────────────────────────────────────────────────────

export const fiscalPeriods = pgTable("fiscal_periods", {
  id: uuid("id").primaryKey().defaultRandom(),
  fiscalYearId: uuid("fiscal_year_id").notNull().references(() => fiscalYears.id, { onDelete: "cascade" }),
  periodNumber: integer("period_number").notNull(),
  nameAr: text("name_ar").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  status: fiscalPeriodStatusEnum("status").notNull().default("OPEN"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  closedBy: uuid("closed_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("uq_fiscal_period").on(t.fiscalYearId, t.periodNumber),
  index("idx_fiscal_periods_year").on(t.fiscalYearId),
  index("idx_fiscal_periods_status").on(t.status),
]);
