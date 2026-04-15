import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import { Search, Eye, TrendingDown, DollarSign, AlertCircle } from "lucide-react";

const sourceTypeLabels: Record<string, string> = {
  AGENT_TRIP: "رحلة وكيل شحن",
  AGENT_EXTRA_FEE: "رسوم إضافية وكيل",
  CUSTOMS_PAYMENT: "سداد رسوم جمركية",
  FIELD_ADVANCE: "سلفة ميدانية / سائق",
  OTHER_ON_BEHALF_COST: "تكلفة بالنيابة متنوعة",
};

const statusColors: Record<string, string> = {
  UNALLOCATED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  PARTIALLY_ALLOCATED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  FULLY_ALLOCATED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED: "bg-muted text-muted-foreground",
};
const statusLabels: Record<string, string> = {
  UNALLOCATED: "غير مخصص",
  PARTIALLY_ALLOCATED: "مخصص جزئياً",
  FULLY_ALLOCATED: "مخصص بالكامل",
  CANCELLED: "ملغى",
};

interface CostSource {
  id: string; sourceType: string; sourceTypeLabel?: string;
  sourceNumber: string; date: string; description?: string;
  agentNameAr?: string; operationRef?: string;
  totalAmount: string; allocatedAmount: string; remainingAmount: string;
  status: string; statusLabel?: string;
}
interface Summary {
  totalAmount: string; totalAllocated: string; totalRemaining: string;
}

export default function CostSources() {
  const [data, setData] = useState<{ data: CostSource[]; pagination: any; summary?: Summary } | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<CostSource | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api("/cost-sources").get({
        page, limit: 20,
        search: search || undefined,
        status: statusFilter || undefined,
        sourceType: typeFilter || undefined,
      } as any);
      setData(res as any);
    } catch {} finally { setIsLoading(false); }
  }, [page, search, statusFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const fmt = (v: string) => Number(v ?? 0).toLocaleString("ar-SA", { minimumFractionDigits: 2 });

  const summary = data?.summary;

  const columns = [
    { key: "sourceNumber", headerAr: "رقم المصدر", render: (r: CostSource) => <span className="font-mono text-xs text-primary font-bold">{r.sourceNumber}</span> },
    { key: "date", headerAr: "التاريخ", render: (r: CostSource) => <span className="text-xs">{r.date}</span> },
    { key: "sourceType", headerAr: "نوع المصدر", render: (r: CostSource) => (
      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{r.sourceTypeLabel ?? sourceTypeLabels[r.sourceType] ?? r.sourceType}</span>
    )},
    { key: "agentNameAr", headerAr: "الوكيل", render: (r: CostSource) => <span className="text-xs text-muted-foreground">{r.agentNameAr ?? "—"}</span> },
    { key: "operationRef", headerAr: "مرجع العملية", render: (r: CostSource) => <span className="text-xs text-muted-foreground">{r.operationRef ?? "—"}</span> },
    { key: "totalAmount", headerAr: "المبلغ الإجمالي", render: (r: CostSource) => <span className="font-semibold text-sm ltr text-left block">{fmt(r.totalAmount)} ر.س</span> },
    { key: "allocatedAmount", headerAr: "المخصص", render: (r: CostSource) => <span className="text-sm ltr text-left block text-green-600 dark:text-green-400">{fmt(r.allocatedAmount)} ر.س</span> },
    { key: "remainingAmount", headerAr: "المتبقي غير المخصص", render: (r: CostSource) => (
      <span className={`font-bold text-sm ltr text-left block ${Number(r.remainingAmount) > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
        {fmt(r.remainingAmount)} ر.س
      </span>
    )},
    { key: "status", headerAr: "الحالة", render: (r: CostSource) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[r.status] ?? ""}`}>
        {statusLabels[r.status] ?? r.status}
      </span>
    )},
    { key: "actions", headerAr: "", render: (r: CostSource) => (
      <button onClick={e => { e.stopPropagation(); setSelected(r); }}
        className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
        <Eye size={13} />
      </button>
    )},
  ];

  return (
    <div dir="rtl">
      <PageHeader
        titleAr="مصادر التكاليف"
        subtitleAr="مجموعة التكاليف القابلة للاسترداد — تتبع الأرصدة غير المخصصة الجاهزة للتوزيع على الفواتير"
      />

      {summary && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-primary" />
              <span className="text-xs text-muted-foreground">إجمالي التكاليف المسجلة</span>
            </div>
            <p className="text-lg font-bold ltr">{fmt(summary.totalAmount)} ر.س</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={16} className="text-green-500" />
              <span className="text-xs text-muted-foreground">المخصص للفواتير</span>
            </div>
            <p className="text-lg font-bold text-green-600 dark:text-green-400 ltr">{fmt(summary.totalAllocated)} ر.س</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={16} className="text-amber-500" />
              <span className="text-xs text-muted-foreground">المتبقي غير المخصص</span>
            </div>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400 ltr">{fmt(summary.totalRemaining)} ر.س</p>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="بحث بالرقم أو المرجع..."
            className="w-full pr-9 pl-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">كل الأنواع</option>
          {Object.entries(sourceTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">كل الحالات</option>
          <option value="UNALLOCATED">غير مخصص</option>
          <option value="PARTIALLY_ALLOCATED">مخصص جزئياً</option>
          <option value="FULLY_ALLOCATED">مخصص بالكامل</option>
        </select>
      </div>

      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading}
        pagination={{ page, total: data?.pagination?.total ?? 0, limit: 20, onPageChange: setPage }} />

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-bold">تفاصيل مصدر التكلفة</h2>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">رقم المصدر</span><span className="font-mono font-bold text-primary">{selected.sourceNumber}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">النوع</span><span>{sourceTypeLabels[selected.sourceType] ?? selected.sourceType}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">التاريخ</span><span>{selected.date}</span></div>
              {selected.agentNameAr && <div className="flex justify-between"><span className="text-muted-foreground">الوكيل</span><span>{selected.agentNameAr}</span></div>}
              {selected.operationRef && <div className="flex justify-between"><span className="text-muted-foreground">مرجع العملية</span><span>{selected.operationRef}</span></div>}
              {selected.description && <div className="flex justify-between"><span className="text-muted-foreground">البيان</span><span className="text-left max-w-[200px]">{selected.description}</span></div>}
              <hr className="border-border" />
              <div className="flex justify-between"><span className="text-muted-foreground">المبلغ الإجمالي</span><span className="font-bold ltr">{fmt(selected.totalAmount)} ر.س</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">المخصص</span><span className="text-green-600 font-semibold ltr">{fmt(selected.allocatedAmount)} ر.س</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">المتبقي</span>
                <span className={`font-bold ltr ${Number(selected.remainingAmount) > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                  {fmt(selected.remainingAmount)} ر.س
                </span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">الحالة</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[selected.status] ?? ""}`}>{statusLabels[selected.status] ?? selected.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
