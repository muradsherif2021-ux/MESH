import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Plus, Pencil, CheckCircle, Search, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";

const categoryLabels: Record<string, string> = {
  DRIVER_ADVANCE: "سلفة سائق",
  FIELD_ADVANCE: "سلفة ميدانية",
  DOCUMENT_RELEASE: "دفعة تحرير مستندات",
  MISC_RECOVERABLE: "تكلفة متنوعة",
};
const paymentMethodLabels: Record<string, string> = {
  CASH: "نقداً", BANK_TRANSFER: "تحويل بنكي", CHEQUE: "شيك",
};

interface Treasury { id: string; nameAr: string; }
interface BankAccount { id: string; nameAr: string; bankName: string; }
interface OnBehalfCost {
  id: string; number: string; category: string; date: string;
  payeeName?: string; amount: string; paymentMethod: string;
  treasuryId?: string; bankAccountId?: string; treasuryNameAr?: string; bankNameAr?: string;
  operationRef?: string; description: string; status: string; notes?: string;
}
interface FormData {
  category: string; date: string; payeeName?: string; amount: string;
  paymentMethod: string; treasuryId?: string; bankAccountId?: string;
  operationRef?: string; description: string; branchId?: string; notes?: string;
}

export default function OnBehalfCosts() {
  const { hasPermission } = useAuth();
  const [data, setData] = useState<{ data: OnBehalfCost[]; pagination: any } | null>(null);
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OnBehalfCost | null>(null);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { register, handleSubmit, reset, watch } = useForm<FormData>();
  const paymentMethod = watch("paymentMethod");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api("/on-behalf-costs").get({ page, limit: 20, search: search || undefined, status: statusFilter || undefined, category: categoryFilter || undefined } as any);
      setData(res as any);
    } catch {} finally { setIsLoading(false); }
  }, [page, search, statusFilter, categoryFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    Promise.all([
      api("/treasuries").get({ limit: 200 } as any).then(r => setTreasuries((r as any).data ?? [])),
      api("/bank-accounts").get({ limit: 200 } as any).then(r => setBankAccounts((r as any).data ?? [])),
    ]).catch(() => {});
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const openCreate = () => { setEditing(null); reset({ date: today, paymentMethod: "CASH", category: "MISC_RECOVERABLE" }); setError(""); setModalOpen(true); };
  const openEdit = (r: OnBehalfCost) => { setEditing(r); reset({ ...r } as any); setError(""); setModalOpen(true); };

  const onSubmit = async (values: FormData) => {
    setSaving(true); setError("");
    try {
      if (editing) await api(`/on-behalf-costs/${editing.id}`).put(values);
      else await api("/on-behalf-costs").post(values);
      setModalOpen(false); load();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const handlePost = async (id: string) => {
    if (!confirm("ترحيل هذا السجل؟ سيُسجَّل القيد المحاسبي ومصدر التكلفة.")) return;
    setPosting(id);
    try {
      await api(`/on-behalf-costs/${id}/post`).post({});
      load();
    } catch (err: any) { alert(err.message); } finally { setPosting(null); }
  };

  const columns = [
    { key: "number", headerAr: "الرقم", render: (r: OnBehalfCost) => <span className="font-mono text-xs text-primary font-bold">{r.number}</span> },
    { key: "date", headerAr: "التاريخ", render: (r: OnBehalfCost) => <span className="text-xs">{r.date}</span> },
    { key: "category", headerAr: "الفئة", render: (r: OnBehalfCost) => (
      <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{categoryLabels[r.category] ?? r.category}</span>
    )},
    { key: "description", headerAr: "البيان", render: (r: OnBehalfCost) => <span className="text-sm truncate max-w-[160px] block">{r.description}</span> },
    { key: "payeeName", headerAr: "المستفيد", render: (r: OnBehalfCost) => <span className="text-xs text-muted-foreground">{r.payeeName ?? "—"}</span> },
    { key: "amount", headerAr: "المبلغ", render: (r: OnBehalfCost) => <span className="font-semibold text-sm ltr">{Number(r.amount).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</span> },
    { key: "paymentMethod", headerAr: "طريقة الدفع", render: (r: OnBehalfCost) => <span className="text-xs">{paymentMethodLabels[r.paymentMethod]}</span> },
    { key: "status", headerAr: "الحالة", render: (r: OnBehalfCost) => <StatusBadge status={r.status} /> },
    { key: "actions", headerAr: "", render: (r: OnBehalfCost) => (
      <div className="flex items-center gap-1">
        {r.status === "DRAFT" && hasPermission("on_behalf_costs", "edit") && (
          <button onClick={e => { e.stopPropagation(); openEdit(r); }} className="p-1.5 hover:bg-muted rounded text-muted-foreground"><Pencil size={13} /></button>
        )}
        {r.status === "DRAFT" && hasPermission("on_behalf_costs", "post") && (
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
        titleAr="التكاليف والسلف بالنيابة"
        subtitleAr="سلف السائقين، السلف الميدانية، دفعات تحرير المستندات، والتكاليف المتنوعة القابلة للاسترداد"
        action={hasPermission("on_behalf_costs", "create") ? (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            <Plus size={15} /> إضافة سجل
          </button>
        ) : undefined}
      />
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="بحث..." className="w-full pr-9 pl-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">كل الفئات</option>
          {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
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
              <h2 className="text-base font-bold">{editing ? "تعديل سجل" : "إضافة تكلفة / سلفة بالنيابة"}</h2>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">الفئة <span className="text-red-500">*</span></label>
                  <select {...register("category", { required: true })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                    {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">التاريخ <span className="text-red-500">*</span></label>
                  <input type="date" {...register("date", { required: true })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">اسم المستفيد</label>
                  <input type="text" {...register("payeeName")} placeholder="اسم السائق / الموظف..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">المبلغ <span className="text-red-500">*</span></label>
                  <input type="number" step="0.01" min="0.01" {...register("amount", { required: true })} placeholder="0.00"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring ltr" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">البيان <span className="text-red-500">*</span></label>
                  <input type="text" {...register("description", { required: true })} placeholder="وصف التكلفة..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">طريقة الدفع</label>
                  <select {...register("paymentMethod")}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="CASH">نقداً</option>
                    <option value="BANK_TRANSFER">تحويل بنكي</option>
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
                      <option value="">اختر الحساب</option>
                      {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.nameAr}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium mb-1">مرجع العملية</label>
                  <input type="text" {...register("operationRef")} placeholder="رقم الملف..."
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
