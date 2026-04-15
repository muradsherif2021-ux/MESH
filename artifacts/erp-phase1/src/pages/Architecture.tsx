import { boundedContexts } from "../data/architecture";
import { ArrowLeft } from "lucide-react";

const depColors: Record<string, string> = {
  platform: "border-slate-400 text-slate-600 dark:text-slate-400",
  masterdata: "border-blue-400 text-blue-600 dark:text-blue-400",
  operations: "border-emerald-400 text-emerald-600 dark:text-emerald-400",
  costallocation: "border-orange-400 text-orange-600 dark:text-orange-400",
  sales: "border-violet-400 text-violet-600 dark:text-violet-400",
  treasury: "border-yellow-400 text-yellow-600 dark:text-yellow-500",
  accounting: "border-red-400 text-red-600 dark:text-red-400",
  reporting: "border-pink-400 text-pink-600 dark:text-pink-400",
};

const moduleColors: Record<string, string> = {
  platform: "bg-slate-500",
  masterdata: "bg-blue-600",
  operations: "bg-emerald-600",
  costallocation: "bg-orange-600",
  sales: "bg-violet-600",
  treasury: "bg-yellow-600",
  accounting: "bg-red-600",
  reporting: "bg-pink-600",
};

export default function Architecture() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold mb-1">المعمارية والسياقات المحدودة</h1>
        <p className="text-muted-foreground text-sm">
          النظام مقسم إلى 8 سياقات محدودة (Bounded Contexts) بتبعيات واضحة وأحادية الاتجاه
        </p>
      </div>

      {/* Dependency rule */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-4">
        <div className="font-semibold text-amber-700 dark:text-amber-400 mb-1 text-sm">قاعدة التبعية</div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          <span className="font-mono bg-white dark:bg-card px-2 py-0.5 rounded border text-xs">Platform</span>
          <ArrowLeft size={14} />
          <span className="font-mono bg-white dark:bg-card px-2 py-0.5 rounded border text-xs">Master Data</span>
          <ArrowLeft size={14} />
          <span className="font-mono bg-white dark:bg-card px-2 py-0.5 rounded border text-xs">Operations</span>
          <ArrowLeft size={14} />
          <span className="font-mono bg-white dark:bg-card px-2 py-0.5 rounded border text-xs">Cost Allocation</span>
          <ArrowLeft size={14} />
          <span className="font-mono bg-white dark:bg-card px-2 py-0.5 rounded border text-xs">Sales / Treasury</span>
          <ArrowLeft size={14} />
          <span className="font-mono bg-white dark:bg-card px-2 py-0.5 rounded border text-xs">Accounting</span>
          <ArrowLeft size={14} />
          <span className="font-mono bg-white dark:bg-card px-2 py-0.5 rounded border text-xs">Reporting</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          التبعيات أحادية الاتجاه — لا تعتمد وحدة أعلى على وحدة أدنى في الهرم
        </p>
      </div>

      {/* Context cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {boundedContexts.map((ctx) => (
          <div
            key={ctx.id}
            className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow"
            data-testid={`ctx-${ctx.id}`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full ${moduleColors[ctx.id]}`} />
              <div>
                <div className="font-bold text-base">{ctx.nameAr}</div>
                <div className="text-xs text-muted-foreground">{ctx.nameEn}</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{ctx.description}</p>

            <div className="mb-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">الوحدات</div>
              <div className="space-y-1">
                {ctx.modules.map((mod) => (
                  <div key={mod} className="flex items-center gap-2 text-sm">
                    <div className={`w-1.5 h-1.5 rounded-full ${moduleColors[ctx.id]} shrink-0`} />
                    <span>{mod}</span>
                  </div>
                ))}
              </div>
            </div>

            {ctx.dependencies.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">يعتمد على</div>
                <div className="flex flex-wrap gap-1.5">
                  {ctx.dependencies.map((dep) => (
                    <span
                      key={dep}
                      className={`text-xs border px-2 py-0.5 rounded-full font-medium ${depColors[dep]}`}
                    >
                      {boundedContexts.find((c) => c.id === dep)?.nameAr}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
