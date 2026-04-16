import { useState, useEffect } from "react";
import { apiClient } from "../lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Modal from "@/components/Modal";
import { formatDate, formatAmount } from "../lib/format";
import { toast } from "sonner";

interface Customer { id: string; code: string; nameAr: string; }
interface Treasury { id: string; code: string; nameAr: string; }
interface BankAccount { id: string; code: string; nameAr: string; }
interface OpenInvoice { id: string; number: string; date: string; totalAmount: string; outstandingAmount: string; }
interface ReceiptVoucher {
  id: string; number: string; date: string; customerId: string;
  customerNameAr?: string; customerCode?: string;
  paymentMethod: string; amount: string; appliedAmount: string; unappliedAmount: string;
  status: string; notes?: string; createdAt: string;
  treasuryNameAr?: string; bankNameAr?: string;
}

const STATUS_LABELS: Record<string, string> = { DRAFT: "مسودة", POSTED: "مرحّل", CANCELLED: "ملغى" };
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-amber-100 text-amber-800",
  POSTED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};
const PM_LABELS: Record<string, string> = { CASH: "نقدي", BANK_TRANSFER: "تحويل بنكي", CHEQUE: "شيك" };

export default function ReceiptVouchers() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("receipt_vouchers", "create");
  const canPost = hasPermission("receipt_vouchers", "post");

  const [list, setList] = useState<ReceiptVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [openInvoices, setOpenInvoices] = useState<OpenInvoice[]>([]);
  const [applications, setApplications] = useState<Array<{ invoiceId: string; appliedAmount: number; invoiceNumber: string; outstanding: number }>>([]);

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    customerId: "",
    paymentMethod: "CASH" as "CASH" | "BANK_TRANSFER" | "CHEQUE",
    treasuryId: "", bankAccountId: "",
    amount: "", notes: "",
  });

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await apiClient.get(`/receipt-vouchers?${params}`);
      setList(res.data.data ?? res.data.items ?? []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchList(); }, [search, statusFilter]);

  const loadMeta = async () => {
    const [c, t, b] = await Promise.all([
      apiClient.get("/customers?limit=200"),
      apiClient.get("/treasuries?limit=100"),
      apiClient.get("/bank-accounts?limit=100"),
    ]);
    setCustomers(c.data.data ?? c.data.items ?? []);
    setTreasuries(t.data.data ?? t.data.items ?? []);
    setBankAccounts(b.data.data ?? b.data.items ?? []);
  };

  const loadOpenInvoices = async (customerId: string) => {
    if (!customerId) { setOpenInvoices([]); setApplications([]); return; }
    try {
      const res = await apiClient.get(`/receipt-vouchers/customer/${customerId}/open-invoices`);
      setOpenInvoices(res.data.data ?? []);
      setApplications([]);
    } catch { setOpenInvoices([]); }
  };

  const openCreate = async () => {
    await loadMeta();
    setForm({ date: new Date().toISOString().slice(0, 10), customerId: "", paymentMethod: "CASH", treasuryId: "", bankAccountId: "", amount: "", notes: "" });
    setOpenInvoices([]);
    setApplications([]);
    setShowModal(true);
  };

  const openDetail = async (rv: ReceiptVoucher) => {
    const res = await apiClient.get(`/receipt-vouchers/${rv.id}`);
    setSelected(res.data);
    setShowDetail(true);
  };

  const totalApplied = applications.reduce((s, a) => s + Number(a.appliedAmount), 0);
  const totalAmount = Number(form.amount) || 0;

  const toggleInvoiceApplication = (inv: OpenInvoice) => {
    const existing = applications.find(a => a.invoiceId === inv.id);
    if (existing) {
      setApplications(a => a.filter(x => x.invoiceId !== inv.id));
    } else {
      const remaining = totalAmount - totalApplied;
      const applied = Math.min(Number(inv.outstandingAmount), remaining);
      if (applied <= 0) { toast.error("لا يوجد رصيد متبقٍ للتطبيق"); return; }
      setApplications(a => [...a, { invoiceId: inv.id, invoiceNumber: inv.number, outstanding: Number(inv.outstandingAmount), appliedAmount: applied }]);
    }
  };

  const updateAppAmount = (invoiceId: string, amt: number) => {
    setApplications(a => a.map(x => x.invoiceId === invoiceId ? { ...x, appliedAmount: amt } : x));
  };

  const handleSave = async () => {
    if (!form.customerId) { toast.error("اختر العميل"); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast.error("المبلغ يجب أن يكون أكبر من صفر"); return; }
    if (form.paymentMethod === "CASH" && !form.treasuryId) { toast.error("اختر الصندوق للدفع النقدي"); return; }
    if (form.paymentMethod !== "CASH" && !form.bankAccountId) { toast.error("اختر الحساب البنكي"); return; }

    setSaving(true);
    try {
      const res = await apiClient.post("/receipt-vouchers", {
        date: form.date, customerId: form.customerId,
        paymentMethod: form.paymentMethod,
        treasuryId: form.paymentMethod === "CASH" ? form.treasuryId : undefined,
        bankAccountId: form.paymentMethod !== "CASH" ? form.bankAccountId : undefined,
        amount: Number(form.amount), notes: form.notes,
      });
      toast.success("تم إنشاء سند القبض");
      setShowModal(false);
      fetchList();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "حدث خطأ");
    } finally { setSaving(false); }
  };

  const handlePost = async (id: string, apps: Array<{ invoiceId: string; appliedAmount: number }>) => {
    if (!confirm("هل أنت متأكد من ترحيل سند القبض؟")) return;
    setSaving(true);
    try {
      await apiClient.post(`/receipt-vouchers/${id}/post`, { applications: apps });
      toast.success("تم ترحيل سند القبض وتسوية المبالغ");
      setShowDetail(false);
      fetchList();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "فشل الترحيل");
    } finally { setSaving(false); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("إلغاء السند؟")) return;
    try {
      await apiClient.patch(`/receipt-vouchers/${id}/cancel`);
      toast.success("تم الإلغاء"); setShowDetail(false); fetchList();
    } catch (err: any) { toast.error(err.response?.data?.error ?? "حدث خطأ"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">سندات القبض</h1>
          <p className="text-sm text-gray-500 mt-1">تحصيل المبالغ من العملاء وتسوية الفواتير</p>
        </div>
        {canCreate && (
          <button onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            + إنشاء سند قبض
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex gap-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالرقم..." className="input flex-1" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input min-w-36">
            <option value="">جميع الحالات</option>
            <option value="DRAFT">مسودة</option>
            <option value="POSTED">مرحّل</option>
            <option value="CANCELLED">ملغى</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">جاري التحميل...</div>
        ) : !list.length ? (
          <div className="p-10 text-center text-gray-400">لا توجد سندات قبض</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-right font-medium text-gray-600">رقم السند</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">العميل</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">طريقة الدفع</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">المبلغ</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">المطبّق</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map(rv => (
                <tr key={rv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-700">{rv.number}</td>
                  <td className="px-4 py-3 text-gray-700">{rv.customerNameAr ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(rv.date)}</td>
                  <td className="px-4 py-3 text-gray-600">{PM_LABELS[rv.paymentMethod] ?? rv.paymentMethod}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatAmount(rv.amount)}</td>
                  <td className="px-4 py-3 text-green-700">{formatAmount(rv.appliedAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[rv.status]}`}>
                      {STATUS_LABELS[rv.status] ?? rv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openDetail(rv)} className="text-xs text-blue-600 hover:underline">عرض</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} size="lg" title="إنشاء سند قبض جديد">
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">العميل *</label>
              <select value={form.customerId} onChange={e => { setForm(f => ({ ...f, customerId: e.target.value })); loadOpenInvoices(e.target.value); }} className="input w-full">
                <option value="">اختر عميلاً</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.code} — {c.nameAr}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">التاريخ *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">طريقة الدفع *</label>
              <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value as any }))} className="input w-full">
                <option value="CASH">نقدي</option>
                <option value="BANK_TRANSFER">تحويل بنكي</option>
                <option value="CHEQUE">شيك</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">المبلغ (ر.س) *</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="input w-full" placeholder="0.00" />
            </div>
            {form.paymentMethod === "CASH" ? (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">الصندوق *</label>
                <select value={form.treasuryId} onChange={e => setForm(f => ({ ...f, treasuryId: e.target.value }))} className="input w-full">
                  <option value="">اختر الصندوق</option>
                  {treasuries.map(t => <option key={t.id} value={t.id}>{t.code} — {t.nameAr}</option>)}
                </select>
              </div>
            ) : (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">الحساب البنكي *</label>
                <select value={form.bankAccountId} onChange={e => setForm(f => ({ ...f, bankAccountId: e.target.value }))} className="input w-full">
                  <option value="">اختر الحساب البنكي</option>
                  {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.code} — {b.nameAr}</option>)}
                </select>
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">ملاحظات</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input w-full" placeholder="ملاحظات اختيارية" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary" disabled={saving}>إلغاء</button>
            <button onClick={handleSave} disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? "جاري الحفظ..." : "حفظ كمسودة"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail/Post Modal */}
      {selected && (
        <Modal open={showDetail} onClose={() => setShowDetail(false)} size="lg" title={`سند قبض — ${selected.number}`}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
              <div><span className="text-gray-500 text-xs">العميل:</span><br /><span className="font-semibold">{selected.customerNameAr}</span></div>
              <div><span className="text-gray-500 text-xs">التاريخ:</span><br /><span className="font-semibold">{formatDate(selected.date)}</span></div>
              <div><span className="text-gray-500 text-xs">طريقة الدفع:</span><br /><span className="font-semibold">{PM_LABELS[selected.paymentMethod]}</span></div>
              <div><span className="text-gray-500 text-xs">المبلغ:</span><br /><span className="text-lg font-bold text-gray-900">{formatAmount(selected.amount)}</span></div>
              <div><span className="text-gray-500 text-xs">المطبّق:</span><br /><span className="font-semibold text-green-700">{formatAmount(selected.appliedAmount)}</span></div>
              <div><span className="text-gray-500 text-xs">الحالة:</span><br />
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selected.status]}`}>{STATUS_LABELS[selected.status]}</span>
              </div>
            </div>

            {/* Applications */}
            {(selected.applications?.length > 0) && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">التسويات على الفواتير</h3>
                <table className="w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-right">رقم الفاتورة</th>
                      <th className="px-3 py-2 text-right">التاريخ</th>
                      <th className="px-3 py-2 text-right">المبلغ المطبّق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.applications.map((a: any) => (
                      <tr key={a.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-mono text-blue-700">{a.invoiceNumber}</td>
                        <td className="px-3 py-2">{formatDate(a.applicationDate)}</td>
                        <td className="px-3 py-2 font-semibold text-green-700">{formatAmount(a.appliedAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Post with invoice application UI */}
            {selected.status === "DRAFT" && canPost && (
              <PostApplicationPanel
                receiptId={selected.id}
                receiptAmount={Number(selected.amount)}
                customerId={selected.customerId}
                onPost={(apps) => handlePost(selected.id, apps)}
                saving={saving}
              />
            )}

            {selected.status === "DRAFT" && (
              <div className="flex justify-end">
                <button onClick={() => handleCancel(selected.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  إلغاء السند
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function PostApplicationPanel({ receiptId, receiptAmount, customerId, onPost, saving }: {
  receiptId: string; receiptAmount: number; customerId: string;
  onPost: (apps: Array<{ invoiceId: string; appliedAmount: number }>) => void;
  saving: boolean;
}) {
  const [openInvoices, setOpenInvoices] = useState<OpenInvoice[]>([]);
  const [applications, setApplications] = useState<Array<{ invoiceId: string; invoiceNumber: string; outstanding: number; appliedAmount: number }>>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiClient.get(`/receipt-vouchers/customer/${customerId}/open-invoices`)
      .then(r => { setOpenInvoices(r.data.data ?? []); setLoaded(true); });
  }, [customerId]);

  const totalApplied = applications.reduce((s, a) => s + Number(a.appliedAmount), 0);
  const remaining = receiptAmount - totalApplied;

  const toggle = (inv: OpenInvoice) => {
    const ex = applications.find(a => a.invoiceId === inv.id);
    if (ex) { setApplications(a => a.filter(x => x.invoiceId !== inv.id)); return; }
    const apply = Math.min(Number(inv.outstandingAmount), Math.max(0, remaining));
    if (apply <= 0) { toast.error("لا يوجد رصيد متبقٍ"); return; }
    setApplications(a => [...a, { invoiceId: inv.id, invoiceNumber: inv.number, outstanding: Number(inv.outstandingAmount), appliedAmount: apply }]);
  };

  const updateAmt = (invoiceId: string, amt: number) => {
    setApplications(a => a.map(x => x.invoiceId === invoiceId ? { ...x, appliedAmount: Math.min(amt, x.outstanding) } : x));
  };

  if (!loaded) return <div className="text-xs text-gray-400">جاري تحميل الفواتير المفتوحة...</div>;

  return (
    <div className="border border-blue-200 rounded-lg overflow-hidden">
      <div className="bg-blue-50 px-4 py-2 flex items-center justify-between">
        <span className="font-semibold text-blue-800 text-sm">ترحيل وتسوية الفواتير</span>
        <div className="text-xs text-blue-600">متبقٍ: <strong>{formatAmount(remaining.toFixed(2))}</strong></div>
      </div>
      {openInvoices.length === 0 ? (
        <div className="p-3 text-xs text-gray-400">لا توجد فواتير مفتوحة لهذا العميل</div>
      ) : (
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 w-8"></th>
              <th className="px-3 py-2 text-right">رقم الفاتورة</th>
              <th className="px-3 py-2 text-right">التاريخ</th>
              <th className="px-3 py-2 text-right">المستحق</th>
              <th className="px-3 py-2 text-right w-28">المطبّق</th>
            </tr>
          </thead>
          <tbody>
            {openInvoices.map(inv => {
              const app = applications.find(a => a.invoiceId === inv.id);
              return (
                <tr key={inv.id} className={`border-t border-gray-100 ${app ? "bg-blue-50" : ""}`}>
                  <td className="px-3 py-2 text-center">
                    <input type="checkbox" checked={!!app} onChange={() => toggle(inv)} />
                  </td>
                  <td className="px-3 py-2 font-mono text-blue-700">{inv.number}</td>
                  <td className="px-3 py-2 text-gray-600">{formatDate(inv.date)}</td>
                  <td className="px-3 py-2 font-semibold text-amber-700">{formatAmount(inv.outstandingAmount)}</td>
                  <td className="px-3 py-2">
                    {app ? (
                      <input type="number" step="0.01" max={Math.min(Number(inv.outstandingAmount), receiptAmount)}
                        value={app.appliedAmount}
                        onChange={e => updateAmt(inv.id, Number(e.target.value))}
                        className="input w-full text-xs" />
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div className="px-4 py-3 bg-gray-50 flex justify-end">
        <button onClick={() => onPost(applications.map(a => ({ invoiceId: a.invoiceId, appliedAmount: a.appliedAmount })))}
          disabled={saving}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
          {saving ? "جاري الترحيل..." : "ترحيل السند"}
        </button>
      </div>
    </div>
  );
}
