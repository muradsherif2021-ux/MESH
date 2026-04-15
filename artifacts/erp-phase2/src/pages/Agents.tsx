import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Plus, Pencil, Search, X, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

const paymentTermsLabels: Record<string, string> = {
  CASH: "نقداً", CREDIT_7: "أجل 7 أيام", CREDIT_15: "أجل 15 يوم",
  CREDIT_30: "أجل 30 يوم", CREDIT_60: "أجل 60 يوم", CREDIT_90: "أجل 90 يوم",
};

interface Agent {
  id: string; code: string; nameAr: string; nameEn?: string;
  contactPerson?: string; phone?: string; email?: string;
  city?: string; paymentTerms: string; status: string;
}

export default function Agents() {
  const [data, setData] = useState<{ data: Agent[]; pagination: any } | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, reset } = useForm<any>();

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api("/agents").get({ page, limit: 20, search: search || undefined } as any);
      setData(res as any);
    } catch {} finally { setIsLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); reset({ paymentTerms: "CASH", status: "ACTIVE" }); setError(""); setModalOpen(true); };
  const openEdit = (a: Agent) => { setEditing(a); reset({ ...a }); setError(""); setModalOpen(true); };

  const onSubmit = async (values: any) => {
    setSaving(true); setError("");
    try {
      if (editing) await api(`/agents/${editing.id}`).put(values);
      else await api("/agents").post(values);
      setModalOpen(false); load();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const columns = [
    { key: "code", headerAr: "الكود", render: (r: Agent) => <span className="font-mono text-xs text-primary font-bold">{r.code}</span> },
    { key: "nameAr", headerAr: "الاسم" },
    { key: "contactPerson", headerAr: "الشخص المسؤول", render: (r: Agent) => <span className="text-sm">{r.contactPerson ?? "—"}</span> },
    { key: "phone", headerAr: "الهاتف", render: (r: Agent) => <span className="ltr text-xs">{r.phone ?? "—"}</span> },
    { key: "paymentTerms", headerAr: "الدفع", render: (r: Agent) => <span className="text-xs">{paymentTermsLabels[r.paymentTerms]}</span> },
    { key: "status", headerAr: "الحالة", render: (r: Agent) => <StatusBadge status={r.status} /> },
    { key: "actions", headerAr: "", render: (r: Agent) => (
      <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
        <Pencil size={13} />
      </button>
    )},
  ];

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring";
  function F({ label, children }: { label: string; children: React.ReactNode }) {
    return <div><label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>{children}</div>;
  }

  return (
    <div dir="rtl">
      <PageHeader titleAr="وكلاء الشحن" subtitleAr="إدارة بيانات وكلاء الشحن الأساسية"
        action={<button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"><Plus size={15} /> إضافة وكيل</button>}
      />
      <div className="mb-4">
        <div className="relative max-w-xs">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="بحث..."
            className="w-full pr-9 pl-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <DataTable columns={columns} data={data?.data ?? []} pagination={data?.pagination} onPageChange={setPage} isLoading={isLoading} emptyMessageAr="لا يوجد وكلاء بعد" />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-bold">{editing ? "تعديل وكيل" : "إضافة وكيل جديد"}</h3>
              <button onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <F label="الكود *"><input {...register("code", { required: true })} className={inputCls} /></F>
                <F label="شروط الدفع"><select {...register("paymentTerms")} className={inputCls}>{Object.entries(paymentTermsLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></F>
              </div>
              <F label="الاسم بالعربي *"><input {...register("nameAr", { required: true })} className={inputCls} /></F>
              <F label="الاسم بالإنجليزي"><input {...register("nameEn")} className={inputCls} /></F>
              <div className="grid grid-cols-2 gap-3">
                <F label="الشخص المسؤول"><input {...register("contactPerson")} className={inputCls} /></F>
                <F label="الهاتف"><input {...register("phone")} className={inputCls} /></F>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label="البريد الإلكتروني"><input {...register("email")} type="email" className={inputCls} /></F>
                <F label="المدينة"><input {...register("city")} className={inputCls} /></F>
              </div>
              <F label="العنوان"><input {...register("address")} className={inputCls} /></F>
              {editing && <F label="الحالة"><select {...register("status")} className={inputCls}><option value="ACTIVE">نشط</option><option value="INACTIVE">غير نشط</option><option value="ARCHIVED">مؤرشف</option></select></F>}
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-muted">إلغاء</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-60">
                  {saving && <Loader2 size={14} className="animate-spin" />} حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
