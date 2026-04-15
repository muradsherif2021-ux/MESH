import { risks, designDecisions } from "../data/roadmap";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";

const severityConfig: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: "مرتفع", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-950/40" },
  medium: { label: "متوسط", color: "text-yellow-600 dark:text-yellow-500", bg: "bg-yellow-100 dark:bg-yellow-950/40" },
  low: { label: "منخفض", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950/40" },
};

const doNotList = [
  "بناء دفتر أستاذ بسيط بحقل واحد للمدين وحقل واحد للدائن",
  "استخدام أسماء بنود نصية حرة لتحديد المعالجة المحاسبية",
  "تخصيص مصادر التكلفة المجمعة لعميل واحد افتراضياً",
  "ترحيل تكاليف العبور كمصروفات تشغيلية للشركة",
  "معالجة ضريبة القيمة المضافة كإيراد",
  "بناء التقارير المالية من الجداول التشغيلية مباشرة",
  "السماح بتعديل الفواتير أو القيود المرحّلة",
  "إجبار المستخدم على إنشاء ملف تخليص ثقيل قبل أي عمل يومي",
  "جعل التخصيص المتساوي هو المنطق الافتراضي",
  "خلط مبالغ العبور مع إيرادات الشركة في قائمة الدخل",
];

export default function Risks() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold mb-1">المخاطر والقرارات التصميمية</h1>
        <p className="text-muted-foreground text-sm">
          المخاطر المحددة مع استراتيجيات التخفيف — والقرارات المعمارية الموثقة مع مبرراتها
        </p>
      </div>

      {/* Do NOT list */}
      <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
          <h2 className="font-bold text-base text-red-700 dark:text-red-400">قائمة المحظورات الإلزامية</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {doNotList.map((item, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-red-100/60 dark:bg-red-950/30">
              <span className="text-red-500 text-lg leading-none mt-0.5 shrink-0">✕</span>
              <span className="text-sm text-red-700 dark:text-red-400">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Risks */}
      <div>
        <h2 className="font-bold text-base mb-4">تحليل المخاطر</h2>
        <div className="space-y-3">
          {risks.map((risk, i) => {
            const severity = severityConfig[risk.severity];
            return (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-5"
                data-testid={`risk-${i}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className={severity.color} />
                    <span className="font-bold text-base">{risk.risk}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${severity.bg} ${severity.color}`}>
                      {severity.label}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                      {risk.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                  <CheckCircle size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 ml-2">استراتيجية التخفيف:</span>
                    <span className="text-sm">{risk.mitigation}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Design Decisions */}
      <div>
        <h2 className="font-bold text-base mb-4">القرارات التصميمية الموثقة</h2>
        <div className="space-y-4">
          {designDecisions.map((dec, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-5"
              data-testid={`decision-${i}`}
            >
              <div className="flex items-start gap-2 mb-3">
                <Info size={16} className="text-primary mt-0.5 shrink-0" />
                <div className="font-bold text-base">{dec.decision}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1.5">السبب / المبرر</div>
                  <p className="text-sm text-foreground">{dec.reason}</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                  <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1.5">المقايضة (Trade-off)</div>
                  <p className="text-sm text-foreground">{dec.tradeoff}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
