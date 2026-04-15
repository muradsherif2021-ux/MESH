const configs: Record<string, { labelAr: string; className: string }> = {
  ACTIVE: { labelAr: "نشط", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
  INACTIVE: { labelAr: "غير نشط", className: "bg-slate-100 text-slate-600 dark:bg-slate-900/40 dark:text-slate-400" },
  ARCHIVED: { labelAr: "مؤرشف", className: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  LOCKED: { labelAr: "مقفول", className: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
  OPEN: { labelAr: "مفتوح", className: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
  CLOSED: { labelAr: "مغلق", className: "bg-slate-100 text-slate-600 dark:bg-slate-900/40 dark:text-slate-400" },
  PASS_THROUGH: { labelAr: "عبور", className: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400" },
  REVENUE: { labelAr: "إيراد", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
  true: { labelAr: "نعم", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
  false: { labelAr: "لا", className: "bg-slate-100 text-slate-600 dark:bg-slate-900/40 dark:text-slate-400" },
};

export default function StatusBadge({ status }: { status: string | boolean }) {
  const key = String(status);
  const config = configs[key] ?? { labelAr: key, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.labelAr}
    </span>
  );
}
