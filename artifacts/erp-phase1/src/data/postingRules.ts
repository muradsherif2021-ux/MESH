export interface PostingRule {
  id: string;
  eventNameAr: string;
  eventNameEn: string;
  category: "operations" | "sales" | "treasury" | "accounting";
  debitAccount: string;
  creditAccount: string;
  postingTiming: string;
  vatApplicable: boolean;
  journalType: string;
  validations: string[];
  notes?: string;
}

export const postingRules: PostingRule[] = [
  {
    id: "A",
    eventNameAr: "تسجيل رسوم وكيل الشحن (بالآجل)",
    eventNameEn: "Record Agent Trip/Fee Charges on Credit",
    category: "operations",
    debitAccount: "1104 — تكاليف قابلة للاسترداد / عبور غير مخصص",
    creditAccount: "2101 — ذمم دائنة — وكلاء الشحن",
    postingTiming: "عند إدخال رحلة الوكيل أو الرسوم الإضافية",
    vatApplicable: false,
    journalType: "AGENT_CHARGE",
    validations: [
      "يجب أن يكون وكيل الشحن موجوداً في النظام",
      "يجب أن يكون المبلغ أكبر من صفر",
      "يجب أن تكون الفترة المالية مفتوحة",
    ],
    notes: "مصدر التكلفة ينشأ تلقائياً بالتزامن مع هذا القيد",
  },
  {
    id: "B",
    eventNameAr: "سداد وكيل الشحن نقداً أو بنكاً",
    eventNameEn: "Pay Shipping Agent (Cash/Bank)",
    category: "treasury",
    debitAccount: "2101 — ذمم دائنة — وكلاء الشحن",
    creditAccount: "1101/1102 — الصندوق / البنك",
    postingTiming: "عند إصدار سند الصرف لوكيل الشحن",
    vatApplicable: false,
    journalType: "PAYMENT",
    validations: [
      "يجب أن يكون الرصيد الدائن كافياً في الصندوق/البنك",
      "لا يمكن الدفع أكثر من الرصيد المستحق للوكيل",
    ],
  },
  {
    id: "C",
    eventNameAr: "دفع الرسوم الجمركية نقداً",
    eventNameEn: "Pay Customs Duties (Cash/Bank)",
    category: "operations",
    debitAccount: "1104 — تكاليف قابلة للاسترداد / عبور غير مخصص",
    creditAccount: "1101/1102 — الصندوق / البنك",
    postingTiming: "عند تسجيل دفع رسوم جمركية مباشر",
    vatApplicable: false,
    journalType: "CUSTOMS_PAYMENT",
    validations: [
      "يجب إرفاق مستند التسديد للجمارك",
      "يجب أن يكون الرصيد النقدي كافياً",
    ],
    notes: "مصدر التكلفة ينشأ تلقائياً بنوع CUSTOMS_PAYMENT",
  },
  {
    id: "D",
    eventNameAr: "صرف سلف ميدانية / سلف سائقين / تكاليف أخرى",
    eventNameEn: "Pay Field Advances / Driver Advances / Other On-Behalf Costs",
    category: "operations",
    debitAccount: "1104 — تكاليف قابلة للاسترداد / عبور غير مخصص",
    creditAccount: "1101/1102 — الصندوق / البنك",
    postingTiming: "عند صرف السلفة أو التكلفة",
    vatApplicable: false,
    journalType: "FIELD_ADVANCE",
    validations: [
      "يجب تحديد الغرض من السلفة",
      "يجب أن يكون الرصيد النقدي كافياً",
    ],
    notes: "مصدر التكلفة ينشأ بنوع FIELD_ADVANCE أو OTHER",
  },
  {
    id: "E",
    eventNameAr: "استلام دفعة مقدمة من عميل",
    eventNameEn: "Receive Customer Advance Payment",
    category: "treasury",
    debitAccount: "1101/1102 — الصندوق / البنك",
    creditAccount: "2103 — سلف العملاء",
    postingTiming: "عند إصدار سند القبض للسلفة",
    vatApplicable: false,
    journalType: "CUSTOMER_ADVANCE",
    validations: [
      "يجب ربط السلفة بعميل محدد",
      "يجب أن يكون المبلغ أكبر من صفر",
    ],
  },
  {
    id: "F",
    eventNameAr: "ترحيل الفاتورة النهائية",
    eventNameEn: "Post Final Invoice",
    category: "sales",
    debitAccount: "1103 — ذمم مدينة — العملاء",
    creditAccount: "متعدد: 1104 (عبور مخصص) + 4101/4102 (إيرادات) + 2104 (ضريبة)",
    postingTiming: "عند تأكيد الفاتورة وتحويلها من مسودة إلى نهائية",
    vatApplicable: true,
    journalType: "INVOICE",
    validations: [
      "يجب أن تتساوى إجمالي المدين مع إجمالي الدائن",
      "جميع بنود PASS_THROUGH يجب ربطها بمصدر تكلفة",
      "لا تجاوز للمبلغ المتبقي في مصدر التكلفة",
      "ضريبة القيمة المضافة فقط على بنود REVENUE",
      "الفترة المالية يجب أن تكون مفتوحة",
      "الفاتورة يجب أن تكون في حالة DRAFT",
    ],
    notes: "القيد المركب: مدين = ذمم مدينة (إجمالي الفاتورة). دائن متعدد: تكاليف عبور مخصصة + إيرادات + ضريبة",
  },
  {
    id: "G",
    eventNameAr: "استلام دفعة من العميل على الفاتورة",
    eventNameEn: "Receive Customer Invoice Payment",
    category: "treasury",
    debitAccount: "1101/1102 — الصندوق / البنك",
    creditAccount: "1103 — ذمم مدينة — العملاء",
    postingTiming: "عند إصدار سند القبض مقابل الفاتورة",
    vatApplicable: false,
    journalType: "RECEIPT",
    validations: [
      "لا يمكن التحصيل أكثر من الرصيد المستحق",
      "يجب ربط سند القبض بفاتورة أو حساب عميل",
    ],
  },
  {
    id: "H",
    eventNameAr: "تسجيل مصروف تشغيلي حقيقي للشركة",
    eventNameEn: "Record True Company Operating Expense",
    category: "accounting",
    debitAccount: "51xx/52xx — حساب المصروف التشغيلي",
    creditAccount: "1101/1102/2102 — الصندوق / البنك / ذمم دائنة",
    postingTiming: "عند تسجيل المصروف أو الدفع",
    vatApplicable: false,
    journalType: "EXPENSE",
    validations: [
      "يجب اختيار حساب مصروف قابل للترحيل",
      "المصروفات التشغيلية الحقيقية لا تمر عبر حساب التكاليف القابلة للاسترداد 1104",
    ],
    notes: "مهم: هذا غير حساب 1104 — المصروفات التشغيلية الحقيقية للشركة فقط هنا",
  },
  {
    id: "I",
    eventNameAr: "تحويل داخلي بين الخزائن / البنوك",
    eventNameEn: "Internal Treasury / Bank Transfer",
    category: "treasury",
    debitAccount: "1101/1102 — الخزينة / البنك المستقبِل",
    creditAccount: "1101/1102 — الخزينة / البنك المرسِل",
    postingTiming: "عند إصدار سند التحويل الداخلي",
    vatApplicable: false,
    journalType: "TRANSFER",
    validations: [
      "يجب أن تكون الخزينة المرسِلة والمستقبِلة مختلفتين",
      "يجب أن يكون الرصيد كافياً في المرسِل",
    ],
  },
  {
    id: "J",
    eventNameAr: "عكس فاتورة مرحّلة",
    eventNameEn: "Reverse a Posted Invoice",
    category: "accounting",
    debitAccount: "عكس جميع دائنات الفاتورة الأصلية",
    creditAccount: "عكس جميع مدينات الفاتورة الأصلية",
    postingTiming: "عند طلب العكس من قبل مستخدم مصرّح",
    vatApplicable: false,
    journalType: "REVERSAL",
    validations: [
      "يجب أن تكون الفاتورة بحالة FINAL",
      "يجب أن يكون للمستخدم صلاحية العكس",
      "الفترة المالية للعكس يجب أن تكون مفتوحة",
      "يُنشأ قيد عكس جديد — لا يُعدّل القيد الأصلي",
      "جميع تخصيصات مصادر التكلفة تُعكس تلقائياً",
    ],
    notes: "الفاتورة المعكوسة تصبح REVERSED. يمكن إنشاء فاتورة جديدة بعد العكس.",
  },
];
