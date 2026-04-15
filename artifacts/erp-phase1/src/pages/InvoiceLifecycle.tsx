import { ArrowLeft, FileText, CheckCircle, XCircle, AlertTriangle, Lock } from "lucide-react";

const states = [
  {
    id: "DRAFT",
    nameAr: "مسودة / بروفورما",
    nameEn: "Draft / Proforma",
    color: "bg-yellow-100 dark:bg-yellow-950/40 border-yellow-300 dark:border-yellow-800",
    textColor: "text-yellow-700 dark:text-yellow-400",
    dotColor: "bg-yellow-500",
    allows: [
      "تعديل البنود",
      "إضافة تخصيصات من مصادر التكلفة",
      "حذف الفاتورة",
      "إرسال للعميل كمسودة",
    ],
    prevents: [
      "لا تنشئ قيداً يومياً",
      "لا تؤثر على الذمم المدينة",
      "لا تُسوّي أرصدة مصادر التكلفة",
      "لا تُحمَّل ضريبة قيمة مضافة",
    ],
  },
  {
    id: "FINAL",
    nameAr: "نهائية / مرحّلة",
    nameEn: "Final / Posted",
    color: "bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800",
    textColor: "text-emerald-700 dark:text-emerald-400",
    dotColor: "bg-emerald-500",
    allows: [
      "ينشئ قيداً يومياً كاملاً",
      "يُسجّل ذمة مدينة على العميل",
      "يُسوّي أرصدة مصادر التكلفة",
      "يُعترف بالإيراد",
      "يُرحّل ضريبة القيمة المضافة",
    ],
    prevents: [
      "مقفول — لا يمكن تعديله مباشرة",
      "التصحيح فقط عبر العكس",
    ],
  },
  {
    id: "REVERSED",
    nameAr: "معكوسة",
    nameEn: "Reversed",
    color: "bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-800",
    textColor: "text-red-700 dark:text-red-400",
    dotColor: "bg-red-500",
    allows: [
      "تُعيد أرصدة مصادر التكلفة",
      "تُلغي أثر القيد الأصلي",
      "تُتيح إنشاء فاتورة جديدة معدّلة",
    ],
    prevents: [
      "لا يمكن عكسها مرة أخرى",
      "لا يمكن تعديلها",
    ],
  },
];

const invoiceLines = [
  {
    type: "PASS_THROUGH",
    nameAr: "بنود العبور (Pass-Through)",
    examples: ["رسوم الجمارك", "رسوم الشحن", "رسوم الميناء", "التحميل والتفريغ", "رسوم الوكيل", "سلف السائقين"],
    vatRate: "0%",
    requiresCostSource: true,
    color: "border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20",
    textColor: "text-orange-700 dark:text-orange-400",
    accountingEffect: "يُخفَّض حساب 1104 (تكاليف قابلة للاسترداد)",
  },
  {
    type: "REVENUE",
    nameAr: "بنود الإيراد (Revenue)",
    examples: ["رسوم التخليص الجمركي", "الرسوم الإدارية", "رسوم الخدمات"],
    vatRate: "15%",
    requiresCostSource: false,
    color: "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20",
    textColor: "text-emerald-700 dark:text-emerald-400",
    accountingEffect: "يُقيّد في حساب 4101/4102 (إيرادات التخليص)",
  },
];

const journalExample = {
  description: "مثال: فاتورة بقيمة 10,000 ريال (8,500 عبور + 1,500 رسوم + 225 ضريبة)",
  lines: [
    { account: "1103 — ذمم مدينة — العميل", debit: "10,225", credit: "—" },
    { account: "1104 — تكاليف قابلة للاسترداد", debit: "—", credit: "8,500" },
    { account: "4101 — إيرادات رسوم التخليص", debit: "—", credit: "1,500" },
    { account: "2104 — ضريبة القيمة المضافة", debit: "—", credit: "225" },
  ],
  totalDebit: "10,225",
  totalCredit: "10,225",
};

