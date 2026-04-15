export interface ApiModule {
  moduleAr: string;
  moduleEn: string;
  basePath: string;
  endpoints: ApiEndpoint[];
}

export interface ApiEndpoint {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  operationId: string;
  descriptionAr: string;
  type: "query" | "command" | "posting" | "reversal";
  requiresPermission?: string;
}

export const apiModules: ApiModule[] = [
  {
    moduleAr: "الصحة والتشغيل",
    moduleEn: "Health",
    basePath: "/api",
    endpoints: [
      { method: "GET", path: "/healthz", operationId: "healthCheck", descriptionAr: "فحص صحة الخادم", type: "query" },
    ],
  },
  {
    moduleAr: "المصادقة والمستخدمون",
    moduleEn: "Auth & Users",
    basePath: "/api/auth",
    endpoints: [
      { method: "POST", path: "/login", operationId: "login", descriptionAr: "تسجيل الدخول", type: "command" },
      { method: "POST", path: "/logout", operationId: "logout", descriptionAr: "تسجيل الخروج", type: "command" },
      { method: "GET", path: "/me", operationId: "getCurrentUser", descriptionAr: "بيانات المستخدم الحالي", type: "query" },
      { method: "GET", path: "/users", operationId: "listUsers", descriptionAr: "قائمة المستخدمين", type: "query" },
      { method: "POST", path: "/users", operationId: "createUser", descriptionAr: "إنشاء مستخدم جديد", type: "command", requiresPermission: "users:create" },
      { method: "PATCH", path: "/users/:id", operationId: "updateUser", descriptionAr: "تعديل مستخدم", type: "command" },
      { method: "GET", path: "/roles", operationId: "listRoles", descriptionAr: "قائمة الأدوار", type: "query" },
    ],
  },
  {
    moduleAr: "البيانات الأساسية",
    moduleEn: "Master Data",
    basePath: "/api/master",
    endpoints: [
      { method: "GET", path: "/customers", operationId: "listCustomers", descriptionAr: "قائمة العملاء", type: "query" },
      { method: "POST", path: "/customers", operationId: "createCustomer", descriptionAr: "إنشاء عميل جديد", type: "command" },
      { method: "GET", path: "/customers/:id", operationId: "getCustomer", descriptionAr: "تفاصيل عميل", type: "query" },
      { method: "PATCH", path: "/customers/:id", operationId: "updateCustomer", descriptionAr: "تعديل عميل", type: "command" },
      { method: "GET", path: "/agents", operationId: "listAgents", descriptionAr: "قائمة وكلاء الشحن", type: "query" },
      { method: "POST", path: "/agents", operationId: "createAgent", descriptionAr: "إنشاء وكيل شحن", type: "command" },
      { method: "GET", path: "/chart-of-accounts", operationId: "getChartOfAccounts", descriptionAr: "دليل الحسابات (شجري)", type: "query" },
      { method: "POST", path: "/chart-of-accounts", operationId: "createAccount", descriptionAr: "إضافة حساب", type: "command" },
      { method: "PATCH", path: "/chart-of-accounts/:id", operationId: "updateAccount", descriptionAr: "تعديل حساب", type: "command" },
      { method: "GET", path: "/fiscal-years", operationId: "listFiscalYears", descriptionAr: "السنوات المالية", type: "query" },
      { method: "GET", path: "/fiscal-periods", operationId: "listFiscalPeriods", descriptionAr: "الفترات المالية", type: "query" },
      { method: "PATCH", path: "/fiscal-periods/:id/lock", operationId: "lockFiscalPeriod", descriptionAr: "قفل فترة مالية", type: "posting", requiresPermission: "fiscal:lock" },
    ],
  },
  {
    moduleAr: "العمليات",
    moduleEn: "Operations",
    basePath: "/api/operations",
    endpoints: [
      { method: "GET", path: "/agent-trips", operationId: "listAgentTrips", descriptionAr: "قائمة رحلات الوكيل", type: "query" },
      { method: "POST", path: "/agent-trips", operationId: "createAgentTrip", descriptionAr: "تسجيل رحلة وكيل", type: "command" },
      { method: "GET", path: "/agent-trips/:id", operationId: "getAgentTrip", descriptionAr: "تفاصيل رحلة وكيل", type: "query" },
      { method: "GET", path: "/agent-extra-fees", operationId: "listAgentExtraFees", descriptionAr: "قائمة الرسوم الإضافية", type: "query" },
      { method: "POST", path: "/agent-extra-fees", operationId: "createAgentExtraFee", descriptionAr: "تسجيل رسوم إضافية للوكيل", type: "command" },
      { method: "GET", path: "/customs-payments", operationId: "listCustomsPayments", descriptionAr: "قائمة مدفوعات الجمارك", type: "query" },
      { method: "POST", path: "/customs-payments", operationId: "createCustomsPayment", descriptionAr: "تسجيل دفع جمركي", type: "command" },
      { method: "GET", path: "/field-advances", operationId: "listFieldAdvances", descriptionAr: "قائمة السلف الميدانية", type: "query" },
      { method: "POST", path: "/field-advances", operationId: "createFieldAdvance", descriptionAr: "صرف سلفة ميدانية", type: "command" },
    ],
  },
  {
    moduleAr: "مصادر التكلفة",
    moduleEn: "Cost Sources",
    basePath: "/api/cost-sources",
    endpoints: [
      { method: "GET", path: "/", operationId: "listCostSources", descriptionAr: "قائمة مصادر التكلفة (مع الأرصدة)", type: "query" },
      { method: "GET", path: "/unallocated", operationId: "listUnallocatedCostSources", descriptionAr: "مصادر التكلفة المفتوحة / غير المخصصة", type: "query" },
      { method: "GET", path: "/:id", operationId: "getCostSource", descriptionAr: "تفاصيل مصدر تكلفة مع التخصيصات", type: "query" },
      { method: "GET", path: "/:id/allocations", operationId: "getCostSourceAllocations", descriptionAr: "تخصيصات مصدر تكلفة", type: "query" },
    ],
  },
  {
    moduleAr: "الفواتير",
    moduleEn: "Invoices",
    basePath: "/api/invoices",
    endpoints: [
      { method: "GET", path: "/", operationId: "listInvoices", descriptionAr: "قائمة الفواتير", type: "query" },
      { method: "POST", path: "/", operationId: "createInvoice", descriptionAr: "إنشاء فاتورة مسودة", type: "command" },
      { method: "GET", path: "/:id", operationId: "getInvoice", descriptionAr: "تفاصيل الفاتورة", type: "query" },
      { method: "PATCH", path: "/:id", operationId: "updateInvoice", descriptionAr: "تعديل فاتورة مسودة", type: "command" },
      { method: "DELETE", path: "/:id", operationId: "deleteInvoice", descriptionAr: "حذف فاتورة مسودة فقط", type: "command" },
      { method: "POST", path: "/:id/lines", operationId: "addInvoiceLine", descriptionAr: "إضافة بند للفاتورة", type: "command" },
      { method: "PATCH", path: "/:id/lines/:lineId", operationId: "updateInvoiceLine", descriptionAr: "تعديل بند فاتورة", type: "command" },
      { method: "DELETE", path: "/:id/lines/:lineId", operationId: "deleteInvoiceLine", descriptionAr: "حذف بند فاتورة (مسودة فقط)", type: "command" },
      { method: "POST", path: "/:id/post", operationId: "postInvoice", descriptionAr: "ترحيل الفاتورة النهائية", type: "posting", requiresPermission: "invoices:post" },
      { method: "POST", path: "/:id/reverse", operationId: "reverseInvoice", descriptionAr: "عكس فاتورة مرحّلة", type: "reversal", requiresPermission: "invoices:reverse" },
      { method: "GET", path: "/customer/:customerId/statement", operationId: "getCustomerStatement", descriptionAr: "كشف حساب العميل", type: "query" },
    ],
  },
  {
    moduleAr: "الخزينة",
    moduleEn: "Treasury",
    basePath: "/api/treasury",
    endpoints: [
      { method: "GET", path: "/payment-vouchers", operationId: "listPaymentVouchers", descriptionAr: "قائمة سندات الصرف", type: "query" },
      { method: "POST", path: "/payment-vouchers", operationId: "createPaymentVoucher", descriptionAr: "إنشاء سند صرف", type: "command" },
      { method: "GET", path: "/receipt-vouchers", operationId: "listReceiptVouchers", descriptionAr: "قائمة سندات القبض", type: "query" },
      { method: "POST", path: "/receipt-vouchers", operationId: "createReceiptVoucher", descriptionAr: "إنشاء سند قبض", type: "command" },
      { method: "POST", path: "/transfers", operationId: "createTransfer", descriptionAr: "تحويل داخلي بين الخزائن", type: "command" },
    ],
  },
  {
    moduleAr: "المحاسبة",
    moduleEn: "Accounting",
    basePath: "/api/accounting",
    endpoints: [
      { method: "GET", path: "/journal-entries", operationId: "listJournalEntries", descriptionAr: "قائمة القيود اليومية", type: "query" },
      { method: "POST", path: "/journal-entries", operationId: "createJournalEntry", descriptionAr: "إنشاء قيد يدوي", type: "command" },
      { method: "GET", path: "/journal-entries/:id", operationId: "getJournalEntry", descriptionAr: "تفاصيل القيد", type: "query" },
      { method: "POST", path: "/journal-entries/:id/post", operationId: "postJournalEntry", descriptionAr: "ترحيل قيد يدوي", type: "posting", requiresPermission: "journal:post" },
      { method: "POST", path: "/journal-entries/:id/reverse", operationId: "reverseJournalEntry", descriptionAr: "عكس قيد مرحّل", type: "reversal", requiresPermission: "journal:reverse" },
    ],
  },
  {
    moduleAr: "التقارير",
    moduleEn: "Reports",
    basePath: "/api/reports",
    endpoints: [
      { method: "GET", path: "/general-journal", operationId: "getGeneralJournal", descriptionAr: "اليومية العامة", type: "query" },
      { method: "GET", path: "/general-ledger", operationId: "getGeneralLedger", descriptionAr: "دفتر الأستاذ العام", type: "query" },
      { method: "GET", path: "/trial-balance", operationId: "getTrialBalance", descriptionAr: "ميزان المراجعة", type: "query" },
      { method: "GET", path: "/income-statement", operationId: "getIncomeStatement", descriptionAr: "قائمة الدخل", type: "query" },
      { method: "GET", path: "/balance-sheet", operationId: "getBalanceSheet", descriptionAr: "الميزانية العمومية", type: "query" },
      { method: "GET", path: "/vat-report", operationId: "getVatReport", descriptionAr: "تقرير ضريبة القيمة المضافة", type: "query" },
      { method: "GET", path: "/aged-receivables", operationId: "getAgedReceivables", descriptionAr: "تحليل الذمم المدينة المتقادمة", type: "query" },
      { method: "GET", path: "/aged-payables", operationId: "getAgedPayables", descriptionAr: "تحليل الذمم الدائنة المتقادمة", type: "query" },
      { method: "GET", path: "/cost-source-report", operationId: "getCostSourceReport", descriptionAr: "تقرير مصادر التكلفة وتخصيصاتها", type: "query" },
      { method: "GET", path: "/unallocated-costs-report", operationId: "getUnallocatedCostsReport", descriptionAr: "التكاليف غير المفوترة / غير المخصصة", type: "query" },
      { method: "GET", path: "/collections-report", operationId: "getCollectionsReport", descriptionAr: "تقرير التحصيلات", type: "query" },
      { method: "GET", path: "/dashboard-summary", operationId: "getDashboardSummary", descriptionAr: "ملخص لوحة التحكم", type: "query" },
    ],
  },
];
