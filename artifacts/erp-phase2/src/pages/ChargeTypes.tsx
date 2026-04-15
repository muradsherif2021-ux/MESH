import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Plus, Pencil, X, Loader2, Info } from "lucide-react";
import { useForm } from "react-hook-form";

interface ChargeType {
  id: string; code: string; nameAr: string; nameEn?: string;
  accountingType: string; vatApplicable: boolean; requiresCostSource: boolean; isActive: boolean;
}

export default function ChargeTypes() {
  const [data, setData] = useState<{ data: ChargeType[]; pagination: any } | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChargeType | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { register, handleSubmit, reset, watch } = useForm<any>();
  const accountingType = watch("accountingType");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [res, accs] = await Promise.all([
        api("/charge-types").get({ limit: 50 } as any),
        api("/accounts").get({ limit: 200, allowPosting: true } as any),
      ]);
      setData(res as any);
      setAccounts((accs as any).data ?? []);
    } catch {} finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    reset({ accountingType: "PASS_THROUGH", vatApplicable: "false", requiresCostSource: "true", isActive: "true" });
    setError(""); setModalOpen(true);
  };
  const openEdit = (c: ChargeType) => {
    setEditing(c);
    reset({ ...c, vatApplicable: String(c.vatApplicable), requiresCostSource: String(c.requiresCostSource), isActive: String(c.isActive) });
    setError(""); setModalOpen(true);
  };

  const onSubmit = async (values: any) => {
    setSaving(true); setError("");
    try {
      values.vatApplicable = values.vatApplicable === "true";
      values.requiresCostSource = values.requiresCostSource === "true";
      if (editing) await api(`/charge-types/${editing.id}`).put(values);
      else await api("/charge-types").post(values);
      setModalOpen(false); load();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring";
  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>{children}</div>
  );

  const typeLabels: Record<string, string> = { PASS_THROUGH: "عبور (تكلفة قابلة للاسترداد)", REVENUE: "إيراد خدمة", EXPENSE: "مصروف" };

  const columns = [
    { key: "code", headerAr: "الكود", render: (r: ChargeType) => <span className="font-mono text-xs font-bold text-primary">{r.code}</span> },
    { key: "nameAr", headerAr: "الاسم" },
    { key: "accountingType", headerAr: "النوع المحاسبي", render: (r: ChargeType) => <StatusBadge status={r.accountingType} /> },
    { key: "vatApplicable", headerAr: "خاضع لضريبة القيمة المضافة", render: (r: ChargeType) => <StatusBadge status={r.vatApplicable} /> },
    { key: "requiresCostSource", headerAr: "يتطلب مصدر تكلفة", render: (r: ChargeType) => <StatusBadge status={r.requiresCostSource} /> },
    { key: "isActive", headerAr: "الحالة", render: (r: ChargeType) => <StatusBadge status={r.isActive ? "ACTIVE" : "INACTIVE"} /> },
    { key: "actions", headerAr: "", render: (r: ChargeType) => (
      <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="p-1.5 hover:bg-muted rounded text-muted-foreground"><Pencil size={13} /></button>
    )},
  ];

  return (
    <div dir="rtl">
      <PageHeader titleAr="أنواع الرسوم" subtitleAr="كتالوج بنود الفاتورة وقواعد المعالجة المحاسبية"
        action={<button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"><Plus size={15} /> إضافة نوع رسم</button>}
      />

      <div className="mb-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-2">
        <Info size={14} className="text-blue-600 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700 dark:text-blue-400">
          <strong>قاعدة النموذج الوكالي:</strong> أنواع الرسوم من نوع <strong>عبور</strong> هي تكاليف مُدفوعة بالنيابة عن العميل — لا تُحتسب إيراداً ولا تخضع لضريبة القيمة المضافة. تُسجّل في الحساب 1104 فقط.
        </p>
      </div>

      <DataTable columns={columns} data={data?.data ?? []} pagination={data?.pagination} isLoading={isLoading} emptyMessageAr="لا توجد أنواع رسوم بعد" />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-bold">{editing ? "تعديل نوع رسم" : "إضافة نوع رسم جديد"}</h3>
              <button onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <F label="الكود *"><input {...register("code", { required: true })} className={inputCls} /></F>
                <F label="النوع المحاسبي *">
                  <select {...register("accountingType")} className={inputCls}>
                    {Object.entries(typeLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </F>
              </div>
              <F label="الاسم بالعربي *"><input {...register("nameAr", { required: true })} className={inputCls} /></F>
              <F label="الاسم بالإنجليزي"><input {...register("nameEn")} className={inputCls} /></F>
              <div className="grid grid-cols-2 gap-3">
                <F label="خاضع لضريبة القيمة المضافة">
                  <select {...register("vatApplicable")} className={inputCls} disabled={accountingType === "PASS_THROUGH"}>
                    <option value="false">لا</option>
                    <option value="true">نعم (15%)</option>
                  </select>
                </F>
                <F label="يتطلب مصدر تكلفة">
                  <select {...register("requiresCostSource")} className={inputCls}>
                    <option value="true">نعم</option>
                    <option value="false">لا</option>
                  </select>
                </F>
              </div>

              {accountingType === "PASS_THROUGH" ? (
                <F label="حساب التسوية (عبور)">
                  <select {...register("defaultSettlementAccountId")} className={inputCls}>
                    <option value="">— اختر الحساب —</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.nameAr}</option>)}
                  </select>
                </F>
              ) : (
                <F label="حساب الإيراد الافتراضي">
                  <select {...register("defaultRevenueAccountId")} className={inputCls}>
                    <option value="">— اختر الحساب —</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.nameAr}</option>)}
                  </select>
                </F>
              )}

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
