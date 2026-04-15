/**
 * Phase 2 Seed Script
 * Run: npx tsx src/seed.ts (or via workflow)
 */
import { db } from "@workspace/db";
import {
  roles, permissions, rolePermissions, users,
  branches, settings, sequences, accounts,
  fiscalYears, fiscalPeriods, chargeTypes,
} from "@workspace/db/schema";
import { hashPassword } from "./lib/password";
import { eq } from "drizzle-orm";

const MODULES = [
  "users", "roles", "permissions", "branches", "settings", "sequences",
  "customers", "agents", "treasuries", "bank_accounts", "charge_types",
  "accounts", "fiscal_years", "audit_logs", "notifications",
  "agent_trip_charges", "agent_additional_fees", "customs_payments",
  "on_behalf_costs", "cost_sources",
];
const ACTIONS = ["view", "create", "edit", "delete", "post", "reverse", "print", "export", "approve"];

async function main() {
  console.log("🌱 Starting Phase 2 seed...");

  // ─── Branches ───────────────────────────────────────────────────────────────
  const [mainBranch] = await db.insert(branches).values({
    code: "HQ",
    nameAr: "المركز الرئيسي",
    nameEn: "Head Office",
    isActive: true,
  }).onConflictDoNothing().returning();
  console.log("✅ Branch seeded");

  // ─── Roles ──────────────────────────────────────────────────────────────────
  const rolesData = [
    { name: "super_admin", nameAr: "مدير النظام", isSystem: true },
    { name: "admin", nameAr: "مشرف", isSystem: true },
    { name: "accountant", nameAr: "محاسب", isSystem: true },
    { name: "operations", nameAr: "عمليات", isSystem: true },
    { name: "viewer", nameAr: "مشاهد فقط", isSystem: true },
  ];
  const insertedRoles: Array<typeof roles.$inferSelect> = [];
  for (const r of rolesData) {
    const [role] = await db.insert(roles).values(r).onConflictDoNothing().returning();
    if (role) insertedRoles.push(role);
    else {
      const existing = await db.query.roles.findFirst({ where: eq(roles.name, r.name) });
      if (existing) insertedRoles.push(existing);
    }
  }
  console.log("✅ Roles seeded:", insertedRoles.map(r => r.name).join(", "));

  // ─── Permissions ────────────────────────────────────────────────────────────
  const permissionsData: Array<{ module: string; screen: string; action: string; nameAr: string }> = [];
  for (const mod of MODULES) {
    for (const action of ACTIONS) {
      permissionsData.push({
        module: mod,
        screen: mod,
        action,
        nameAr: `${getModuleNameAr(mod)} — ${getActionNameAr(action)}`,
      });
    }
  }
  const insertedPerms: Array<typeof permissions.$inferSelect> = [];
  for (const p of permissionsData) {
    const [perm] = await db.insert(permissions).values(p).onConflictDoNothing().returning();
    if (perm) insertedPerms.push(perm);
  }
  console.log("✅ Permissions seeded:", insertedPerms.length);

  // ─── Grant all permissions to super_admin ───────────────────────────────────
  const superAdminRole = insertedRoles.find(r => r.name === "super_admin");
  if (superAdminRole) {
    const allPerms = await db.select().from(permissions);
    for (const p of allPerms) {
      await db.insert(rolePermissions).values({ roleId: superAdminRole.id, permissionId: p.id }).onConflictDoNothing();
    }
    console.log("✅ Super admin permissions granted");
  }

  // ─── Grant view permissions to viewer role ──────────────────────────────────
  const viewerRole = insertedRoles.find(r => r.name === "viewer");
  if (viewerRole) {
    const viewPerms = await db.select().from(permissions).where(eq(permissions.action, "view"));
    for (const p of viewPerms) {
      await db.insert(rolePermissions).values({ roleId: viewerRole.id, permissionId: p.id }).onConflictDoNothing();
    }
  }

  // ─── Admin User ─────────────────────────────────────────────────────────────
  const passwordHash = await hashPassword("Admin@12345");
  const branchId = mainBranch?.id;
  const adminRoleId = superAdminRole?.id;
  await db.insert(users).values({
    username: "admin",
    email: "admin@erp.local",
    nameAr: "مدير النظام",
    nameEn: "System Administrator",
    passwordHash,
    status: "ACTIVE",
    branchId: branchId as any,
    roleId: adminRoleId as any,
  }).onConflictDoNothing();
  console.log("✅ Admin user seeded (username: admin, password: Admin@12345)");

  // ─── Settings ────────────────────────────────────────────────────────────────
  const settingsData = [
    { key: "company.name_ar", value: "شركة التخليص الجمركي", category: "company", nameAr: "اسم الشركة (عربي)" },
    { key: "company.name_en", value: "Saudi Customs Clearance Co.", category: "company", nameAr: "اسم الشركة (إنجليزي)" },
    { key: "company.vat_number", value: "", category: "company", nameAr: "الرقم الضريبي" },
    { key: "company.cr_number", value: "", category: "company", nameAr: "السجل التجاري" },
    { key: "vat.rate", value: "15", category: "vat", nameAr: "نسبة ضريبة القيمة المضافة (%)" },
    { key: "vat.applies_to_service_only", value: "true", category: "vat", nameAr: "الضريبة على الخدمات فقط (لا العبور)" },
    { key: "app.rtl", value: "true", category: "appearance", nameAr: "عرض من اليمين لليسار" },
    { key: "app.language", value: "ar", category: "appearance", nameAr: "اللغة الافتراضية" },
    { key: "app.theme", value: "dark", category: "appearance", nameAr: "الثيم الافتراضي" },
  ];
  for (const s of settingsData) {
    await db.insert(settings).values(s).onConflictDoNothing();
  }
  console.log("✅ Settings seeded");

  // ─── Sequences ────────────────────────────────────────────────────────────────
  const sequencesData = [
    { module: "customers", nameAr: "ترقيم العملاء", prefix: "CUS-" },
    { module: "agents", nameAr: "ترقيم وكلاء الشحن", prefix: "AGT-" },
    { module: "invoices", nameAr: "ترقيم الفواتير", prefix: "INV-" },
    { module: "receipts", nameAr: "ترقيم سندات القبض", prefix: "RCV-" },
    { module: "payments", nameAr: "ترقيم سندات الصرف", prefix: "PAY-" },
    { module: "journal_entries", nameAr: "ترقيم القيود اليومية", prefix: "JE-" },
    { module: "clearance_files", nameAr: "ترقيم ملفات التخليص", prefix: "CLR-" },
    { module: "agent_trip_charges", nameAr: "ترقيم رسوم رحلات الوكلاء", prefix: "ATC-" },
    { module: "agent_additional_fees", nameAr: "ترقيم الرسوم الإضافية للوكلاء", prefix: "AEF-" },
    { module: "customs_payments", nameAr: "ترقيم مدفوعات الجمارك", prefix: "CPA-" },
    { module: "on_behalf_costs", nameAr: "ترقيم التكاليف بالنيابة", prefix: "OBC-" },
  ];
  for (const s of sequencesData) {
    await db.insert(sequences).values({ ...s, currentYear: new Date().getFullYear() }).onConflictDoNothing();
  }
  console.log("✅ Sequences seeded");

  // ─── Chart of Accounts (full 3-level Arabic CoA) ───────────────────────────
  await seedChartOfAccounts();
  console.log("✅ Chart of accounts seeded");

  // ─── Fiscal Year 2025 ────────────────────────────────────────────────────────
  const [fy] = await db.insert(fiscalYears).values({
    name: "2025",
    nameAr: "السنة المالية 2025",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    status: "OPEN",
  }).onConflictDoNothing().returning();

  if (fy) {
    const monthNames = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
    for (let i = 0; i < 12; i++) {
      const start = new Date(2025, i, 1);
      const end = new Date(2025, i + 1, 0);
      await db.insert(fiscalPeriods).values({
        fiscalYearId: fy.id,
        periodNumber: i + 1,
        nameAr: `${monthNames[i]} 2025`,
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      }).onConflictDoNothing();
    }
  }
  console.log("✅ Fiscal year 2025 seeded");

  // ─── Charge Types ─────────────────────────────────────────────────────────────
  await seedChargeTypes();
  console.log("✅ Charge types seeded");

  console.log("\n🎉 Phase 2 seed completed successfully!");
  console.log("   Login: admin / Admin@12345");
  process.exit(0);
}

