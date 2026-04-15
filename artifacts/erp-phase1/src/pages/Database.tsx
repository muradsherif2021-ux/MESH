import { useState } from "react";
import { dbTables } from "../data/database";
import { Database, ChevronDown, ChevronUp, Info } from "lucide-react";

const moduleLabels: Record<string, { ar: string; color: string; bg: string }> = {
  platform: { ar: "النظام الأساسي", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-900/40" },
  masterdata: { ar: "البيانات الأساسية", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
  operations: { ar: "العمليات", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  costallocation: { ar: "تخصيص التكاليف", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30" },
  sales: { ar: "المبيعات", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30" },
  treasury: { ar: "الخزينة", color: "text-yellow-600 dark:text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
  accounting: { ar: "المحاسبة", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30" },
};

const modules = [...new Set(dbTables.map((t) => t.module))];

export default function DatabasePage() {
  const [activeModule, setActiveModule] = useState<string>("all");
  const [expandedTable, setExpandedTable] = useState<string | null>(null);

  const filtered = activeModule === "all" ? dbTables : dbTables.filter((t) => t.module === activeModule);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold mb-1">قاعدة البيانات — ERD</h1>
        <p className="text-muted-foreground text-sm">
          {dbTables.length} جدول مع الحقول والمفاتيح الأجنبية والقيود والفهارس
        </p>
      </div>

      {/* Module filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveModule("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeModule === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          الكل ({dbTables.length})
        </button>
        {modules.map((mod) => (
          <button
            key={mod}
            onClick={() => setActiveModule(mod)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeModule === mod
                ? `bg-primary text-primary-foreground`
                : `${moduleLabels[mod]?.bg} ${moduleLabels[mod]?.color} hover:opacity-80`
            }`}
          >
            {moduleLabels[mod]?.ar} ({dbTables.filter((t) => t.module === mod).length})
          </button>
        ))}
      </div>

      {/* Tables */}
      <div className="space-y-3">
        {filtered.map((table) => {
          const expanded = expandedTable === table.name;
          const meta = moduleLabels[table.module];
          return (
            <div key={table.name} className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-5 py-4 text-right hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedTable(expanded ? null : table.name)}
                data-testid={`table-${table.name}`}
              >
                <Database size={16} className={meta?.color} />
                <div className="flex-1 text-right">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base font-mono ltr">{table.name}</span>
                    <span className="text-muted-foreground text-sm">— {table.nameAr}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {table.fields.length} حقل
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${meta?.bg} ${meta?.color} font-medium`}>
                  {meta?.ar}
                </span>
                {expanded ? <ChevronUp size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
              </button>

              {expanded && (
                <div className="border-t border-border">
                  {table.notes && (
                    <div className="mx-5 mt-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                      <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-amber-700 dark:text-amber-400">{table.notes}</p>
                    </div>
                  )}

                  {/* Fields table */}
                  <div className="p-5">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">الحقول</div>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-sm" dir="ltr">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border">
                            <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs">Column</th>
                            <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs">Type / Constraint</th>
                            <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs">Nullable</th>
                            <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {table.fields.map((field, i) => (
                            <tr key={field.name} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                              <td className="px-4 py-2 font-mono text-xs font-semibold text-primary">{field.name}</td>
                              <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{field.type}</td>
                              <td className="px-4 py-2 text-xs">
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${field.nullable ? "bg-muted text-muted-foreground" : "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"}`}>
                                  {field.nullable ? "NULL" : "NOT NULL"}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-xs text-muted-foreground" dir="rtl">{field.notes ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Constraints & Indexes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {table.indexes.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">الفهارس</div>
                          <div className="space-y-1">
                            {table.indexes.map((idx) => (
                              <div key={idx} className="font-mono text-xs bg-muted px-2 py-1 rounded ltr">{idx}</div>
                            ))}
                          </div>
                        </div>
                      )}
                      {table.constraints.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">القيود</div>
                          <div className="space-y-1">
                            {table.constraints.map((c) => (
                              <div key={c} className="font-mono text-xs bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 px-2 py-1 rounded ltr">{c}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
