import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Plus, Pencil, CheckCircle, Search, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";

const paymentMethodLabels: Record<string, string> = {
  CASH: "نقداً", BANK_TRANSFER: "تحويل بنكي", CHEQUE: "شيك",
};

interface Treasury { id: string; nameAr: string; }
interface BankAccount { id: string; nameAr: string; bankName: string; }
interface CustomsPayment {
  id: string; number: string; date: string; amount: string;
  paymentMethod: string; treasuryId?: string; bankAccountId?: string;
  treasuryNameAr?: string; bankNameAr?: string;
  externalRef?: string; operationRef?: string; description?: string;
  status: string; notes?: string; postedAt?: string;
}
interface FormData {
  date: string; amount: string; paymentMethod: string;
  treasuryId?: string; bankAccountId?: string;
  externalRef?: string; operationRef?: string; description?: string;
  branchId?: string; notes?: string;
}

export default function CustomsPayments() {
  const { hasPermission } = useAuth();
  const [data, setData] = useState<{ data: CustomsPayment[]; pagination: any } | null>(null);
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CustomsPayment | null>(null);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { register, handleSubmit, reset, watch } = useForm<FormData>();
  const paymentMethod = watch("paymentMethod");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api("/customs-payments").get({ page, limit: 20, search: search || undefined, status: statusFilter || undefined } as any);
      setData(res as any);
    } catch {} finally { setIsLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    Promise.all([
      api("/treasuries").get({ limit: 200 } as any).then(r => setTreasuries((r as any).data ?? [])),
      api("/bank-accounts").get({ limit: 200 } as any).then(r => setBankAccounts((r as any).data ?? [])),
    ]).catch(() => {});
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const openCreate = () => { setEditing(null); reset({ date: today, paymentMethod: "BANK_TRANSFER" }); setError(""); setModalOpen(true); };
  const openEdit = (r: CustomsPayment) => { setEditing(r); reset({ ...r } as any); setError(""); setModalOpen(true); };

  const onSubmit = async (values: FormData) => {
    setSaving(true); setError("");
    try {
      if (editing) await api(`/customs-payments/${editing.id}`).put(values);
      else await api("/customs-payments").post(values);
      setModalOpen(false); load();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const handlePost = async (id: string) => {
    if (!confirm("هل تريد ترحيل دفعة الجمارك؟ ستُسجَّل القيد المحاسبي ومصدر التكلفة.")) return;
    setPosting(id);
    try {
      await api(`/customs-payments/${id}/post`).post({});
      load();
    } catch (err: any) { alert(err.message); } finally { setPosting(null); }
  };

  const columns = [
    { key: "number", headerAr: "الرقم", render: (r: CustomsPayment) => <span className="font-mono text-xs text-primary font-bold">{r.number}</span> },
    { key: "date", headerAr: "التاريخ", render: (r: CustomsPayment) => <span className="text-xs">{r.date}</span> },
    { key: "amount", headerAr: "المبلغ", render: (r: CustomsPayment) => <span className="font-semibold text-sm ltr">{Number(r.amount).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span> },
    { key: "paymentMethod", headerAr: "طريقة الدفع", render: (r: CustomsPayment) => <span className="text-xs">{paymentMethodLabels[r.paymentMethod]}</span> },
    { key: "source", headerAr: "الخزينة / البنك", render: (r: CustomsPayment) => <span className="text-xs text-muted-foreground">{r.treasuryNameAr ?? r.bankNameAr ?? "—"}</span> },
    { key: "externalRef", headerAr: "المرجع الخارجي", render: (r: CustomsPayment) => <span className="text-xs">{r.externalRef ?? "—"}</span> },
    { key: "operationRef", headerAr: "مرجع العملية", render: (r: CustomsPayment) => <span className="text-xs text-muted-foreground">{r.operationRef ?? "—"}</span> },
    { key: "status", headerAr: "الحالة", render: (r: CustomsPayment) => <StatusBadge status={r.status} /> },
    { key: "actions", headerAr: "", render: (r: CustomsPayment) => (
      <div className="flex items-center gap-1">
        {r.status === "DRAFT" && hasPermission("customs_payments", "edit") && (
          <button onClick={e => { e.stopPropagation(); openEdit(r); }} className="p-1.5 hover:bg-muted rounded text-muted-foreground"><Pencil size={13} /></button>
        )}
        {r.status === "DRAFT" && hasPermission("customs_payments", "post") && (
          <button onClick={e => { e.stopPropagation(); handlePost(r.id); }} disabled={posting === r.id}
            className="p-1.5 hover:bg-green-500/10 rounded text-green-600">
            {posting === r.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div dir="rtl">
      <PageHeader
        titleAr="مدفوعات الجمارك"
        subtitleAr="تسجيل مدفوعات الرسوم الجمركية بالنيابة عن العملاء — لا تُعدّ مصروفاً ولا إيراداً"
        action={hasPermission("customs_payments", "create") ? (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus size={15} /> إضافة دفعة
          </button>
        ) : undefined}
      />
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="بحث بالرقم أو المرجع..."
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
              <h2 className="text-base font-bold">{editing ? "تعديل دفعة جمارك" : "إضافة دفعة جمارك جديدة"}</h2>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">التاريخ <span className="text-red-500">*</span></label>
                  <input type="date" {...register("date", { required: true })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">المبلغ <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" min="0.01" {...register("amount", { required: true })} placeholder="0.00"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring ltr" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">طريقة الدفع</label>
                  <select {...register("paymentMethod")}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="BANK_TRANSFER">تحويل بنكي</option>
                    <option value="CASH">نقداً</option>
                    <option value="CHEQUE">شيك</option>
                  </select>
                </div>
                {paymentMethod === "CASH" ? (
                  <div>
                    <label className="block text-xs font-medium mb-1">الخزينة</label>
                    <select {...register("treasuryId")}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">اختر الخزينة</option>
                      {treasuries.map(t => <option key={t.id} value={t.id}>{t.nameAr}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium mb-1">الحساب البنكي</label>
                    <select {...register("bankAccountId")}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">اختر الحساب البنكي</option>
                      {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.nameAr} — {b.bankName}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium mb-1">المرجع الخارجي (الجمارك)</label>
                  <input type="text" {...register("externalRef")} placeholder="رقم إيصال الجمارك..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">مرجع العملية</label>
                  <input type="text" {...register("operationRef")} placeholder="رقم الملف..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">البيان</label>
                  <input type="text" {...register("description")} placeholder="وصف الدفعة..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
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
