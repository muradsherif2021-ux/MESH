import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Plus, Pencil, CheckCircle, XCircle, Search, Loader2, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";

const paymentMethodLabels: Record<string, string> = {
  CREDIT: "آجل", CASH: "نقداً", BANK_TRANSFER: "تحويل بنكي", CHEQUE: "شيك",
};

interface Agent { id: string; nameAr: string; code: string; }
interface AgentTripCharge {
  id: string; number: string; agentId: string; agentNameAr?: string; agentCode?: string;
  date: string; description: string; operationRef?: string;
  totalAmount: string; paymentMethod: string; dueDate?: string; status: string;
  notes?: string; postedAt?: string;
}
interface FormData {
  agentId: string; date: string; description: string; operationRef?: string;
  totalAmount: string; paymentMethod: string; dueDate?: string;
  branchId?: string; notes?: string;
}

export default function AgentTripCharges() {
  const { hasPermission } = useAuth();
  const [data, setData] = useState<{ data: AgentTripCharge[]; pagination: any } | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AgentTripCharge | null>(null);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api("/agent-trip-charges").get({ page, limit: 20, search: search || undefined, status: statusFilter || undefined } as any);
      setData(res as any);
    } catch {} finally { setIsLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api("/agents").get({ limit: 200 } as any).then(r => setAgents((r as any).data ?? [])).catch(() => {});
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const openCreate = () => { setEditing(null); reset({ date: today, paymentMethod: "CREDIT" }); setError(""); setModalOpen(true); };
  const openEdit = (r: AgentTripCharge) => { setEditing(r); reset({ ...r } as any); setError(""); setModalOpen(true); };

  const onSubmit = async (values: FormData) => {
    setSaving(true); setError("");
    try {
      if (editing) await api(`/agent-trip-charges/${editing.id}`).put(values);
      else await api("/agent-trip-charges").post(values);
      setModalOpen(false); load();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const handlePost = async (id: string) => {
    if (!confirm("هل تريد تأكيد وترحيل هذا السجل؟ لن يمكن التعديل بعد الترحيل.")) return;
    setPosting(id);
    try {
      await api(`/agent-trip-charges/${id}/post`).post({});
      load();
    } catch (err: any) { alert(err.message); } finally { setPosting(null); }
  };

  const columns = [
    { key: "number", headerAr: "الرقم", render: (r: AgentTripCharge) => <span className="font-mono text-xs text-primary font-bold">{r.number}</span> },
    { key: "date", headerAr: "التاريخ", render: (r: AgentTripCharge) => <span className="text-xs">{r.date}</span> },
    { key: "agentNameAr", headerAr: "وكيل الشحن", render: (r: AgentTripCharge) => <span className="text-sm">{r.agentNameAr ?? "—"}</span> },
    { key: "description", headerAr: "البيان", render: (r: AgentTripCharge) => <span className="text-sm truncate max-w-[180px] block">{r.description}</span> },
    { key: "operationRef", headerAr: "مرجع العملية", render: (r: AgentTripCharge) => <span className="text-xs text-muted-foreground">{r.operationRef ?? "—"}</span> },
    { key: "totalAmount", headerAr: "المبلغ", render: (r: AgentTripCharge) => <span className="font-semibold text-sm ltr">{Number(r.totalAmount).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span> },
    { key: "paymentMethod", headerAr: "طريقة الدفع", render: (r: AgentTripCharge) => <span className="text-xs">{paymentMethodLabels[r.paymentMethod]}</span> },
    { key: "status", headerAr: "الحالة", render: (r: AgentTripCharge) => <StatusBadge status={r.status} /> },
    { key: "actions", headerAr: "", render: (r: AgentTripCharge) => (
      <div className="flex items-center gap-1">
        {r.status === "DRAFT" && hasPermission("agent_trip_charges", "edit") && (
          <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground" title="تعديل">
            <Pencil size={13} />
          </button>
        )}
        {r.status === "DRAFT" && hasPermission("agent_trip_charges", "post") && (
          <button onClick={(e) => { e.stopPropagation(); handlePost(r.id); }} disabled={posting === r.id}
            className="p-1.5 hover:bg-green-500/10 rounded text-green-600 hover:text-green-700" title="ترحيل">
            {posting === r.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div dir="rtl">
      <PageHeader
        titleAr="رسوم رحلات وكلاء الشحن"
        subtitleAr="تسجيل رسوم رحلات وكلاء الشحن — تدخل مباشرة في مجموعة التكاليف القابلة للاسترداد"
        action={hasPermission("agent_trip_charges", "create") ? (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus size={15} /> إضافة سجل
          </button>
        ) : undefined}
      />

      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="بحث بالرقم أو البيان..."
            className="w-full pr-9 pl-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">كل الحالات</option>
          <option value="DRAFT">مسودة</option>
          <option value="CONFIRMED">محوّل</option>
          <option value="CANCELLED">ملغى</option>
        </select>
      </div>

      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading}
        pagination={{ page, total: data?.pagination?.total ?? 0, limit: 20, onPageChange: setPage }} />

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-border">
              <h2 className="text-base font-bold">{editing ? "تعديل رسوم رحلة" : "إضافة رسوم رحلة وكيل شحن"}</h2>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">وكيل الشحن <span className="text-red-500">*</span></label>
                  <select {...register("agentId", { required: true })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">اختر وكيل الشحن</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.nameAr}</option>)}
                  </select>
                  {errors.agentId && <p className="text-red-500 text-xs mt-1">مطلوب</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">التاريخ <span className="text-red-500">*</span></label>
                  <input type="date" {...register("date", { required: true })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">البيان <span className="text-red-500">*</span></label>
                  <input type="text" {...register("description", { required: true })} placeholder="وصف الرحلة..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">المبلغ الإجمالي <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" min="0.01" {...register("totalAmount", { required: true })} placeholder="0.00"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring ltr" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">طريقة الدفع</label>
                  <select {...register("paymentMethod")}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="CREDIT">آجل</option>
                    <option value="CASH">نقداً</option>
                    <option value="BANK_TRANSFER">تحويل بنكي</option>
                    <option value="CHEQUE">شيك</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">مرجع العملية</label>
                  <input type="text" {...register("operationRef")} placeholder="رقم الملف / الإيصال..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">تاريخ الاستحقاق</label>
                  <input type="date" {...register("dueDate")}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">ملاحظات</label>
                  <textarea rows={2} {...register("notes")} placeholder="ملاحظات اختيارية..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                </div>
              </div>
              {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-input hover:bg-muted">إلغاء</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 size={13} className="animate-spin" />} حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