async function seedChartOfAccounts() {
  const coaData = [
    // ─── Level 1: Main Groups ────────────────────────────────────────────────
    { code: "1", nameAr: "الأصول", type: "ASSET" as const, normalBalance: "DEBIT" as const, level: 1, allowPosting: false },
    { code: "2", nameAr: "الالتزامات", type: "LIABILITY" as const, normalBalance: "CREDIT" as const, level: 1, allowPosting: false },
    { code: "3", nameAr: "حقوق الملكية", type: "EQUITY" as const, normalBalance: "CREDIT" as const, level: 1, allowPosting: false },
    { code: "4", nameAr: "الإيرادات", type: "REVENUE" as const, normalBalance: "CREDIT" as const, level: 1, allowPosting: false },
    { code: "5", nameAr: "المصروفات", type: "EXPENSE" as const, normalBalance: "DEBIT" as const, level: 1, allowPosting: false },
    // ─── Level 2: Sub Groups ────────────────────────────────────────────────
    { code: "11", nameAr: "الأصول المتداولة", type: "ASSET" as const, normalBalance: "DEBIT" as const, level: 2, allowPosting: false, parentCode: "1" },
    { code: "12", nameAr: "الأصول غير المتداولة", type: "ASSET" as const, normalBalance: "DEBIT" as const, level: 2, allowPosting: false, parentCode: "1" },
    { code: "21", nameAr: "الالتزامات المتداولة", type: "LIABILITY" as const, normalBalance: "CREDIT" as const, level: 2, allowPosting: false, parentCode: "2" },
    { code: "22", nameAr: "الالتزامات طويلة الأجل", type: "LIABILITY" as const, normalBalance: "CREDIT" as const, level: 2, allowPosting: false, parentCode: "2" },
    { code: "31", nameAr: "رأس المال", type: "EQUITY" as const, normalBalance: "CREDIT" as const, level: 2, allowPosting: false, parentCode: "3" },
    { code: "32", nameAr: "الأرباح المدورة", type: "EQUITY" as const, normalBalance: "CREDIT" as const, level: 2, allowPosting: false, parentCode: "3" },
    { code: "41", nameAr: "إيرادات التخليص الجمركي", type: "REVENUE" as const, normalBalance: "CREDIT" as const, level: 2, allowPosting: false, parentCode: "4" },
    { code: "42", nameAr: "إيرادات أخرى", type: "REVENUE" as const, normalBalance: "CREDIT" as const, level: 2, allowPosting: false, parentCode: "4" },
    { code: "51", nameAr: "مصروفات تشغيلية", type: "EXPENSE" as const, normalBalance: "DEBIT" as const, level: 2, allowPosting: false, parentCode: "5" },
    { code: "52", nameAr: "مصروفات إدارية وعمومية", type: "EXPENSE" as const, normalBalance: "DEBIT" as const, level: 2, allowPosting: false, parentCode: "5" },
    // ─── Level 3: Detail Accounts ────────────────────────────────────────────
    { code: "1101", nameAr: "الصندوق / النقدية", type: "ASSET" as const, normalBalance: "DEBIT" as const, level: 3, allowPosting: true, parentCode: "11" },
    { code: "1102", nameAr: "البنوك", type: "ASSET" as const, normalBalance: "DEBIT" as const, level: 3, allowPosting: true, parentCode: "11" },
    { code: "1103", nameAr: "الذمم المدينة — العملاء", type: "ASSET" as const, normalBalance: "DEBIT" as const, level: 3, allowPosting: true, parentCode: "11", isSystemAccount: true },
    { code: "1104", nameAr: "تكاليف قابلة للاسترداد / عبور غير مخصص", type: "ASSET" as const, normalBalance: "DEBIT" as const, level: 3, allowPosting: true, parentCode: "11", isSystemAccount: true, notes: "الحساب المحوري — يستقبل جميع المدفوعات بالنيابة عن العملاء" },
    { code: "1105", nameAr: "ضريبة القيمة المضافة المدخلات", type: "ASSET" as const, normalBalance: "DEBIT" as const, level: 3, allowPosting: true, parentCode: "11" },
    { code: "1201", nameAr: "الأصول الثابتة — صافي", type: "ASSET" as const, normalBalance: "DEBIT" as const, level: 3, allowPosting: true, parentCode: "12" },
    { code: "2101", nameAr: "الذمم الدائنة — الموردون", type: "LIABILITY" as const, normalBalance: "CREDIT" as const, level: 3, allowPosting: true, parentCode: "21" },
    { code: "2102", nameAr: "الذمم الدائنة — وكلاء الشحن", type: "LIABILITY" as const, normalBalance: "CREDIT" as const, level: 3, allowPosting: true, parentCode: "21" },
    { code: "2103", nameAr: "الدفعات المقدمة من العملاء", type: "LIABILITY" as const, normalBalance: "CREDIT" as const, level: 3, allowPosting: true, parentCode: "21" },
    { code: "2104", nameAr: "ضريبة القيمة المضافة — مخرجات", type: "LIABILITY" as const, normalBalance: "CREDIT" as const, level: 3, allowPosting: true, parentCode: "21", isSystemAccount: true },
    { code: "2105", nameAr: "رواتب مستحقة الدفع", type: "LIABILITY" as const, normalBalance: "CREDIT" as const, level: 3, allowPosting: true, parentCode: "21" },
    { code: "3101", nameAr: "رأس المال المدفوع", type: "EQUITY" as const, normalBalance: "CREDIT" as const, level: 3, allowPosting: true, parentCode: "31" },
    { code: "3201", nameAr: "الأرباح المدورة", type: "EQUITY" as const, normalBalance: "CREDIT" as const, level: 3, allowPosting: true, parentCode: "32" },
    { code: "4101", nameAr: "إيرادات رسوم التخليص الجمركي", type: "REVENUE" as const, normalBalance: "CREDIT" as const, level: 3, allowPosting: true, parentCode: "41", isSystemAccount: true },
    { code: "4102", nameAr: "إيرادات الرسوم الإدارية", type: "REVENUE" as const, normalBalance: "CREDIT" as const, level: 3, allowPosting: true, parentCode: "41" },
    { code: "4201", nameAr: "إيرادات أخرى", type: "REVENUE" as const, normalBalance: "CREDIT" as const, level: 3, allowPosting: true, parentCode: "42" },
    { code: "5101", nameAr: "رواتب وأجور", type: "EXPENSE" as const, normalBalance: "DEBIT" as const, level: 3, allowPosting: true, parentCode: "51" },
    { code: "5102", nameAr: "مصروفات العمليات الجمركية", type: "EXPENSE" as const, normalBalance: "DEBIT" as const, level: 3, allowPosting: true, parentCode: "51" },
    { code: "5201", nameAr: "مصروفات إيجار", type: "EXPENSE" as const, normalBalance: "DEBIT" as const, level: 3, allowPosting: true, parentCode: "52" },
    { code: "5202", nameAr: "مصروفات مكتبية وإدارية", type: "EXPENSE" as const, normalBalance: "DEBIT" as const, level: 3, allowPosting: true, parentCode: "52" },
  ];

  // Insert Level 1 first, then Level 2, then Level 3
  const insertedMap = new Map<string, string>();

  for (const level of [1, 2, 3]) {
    for (const acc of coaData.filter(a => a.level === level)) {
      const parentId = (acc as any).parentCode ? insertedMap.get((acc as any).parentCode) : undefined;
      const [inserted] = await db.insert(accounts).values({
        code: acc.code,
        nameAr: acc.nameAr,
        type: acc.type,
        normalBalance: acc.normalBalance,
        level: acc.level,
        allowPosting: acc.allowPosting,
        parentId: parentId as any,
        isSystemAccount: (acc as any).isSystemAccount ?? false,
        notes: (acc as any).notes,
      }).onConflictDoNothing().returning();
      if (inserted) {
        insertedMap.set(acc.code, inserted.id);
      } else {
        const existing = await db.query.accounts.findFirst({ where: eq(accounts.code, acc.code) });
        if (existing) insertedMap.set(acc.code, existing.id);
      }
    }
  }
}

