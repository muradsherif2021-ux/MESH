import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Plus, Pencil, X, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

interface Branch { id: string; code: string; nameAr: string; nameEn?: string; phone?: string; city?: string; isActive: boolean; isMain: boolean; }

export default function Branches() {
  const [data, setData] = useState<{ data: Branch[]; pagination: any } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { register, handleSubmit, reset } = useForm<any>();

  const load = useCallback(async () => {
    setIsLoading(true);
    try { const res = await api("/branches").get({ limit: 50 } as any); setData(res as any); } catch {} finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); reset({ isActive: true }); setError(""); setModalOpen(true); };
  const openEdit = (b: Branch) => { setEditing(b); reset({ ...b }); setError(""); setModalOpen(true); };

  const onSubmit = async (values: any) => {
    setSaving(true); setError("");
    try {
      if (editing) await api(`/branches/${editing.id}`).put(values);
      else await api("/branches").post(values);
      setModalOpen(false); load();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring";
  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>{children}</div>
  );

  const columns = [
    { key: "code", headerAr: "الكود", render: (r: Branch) => <span className="font-mono text-xs font-bold text-primary">{r.code}</span> },
    { key: "nameAr", headerAr: "الاسم" },
    { key: "city", headerAr: "المدينة", render: (r: Branch) => <span className="text-sm">{r.city ?? "—"}</span> },
    { key: "phone", headerAr: "الهاتف", render: (r: Branch) => <span className="ltr text-xs">{r.phone ?? "—"}</span> },
    { key: "isMain", headerAr: "رئيسي", render: (r: Branch) => r.isMain ? <span className="text-xs bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">رئيسي</span> : null },
    { key: "isActive", headerAr: "الحالة", render: (r: Branch) => <StatusBadge status={r.isActive ? "ACTIVE" : "INACTIVE"} /> },
    { key: "actions", headerAr: "", render: (r: Branch) => (
      <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="p-1.5 hover:bg-muted rounded text-muted-foreground"><Pencil size={13} /></button>
    )},
  ];

  return (
    <div dir="rtl">
      <PageHeader titleAr="الفروع" subtitleAr="إدارة فروع الشركة"
        action={<button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"><Plus size={15} /> إضافة فرع</button>}
      />
      <DataTable columns={columns} data={data?.data ?? []} pagination={data?.pagination} isLoading={isLoading} emptyMessageAr="لا توجد فروع بعد" />
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-bold">{editing ? "تعديل فرع" : "إضافة فرع جديد"}</h3>
              <button onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <F label="الكود *"><input {...register("code", { required: true })} className={inputCls} /></F>
                <F label="المدينة"><input {...register("city")} className={inputCls} /></F>
              </div>
              <F label="الاسم بالعربي *"><input {...register("nameAr", { required: true })} className={inputCls} /></F>
              <F label="الاسم بالإنجليزي"><input {...register("nameEn")} className={inputCls} /></F>
              <div className="grid grid-cols-2 gap-3">
                <F label="الهاتف"><input {...register("phone")} className={inputCls} /></F>
                <F label="البريد الإلكتروني"><input {...register("email")} type="email" className={inputCls} /></F>
              </div>
              <F label="العنوان"><input {...register("address")} className={inputCls} /></F>
              {editing && <F label="الحالة"><select {...register("isActive")} className={inputCls}><option value="true">نشط</option><option value="false">غير نشط</option></select></F>}
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
