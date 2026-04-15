import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import { Search } from "lucide-react";

interface AuditLog {
  id: string; module: string; action: string; entityType: string; entityId?: string;
  description: string; userId?: string; userName?: string; ipAddress?: string; createdAt: string;
}

const actionColors: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  UPDATE: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  LOGIN: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400",
  LOGOUT: "bg-slate-100 text-slate-600 dark:bg-slate-900/40 dark:text-slate-400",
  POST: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  REVERSE: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  VIEW: "bg-slate-100 text-slate-600 dark:bg-slate-900/40 dark:text-slate-400",
};

export default function AuditLogs() {
  const [data, setData] = useState<{ data: AuditLog[]; pagination: any } | null>(null);
  const [page, setPage] = useState(1);
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api("/audit-logs").get({ page, limit: 30, module: module || undefined, action: action || undefined } as any);
      setData(res as any);
    } catch {} finally { setIsLoading(false); }
  }, [page, module, action]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    { key: "createdAt", headerAr: "التوقيت", render: (r: AuditLog) => (
      <div className="ltr text-xs text-muted-foreground whitespace-nowrap">
        {new Date(r.createdAt).toLocaleDateString("ar-SA")} {new Date(r.createdAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
      </div>
    )},
    { key: "action", headerAr: "الإجراء", render: (r: AuditLog) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${actionColors[r.action] ?? "bg-muted text-muted-foreground"}`}>{r.action}</span>
    )},
    { key: "module", headerAr: "الوحدة", render: (r: AuditLog) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.module}</code> },
    { key: "description", headerAr: "الوصف", render: (r: AuditLog) => <span className="text-sm">{r.description}</span> },
    { key: "userName", headerAr: "المستخدم", render: (r: AuditLog) => <span className="text-xs text-muted-foreground">{r.userName ?? "—"}</span> },
    { key: "ipAddress", headerAr: "IP", render: (r: AuditLog) => <span className="ltr text-xs text-muted-foreground">{r.ipAddress ?? "—"}</span> },
  ];

  const modules = ["users", "roles", "branches", "settings", "customers", "agents", "treasuries", "bank_accounts", "charge_types", "accounts", "fiscal_years"];
  const actions = ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "POST", "REVERSE"];

  return (
    <div dir="rtl">
      <PageHeader titleAr="سجل الأحداث" subtitleAr="مسار تدقيق كامل لجميع عمليات النظام" />
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <select value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">— كل الوحدات —</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">— كل الإجراءات —</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">
          {data?.pagination?.total ? `${data.pagination.total} سجل` : ""}
        </span>
      </div>
      <DataTable
        columns={columns} data={data?.data ?? []} pagination={data?.pagination}
        onPageChange={setPage} isLoading={isLoading} emptyMessageAr="لا توجد سجلات بعد"
      />
    </div>
  );
}