async function seedChargeTypes() {
  // Get some account IDs for defaults
  const acc1103 = await db.query.accounts.findFirst({ where: eq(accounts.code, "1103") });
  const acc1104 = await db.query.accounts.findFirst({ where: eq(accounts.code, "1104") });
  const acc4101 = await db.query.accounts.findFirst({ where: eq(accounts.code, "4101") });
  const acc4102 = await db.query.accounts.findFirst({ where: eq(accounts.code, "4102") });

  const chargeTypesData = [
    {
      code: "CT-CUSTOMS",
      nameAr: "رسوم الجمارك",
      nameEn: "Customs Duties",
      accountingType: "PASS_THROUGH" as const,
      defaultSettlementAccountId: acc1104?.id,
      vatApplicable: false,
      requiresCostSource: true,
    },
    {
      code: "CT-SHIPPING",
      nameAr: "رسوم الشحن",
      nameEn: "Shipping Fees",
      accountingType: "PASS_THROUGH" as const,
      defaultSettlementAccountId: acc1104?.id,
      vatApplicable: false,
      requiresCostSource: true,
    },
    {
      code: "CT-PORT",
      nameAr: "رسوم الميناء والتحميل",
      nameEn: "Port & Handling Fees",
      accountingType: "PASS_THROUGH" as const,
      defaultSettlementAccountId: acc1104?.id,
      vatApplicable: false,
      requiresCostSource: true,
    },
    {
      code: "CT-AGENT",
      nameAr: "رسوم الوكيل",
      nameEn: "Agent Fees",
      accountingType: "PASS_THROUGH" as const,
      defaultSettlementAccountId: acc1104?.id,
      vatApplicable: false,
      requiresCostSource: true,
    },
    {
      code: "CT-CLEARANCE",
      nameAr: "رسوم التخليص الجمركي",
      nameEn: "Customs Clearance Fees",
      accountingType: "REVENUE" as const,
      defaultRevenueAccountId: acc4101?.id,
      vatApplicable: true,
      requiresCostSource: false,
    },
    {
      code: "CT-ADMIN",
      nameAr: "الرسوم الإدارية",
      nameEn: "Administrative Fees",
      accountingType: "REVENUE" as const,
      defaultRevenueAccountId: acc4102?.id,
      vatApplicable: true,
      requiresCostSource: false,
    },
  ];

  for (const ct of chargeTypesData) {
    await db.insert(chargeTypes).values(ct as any).onConflictDoNothing();
  }
}