export default function InvoiceLifecycle() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold mb-1">دورة حياة الفاتورة</h1>
        <p className="text-muted-foreground text-sm">
          نظام الفاتورة المبدئية والنهائية — قواعد القفل والعكس والتصحيح
        </p>
      </div>

      {/* State machine */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-bold text-base mb-6">آلة الحالات (State Machine)</h2>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {states.map((state, i) => (
            <div key={state.id} className="flex items-center gap-4">
              <div className={`rounded-xl border-2 p-4 min-w-48 ${state.color}`} data-testid={`state-${state.id}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${state.dotColor}`} />
                  <span className={`font-bold text-sm ${state.textColor}`}>{state.nameAr}</span>
                </div>
                <div className="space-y-1 mb-3">
                  {state.allows.map((a, j) => (
                    <div key={j} className="flex items-start gap-1.5">
                      <CheckCircle size={11} className="text-emerald-500 mt-0.5 shrink-0" />
                      <span className="text-xs text-foreground">{a}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  {state.prevents.map((p, j) => (
                    <div key={j} className="flex items-start gap-1.5">
                      <Lock size={11} className="text-muted-foreground mt-0.5 shrink-0" />
                      <span className="text-xs text-muted-foreground">{p}</span>
                    </div>
                  ))}
                </div>
              </div>
              {i < states.length - 1 && (
                <div className="flex flex-col items-center gap-1">
                  <ArrowLeft size={20} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {i === 0 ? "ترحيل" : "عكس"}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 p-4 rounded-lg bg-muted/40 text-sm text-muted-foreground">
          <strong>تصحيح فاتورة مرحّلة:</strong> عكس الفاتورة النهائية ← إنشاء فاتورة مسودة جديدة بالتصحيح ← ترحيل الفاتورة الجديدة.
          لا يمكن تعديل فاتورة نهائية مباشرة أبداً.
        </div>
      </div>

      {/* Invoice Line Types */}
      <div>
        <h2 className="font-bold text-base mb-4">نوعا بنود الفاتورة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {invoiceLines.map((lineType) => (
            <div
              key={lineType.type}
              className={`rounded-xl border-2 p-5 ${lineType.color}`}
              data-testid={`line-type-${lineType.type.toLowerCase()}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className={`font-bold text-base ${lineType.textColor}`}>{lineType.nameAr}</div>
                  <div className="font-mono text-xs text-muted-foreground">{lineType.type}</div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${lineType.textColor}`}>
                    {lineType.vatRate} ضريبة
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-xs font-semibold text-muted-foreground mb-2">أمثلة:</div>
                <div className="flex flex-wrap gap-1.5">
                  {lineType.examples.map((ex) => (
                    <span key={ex} className="text-xs bg-white/60 dark:bg-black/20 px-2 py-0.5 rounded border text-foreground">
                      {ex}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white/50 dark:bg-black/20 text-sm">
                <span className="font-semibold">الأثر المحاسبي: </span>
                {lineType.accountingEffect}
              </div>

              {lineType.requiresCostSource && (
                <div className="mt-3 flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400">
                  <AlertTriangle size={12} />
                  <span>يتطلب ربطاً إلزامياً بمصدر تكلفة</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Journal entry example */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-bold text-base mb-2">مثال على القيد المحاسبي عند ترحيل فاتورة</h2>
        <p className="text-sm text-muted-foreground mb-4">{journalExample.description}</p>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm" dir="ltr">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs">Account</th>
                <th className="text-right px-4 py-2.5 font-semibold text-blue-600 dark:text-blue-400 text-xs">Debit (DR)</th>
                <th className="text-right px-4 py-2.5 font-semibold text-red-600 dark:text-red-400 text-xs">Credit (CR)</th>
              </tr>
            </thead>
            <tbody>
              {journalExample.lines.map((line, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="px-4 py-2.5 text-xs" dir="rtl">{line.account}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">
                    {line.debit !== "—" ? `${line.debit} ريال` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-red-600 dark:text-red-400 font-semibold">
                    {line.credit !== "—" ? `${line.credit} ريال` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 border-t border-border font-bold">
                <td className="px-4 py-2.5 text-xs font-bold" dir="rtl">الإجمالي</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-blue-600 dark:text-blue-400">
                  {journalExample.totalDebit} ريال
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-red-600 dark:text-red-400">
                  {journalExample.totalCredit} ريال
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="mt-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm">
          <CheckCircle size={15} />
          <span>المدين = الدائن = 10,225 ريال ✓</span>
        </div>
      </div>

      {/* Journal Engine Rules */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-bold text-base mb-4">قواعد محرك القيود اليومية</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            "الترقيم التسلسلي: JE-YYYY-NNNN — فريد وغير قابل للتعديل",
            "المدين يساوي الدائن دائماً — شرط الترحيل الإلزامي",
            "لا ترحيل على حسابات أم (allow_posting = false)",
            "القيود المرحّلة محمية بـ Row-Level Security",
            "التصحيح عبر العكس وإعادة الترحيل — لا حذف ولا تعديل",
            "الفترة المالية يجب أن تكون OPEN عند الترحيل",
            "حالتان فقط: DRAFT و POSTED",
            "كل قيد يحمل: sourceType وsourceId للمصدر",
          ].map((rule, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted/30">
              <CheckCircle size={14} className="text-primary mt-0.5 shrink-0" />
              <span className="text-sm">{rule}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
