import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Plus, Pencil, X, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

interface BankAccount {
  id: string; code: string; nameAr: string; bankName: string; iban?: string;
  accountNumber?: string; currency: string; currentBalance: string; isActive: boolean;
}

export default function BankAccounts() {
  const [data, setData] = useState<{ data: BankAccount[]; pagination: any } | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { register, handleSubmit, reset } = useForm<any>();

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [res, accs] = await Promise.all([
        api("/bank-accounts").get({ limit: 50 } as any),
        api("/accounts").get({ limit: 200, allowPosting: true } as any),
      ]);
      setData(res as any);
      setAccounts((accs as any).data ?? []);
    } catch {} finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); reset({ currency: "SAR" }); setError(""); setModalOpen(true); };
  const openEdit = (b: BankAccount) => { setEditing(b); reset({ ...b }); setError(""); setModalOpen(true); };

  const onSubmit = async (values: any) => {
    setSaving(true); setError("");
    try {
      if (editing) await api(`/bank-accounts/${editing.id}`).put(values);
      else await api("/bank-accounts").post(values);
      setModalOpen(false); load();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring";
  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>{children}</div>
  );

  const columns = [
    { key: "code", headerAr: "الكود", render: (r: BankAccount) => <span className="font-mono text-xs font-bold text-primary">{r.code}</span> },
    { key: "nameAr", headerAr: "الاسم" },
    { key: "bankName", headerAr: "اسم البنك" },
    { key: "iban", headerAr: "رقم IBAN", render: (r: BankAccount) => <span className="ltr font-mono text-xs">{r.iban ?? "—"}</span> },
    { key: "currency", headerAr: "العملة", render: (r: BankAccount) => <span className="text-xs font-mono font-bold">{r.currency}</span> },
    { key: "currentBalance", headerAr: "الرصيد", render: (r: BankAccount) => (
      <span className={`font-mono text-sm font-bold ${parseFloat(r.currentBalance) < 0 ? "text-destructive" : "text-emerald-600"}`}>
        {parseFloat(r.currentBalance).toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
      </span>
    )},
    { key: "isActive", headerAr: "الحالة", render: (r: BankAccount) => <StatusBadge status={r.isActive ? "ACTIVE" : "INACTIVE"} /> },
    { key: "actions", headerAr: "", render: (r: BankAccount) => (
      <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="p-1.5 hover:bg-muted rounded text-muted-foreground"><Pencil size={13} /></button>
    )},
  ];

  return (
    <div dir="rtl">
      <PageHeader titleAr="الحسابات البنكية" subtitleAr="إدارة الحسابات البنكية وأرصدتها"
        action={<button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"><Plus size={15} /> إضافة حساب بنكي</button>}
      />
      <DataTable columns={columns} data={data?.data ?? []} pagination={data?.pagination} isLoading={isLoading} emptyMessageAr="لا توجد حسابات بنكية بعد" />
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-bold">{editing ? "تعديل حساب بنكي" : "إضافة حساب بنكي"}</h3>
              <button onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <F label="الكود *"><input {...register("code", { required: true })} className={inputCls} /></F>
                <F label="العملة"><select {...register("currency")} className={inputCls}><option value="SAR">SAR</option><option value="USD">USD</option><option value="EUR">EUR</option></select></F>
              </div>
              <F label="الاسم بالعربي *"><input {...register("nameAr", { required: true })} className={inputCls} /></F>
              <F label="اسم البنك *"><input {...register("bankName", { required: true })} className={inputCls} /></F>
              <div className="grid grid-cols-2 gap-3">
                <F label="رقم الحساب"><input {...register("accountNumber")} className={`${inputCls} ltr`} /></F>
                <F label="رقم IBAN"><input {...register("iban")} className={`${inputCls} ltr`} placeholder="SA00 0000 0000 0000 0000 0000" /></F>
              </div>
              <F label="رقم السويفت (SWIFT)"><input {...register("swiftCode")} className={`${inputCls} ltr`} /></F>
              <F label="حساب دليل الحسابات">
                <select {...register("accountId")} className={inputCls}>
                  <option value="">— اختر الحساب —</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.nameAr}</option>)}
                </select>
              </F>
              {!editing && <F label="الرصيد الافتتاحي"><input {...register("openingBalance")} type="number" step="0.01" defaultValue={0} className={inputCls} /></F>}
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