function getModuleNameAr(mod: string): string {
  const names: Record<string, string> = {
    users: "المستخدمون", roles: "الأدوار", permissions: "الصلاحيات",
    branches: "الفروع", settings: "الإعدادات", sequences: "التسلسلات",
    customers: "العملاء", agents: "وكلاء الشحن", treasuries: "الخزائن",
    bank_accounts: "الحسابات البنكية", charge_types: "أنواع الرسوم",
    accounts: "دليل الحسابات", fiscal_years: "السنوات المالية",
    audit_logs: "سجل الأحداث", notifications: "الإشعارات",
    agent_trip_charges: "رسوم رحلات الوكلاء", agent_additional_fees: "الرسوم الإضافية للوكلاء",
    customs_payments: "مدفوعات الجمارك", on_behalf_costs: "التكاليف والسلف بالنيابة",
    cost_sources: "مصادر التكاليف",
  };
  return names[mod] ?? mod;
}

function getActionNameAr(action: string): string {
  const names: Record<string, string> = {
    view: "عرض", create: "إنشاء", edit: "تعديل", delete: "حذف",
    post: "ترحيل", reverse: "عكس", print: "طباعة", export: "تصدير", approve: "اعتماد",
  };
  return names[action] ?? action;
}

main().catch(err => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
