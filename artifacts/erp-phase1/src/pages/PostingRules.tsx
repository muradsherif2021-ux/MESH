import { postingRules } from "../data/postingRules";
import { ArrowLeftRight, CheckCircle, AlertTriangle } from "lucide-react";

const categoryColors: Record<string, string> = {
  operations: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  sales: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
  treasury: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-600",
  accounting: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
};

const categoryLabels: Record<string, string> = {
  operations: "العمليات",
  sales: "المبيعات",
  treasury: "الخزينة",
  accounting: "المحاسبة",
};

export default function PostingRules() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold mb-1">مصفوفة قواعد الترحيل المحاسبي</h1>
        <p className="text-muted-foreground text-sm">
          لكل حدث تجاري: الحساب المدين، الحساب الدائن، توقيت الترحيل، وقواعد التحقق
        </p>
      </div>

      {/* Category filter legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(categoryLabels).map(([cat, label]) => (
          <span key={cat} className={`text-xs px-3 py-1.5 rounded-full font-medium ${categoryColors[cat]}`}>
            {label}
          </span>
        ))}
      </div>

      <div className="space-y-4">
        {postingRules.map((rule) => (
          <div
            key={rule.id}
            className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
            data-testid={`posting-rule-${rule.id}`}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/20">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                {rule.id}
              </div>
              <div className="flex-1">
                <div className="font-bold text-base">{rule.eventNameAr}</div>
                <div className="text-xs text-muted-foreground">{rule.eventNameEn}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColors[rule.category]}`}>
                  {categoryLabels[rule.category]}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
                  {rule.journalType}
                </span>
                {rule.vatApplicable && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-medium">
                    + ضريبة
                  </span>
                )}
              </div>
            </div>

            {/* Accounting entry */}
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Debit */}
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowLeftRight size={14} className="text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">مدين (DR)</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{rule.debitAccount}</p>
                </div>

                {/* Credit */}
                <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowLeftRight size={14} className="text-red-600 dark:text-red-400" />
                    <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">دائن (CR)</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{rule.creditAccount}</p>
                </div>
              </div>

              {/* Timing */}
              <div className="mb-4 p-3 rounded-lg bg-muted/50 flex items-start gap-2">
                <CheckCircle size={14} className="text-primary mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-muted-foreground ml-2">توقيت الترحيل:</span>
                  <span className="text-sm">{rule.postingTiming}</span>
                </div>
              </div>

              {/* Validations */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">قواعد التحقق</div>
                <div className="space-y-1.5">
                  {rule.validations.map((v, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-foreground">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {rule.notes && (
                <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 text-sm text-amber-700 dark:text-amber-400">
                  <span className="font-semibold">ملاحظة: </span>{rule.notes}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
