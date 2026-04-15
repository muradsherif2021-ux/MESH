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
const typeLabels: Record<string, string> = { COMPANY: "شركة", INDIVIDUAL: "فرد", GOVERNMENT: "جهة حكومية" };

interface Customer {
  id: string; code: string; nameAr: string; nameEn?: string;
  type: string; vatNumber?: string; crNumber?: string;
  contactPerson?: string; phone?: string; email?: string;
  address?: string; city?: string; paymentTerms: string; status: string;
}

interface FormData {
  code: string; nameAr: string; nameEn?: string; type: string;
  vatNumber?: string; crNumber?: string; contactPerson?: string;
  phone?: string; email?: string; address?: string; city?: string;
  paymentTerms: string; status?: string; notes?: string;
}

export default function Customers() {
  const [data, setData] = useState<{ data: Customer[]; pagination: any } | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>();

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api("/customers").get({ page, limit: 20, search: search || undefined } as any);
      setData(res as any);
    } catch {} finally { setIsLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); reset({ type: "COMPANY", paymentTerms: "CASH", status: "ACTIVE" }); setError(""); setModalOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); reset({ ...c } as any); setError(""); setModalOpen(true); };

  const onSubmit = async (values: FormData) => {
    setSaving(true); setError("");
    try {
      if (editing) await api(`/customers/${editing.id}`).put(values);
      else await api("/customers").post(values);
      setModalOpen(false); load();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const columns = [
    { key: "code", headerAr: "الكود", render: (r: Customer) => <span className="font-mono text-xs text-primary font-bold">{r.code}</span> },
    { key: "nameAr", headerAr: "الاسم" },
    { key: "type", headerAr: "النوع", render: (r: Customer) => <span className="text-xs">{typeLabels[r.type]}</span> },
    { key: "phone", headerAr: "الهاتف", render: (r: Customer) => <span className="ltr text-xs">{r.phone ?? "—"}</span> },
    { key: "paymentTerms", headerAr: "شروط الدفع", render: (r: Customer) => <span className="text-xs">{paymentTermsLabels[r.paymentTerms]}</span> },
    { key: "status", headerAr: "الحالة", render: (r: Customer) => <StatusBadge status={r.status} /> },
    { key: "actions", headerAr: "", render: (r: Customer) => (
      <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
        <Pencil size={13} />
      </button>
    )},
  ];

  return (
    <div dir="rtl">
      <PageHeader
        titleAr="العملاء"
        subtitleAr="إدارة بيانات العملاء الأساسية"
        action={
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus size={15} /> إضافة عميل
          </button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="بحث بالاسم أو الكود..."
            className="w-full pr-9 pl-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <DataTable
        columns={columns} data={data?.data ?? []} pagination={data?.pagination}
        onPageChange={setPage} isLoading={isLoading} emptyMessageAr="لا يوجد عملاء بعد"
      />

      {modalOpen && (
        <Modal titleAr={editing ? "تعديل عميل" : "إضافة عميل جديد"} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="الكود *"><input {...register("code", { required: true })} className={inputCls} /></FormField>
              <FormField label="النوع *">
                <select {...register("type")} className={inputCls}>
                  <option value="COMPANY">شركة</option>
                  <option value="INDIVIDUAL">فرد</option>
                  <option value="GOVERNMENT">جهة حكومية</option>
                </select>
              </FormField>
            </div>
            <FormField label="الاسم بالعربي *"><input {...register("nameAr", { required: true })} className={inputCls} /></FormField>
            <FormField label="الاسم بالإنجليزي"><input {...register("nameEn")} className={inputCls} /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="الرقم الضريبي"><input {...register("vatNumber")} className={inputCls} /></FormField>
              <FormField label="السجل التجاري"><input {...register("crNumber")} className={inputCls} /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="الهاتف"><input {...register("phone")} className={inputCls} /></FormField>
              <FormField label="البريد الإلكتروني"><input {...register("email")} type="email" className={inputCls} /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="المدينة"><input {...register("city")} className={inputCls} /></FormField>
              <FormField label="شروط الدفع">
                <select {...register("paymentTerms")} className={inputCls}>
                  {Object.entries(paymentTermsLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="العنوان"><input {...register("address")} className={inputCls} /></FormField>
            <FormField label="الشخص المسؤول"><input {...register("contactPerson")} className={inputCls} /></FormField>
            {editing && (
              <FormField label="الحالة">
                <select {...register("status")} className={inputCls}>
                  <option value="ACTIVE">نشط</option>
                  <option value="INACTIVE">غير نشط</option>
                  <option value="ARCHIVED">مؤرشف</option>
                </select>
              </FormField>
            )}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-muted">إلغاء</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-60">
                {saving && <Loader2 size={14} className="animate-spin" />} حفظ
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ titleAr, onClose, children }: { titleAr: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold text-base">{titleAr}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring";
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}
