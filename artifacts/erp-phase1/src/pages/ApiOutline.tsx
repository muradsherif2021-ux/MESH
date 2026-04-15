import { useState } from "react";
import { apiModules } from "../data/apiOutline";
import { Globe, ChevronDown, ChevronUp, Lock } from "lucide-react";

const methodColors: Record<string, string> = {
  GET: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  POST: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  PUT: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  PATCH: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-500",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
};

const typeColors: Record<string, string> = {
  query: "bg-slate-100 text-slate-600 dark:bg-slate-900/40 dark:text-slate-400",
  command: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
  posting: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
  reversal: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
};

const typeLabels: Record<string, string> = {
  query: "استعلام",
  command: "أمر",
  posting: "ترحيل",
  reversal: "عكس",
};

export default function ApiOutline() {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  const totalEndpoints = apiModules.reduce((acc, mod) => acc + mod.endpoints.length, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold mb-1">مخطط API</h1>
        <p className="text-muted-foreground text-sm">
          {apiModules.length} وحدات بإجمالي {totalEndpoints} نقطة نهاية — منظمة حسب المجال والعملية
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(typeLabels).map(([type, label]) => (
          <span key={type} className={`text-xs px-2.5 py-1 rounded-full font-medium ${typeColors[type]}`}>
            {label}
          </span>
        ))}
        {Object.entries(methodColors).map(([method, color]) => (
          <span key={method} className={`text-xs px-2.5 py-1 rounded-full font-medium font-mono ${color}`}>
            {method}
          </span>
        ))}
      </div>

      {/* Modules */}
      <div className="space-y-3">
        {apiModules.map((mod) => {
          const expanded = expandedModule === mod.moduleEn;
          return (
            <div key={mod.moduleEn} className="rounded-xl border border-border bg-card overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-5 py-4 text-right hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedModule(expanded ? null : mod.moduleEn)}
                data-testid={`api-module-${mod.moduleEn.toLowerCase().replace(/\s/g, "-")}`}
              >
                <Globe size={18} className="text-primary shrink-0" />
                <div className="flex-1 text-right">
                  <div className="font-bold text-base">{mod.moduleAr}</div>
                  <div className="text-xs text-muted-foreground font-mono">{mod.basePath}</div>
                </div>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {mod.endpoints.length} نقطة نهاية
                </span>
                {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
              </button>

              {expanded && (
                <div className="border-t border-border">
                  <table className="w-full text-sm" dir="ltr">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border">
                        <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs w-16">Method</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs">Path</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs">Operation ID</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground text-xs" dir="rtl">الوصف</th>
                        <th className="text-center px-4 py-2.5 font-semibold text-muted-foreground text-xs w-20">النوع</th>
                        <th className="text-center px-4 py-2.5 font-semibold text-muted-foreground text-xs w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {mod.endpoints.map((ep, i) => (
                        <tr
                          key={ep.operationId}
                          className={`border-b border-border/50 last:border-0 ${i % 2 === 0 ? "bg-background" : "bg-muted/10"}`}
                          data-testid={`endpoint-${ep.operationId}`}
                        >
                          <td className="px-4 py-2.5">
                            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${methodColors[ep.method]}`}>
                              {ep.method}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                            {mod.basePath}{ep.path}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-primary">{ep.operationId}</td>
                          <td className="px-4 py-2.5 text-xs" dir="rtl">{ep.descriptionAr}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeColors[ep.type]}`}>
                              {typeLabels[ep.type]}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {ep.requiresPermission && (
                              <Lock size={12} className="mx-auto text-amber-500" title={ep.requiresPermission} />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
