import { domainEntities } from "../data/architecture";
import { Shield, AlertCircle } from "lucide-react";

const moduleLabels: Record<string, { ar: string; color: string }> = {
  platform: { ar: "النظام الأساسي", color: "bg-slate-500" },
  masterdata: { ar: "البيانات الأساسية", color: "bg-blue-600" },
  operations: { ar: "العمليات", color: "bg-emerald-600" },
  costallocation: { ar: "تخصيص التكاليف", color: "bg-orange-600" },
  sales: { ar: "المبيعات", color: "bg-violet-600" },
  accounting: { ar: "المحاسبة", color: "bg-red-600" },
};

const typeLabels: Record<string, { ar: string; color: string }> = {
  "aggregate-root": { ar: "جذر المجمع", color: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
  aggregate: { ar: "مجمع", color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
  entity: { ar: "كيان", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
};

export default function DomainModel() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold mb-1">النموذج المجالي</h1>
        <p className="text-muted-foreground text-sm">
          الكيانات الرئيسية ومجاميع النطاق (Aggregates) والقواعد الثابتة (Invariants)
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(typeLabels).map(([type, meta]) => (
          <div key={type} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${meta.color}`}>
            <Shield size={12} />
            {meta.ar}
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {domainEntities.map((entity) => (
          <div
            key={entity.nameEn}
            className="rounded-xl border border-border bg-card overflow-hidden"
            data-testid={`entity-${entity.nameEn.toLowerCase().replace(/\s/g, "-")}`}
          >
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/30">
              <div className={`w-2.5 h-2.5 rounded-full ${moduleLabels[entity.module].color}`} />
              <div>
                <span className="font-bold text-base">{entity.nameAr}</span>
                <span className="text-muted-foreground text-sm mr-2">— {entity.nameEn}</span>
              </div>
              <div className="mr-auto flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeLabels[entity.type]?.color}`}>
                  {typeLabels[entity.type]?.ar}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {moduleLabels[entity.module].ar}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x-reverse md:divide-x border-0">
              {/* Fields */}
              <div className="p-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">الحقول</div>
                <div className="space-y-1.5">
                  {entity.fields.map((field) => (
                    <div key={field} className="flex items-start gap-2 text-xs">
                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0 leading-relaxed ltr">
                        {field.split(" ")[0]}
                      </span>
                      <span className="text-muted-foreground leading-relaxed ltr text-xs">
                        {field.split(" ").slice(1).join(" ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Invariants */}
              <div className="p-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  القواعد الثابتة (Invariants)
                </div>
                <div className="space-y-2">
                  {entity.invariants.map((inv, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertCircle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-foreground">{inv}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
