import { useState, useEffect } from "react";
import { apiClient } from "../lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Modal from "@/components/Modal";
import { formatDate, formatAmount } from "../lib/format";
import { toast } from "sonner";

interface Customer { id: string; code: string; nameAr: string; }
interface ChargeType { id: string; code: string; nameAr: string; accountingType: string; vatApplicable: boolean; defaultRevenueAccountId?: string; }
interface Account { id: string; code: string; nameAr: string; }
interface CostSource { id: string; sourceNumber: string; sourceType: string; sourceTypeLabel: string; description: string; totalAmount: string; remainingAmount: string; availableForAllocation: string; date: string; }
interface InvoiceLine {
  _key: string;
  chargeTypeId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  accountingType: "PASS_THROUGH" | "REVENUE";
  vatApplicable: boolean;
  costSourceId?: string;
  revenueAccountId?: string;
  allocatedAmount?: number;
}
interface Invoice {
  id: string; number: string; date: string; dueDate?: string;
  status: string; customerId: string; customerNameAr?: string; customerCode?: string;
  subtotalPassThrough: string; subtotalRevenue: string; vatAmount: string; totalAmount: string;
  paidAmount: string; outstandingAmount: string; notes?: string; createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "مسودة", POSTED: "مرحّلة", CANCELLED: "ملغاة",
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-amber-100 text-amber-800", POSTED: "bg-green-100 text-green-800", CANCELLED: "bg-red-100 text-red-800",
};
const TYPE_LABELS: Record<string, string> = {
  PASS_THROUGH: "بالنيابة", REVENUE: "إيراد خدمة",
};

const VAT_RATE = 15;
let keyCounter = 0;
const newKey = () => `k${++keyCounter}`;

export default function Invoices() {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("invoices", "create");
  const canPost = hasPermission("invoices", "post");
  const canEdit = hasPermission("invoices", "edit");

  const [invoicesList, setInvoicesList] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [availableCostSources, setAvailableCostSources] = useState<CostSource[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    customerId: "", date: new Date().toISOString().slice(0, 10),
    dueDate: "", notes: "", vatEnabled: true, vatRate: VAT_RATE,
  });
  const [lines, setLines] = useState<InvoiceLine[]>([]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await apiClient.get(`/invoices?${params}`);
      setInvoicesList(res.data.data ?? res.data.items ?? []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchList(); }, [search, statusFilter]);

  const loadMeta = async () => {
    const [c, ct, acc] = await Promise.all([
      apiClient.get("/customers?limit=200"),
      apiClient.get("/charge-types?limit=200"),
      apiClient.get("/accounts?limit=500"),
    ]);
    setCustomers(c.data.data ?? c.data.items ?? []);
    setChargeTypes(ct.data.data ?? ct.data.items ?? []);
    setAccounts(acc.data.data ?? acc.data.items ?? []);
  };

  const loadCostSources = async (excludeId?: string) => {
    const params = excludeId ? `?excludeInvoiceId=${excludeId}` : "";
    const res = await apiClient.get(`/invoices/available-cost-sources${params}`);
    setAvailableCostSources(res.data.data ?? []);
  };

  const openCreate = async () => {
    await loadMeta();
    await loadCostSources();
    setEditingId(null);
    setForm({ customerId: "", date: new Date().toISOString().slice(0, 10), dueDate: "", notes: "", vatEnabled: true, vatRate: VAT_RATE });
    setLines([]);
    setShowModal(true);
  };

  const openEdit = async (inv: Invoice) => {
    await loadMeta();
    await loadCostSources(inv.id);
    setEditingId(inv.id);
    setForm({ customerId: inv.customerId, date: inv.date, dueDate: inv.dueDate ?? "", notes: inv.notes ?? "", vatEnabled: true, vatRate: VAT_RATE });

    const detRes = await apiClient.get(`/invoices/${inv.id}`);
    const det = detRes.data;
    const lns: InvoiceLine[] = (det.lines ?? []).map((l: any) => ({
      _key: newKey(),
      chargeTypeId: l.chargeTypeId,
      description: l.description,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      amount: Number(l.amount),
      accountingType: l.accountingType,
      vatApplicable: l.vatApplicable,
      costSourceId: l.costSourceId,
      revenueAccountId: l.revenueAccountId,
      allocatedAmount: l.costSourceId ? Number(l.amount) : undefined,
    }));
    setLines(lns);
    setShowModal(true);
  };

  const openDetail = async (inv: Invoice) => {
    const res = await apiClient.get(`/invoices/${inv.id}`);
    setSelected(res.data);
    setShowDetail(true);
  };

  const totals = (() => {
    let ptotal = 0; let rtotal = 0; let vat = 0;
    for (const l of lines) {
      const a = Number(l.amount);
      if (l.accountingType === "PASS_THROUGH") ptotal += a;
      else {
        rtotal += a;
        if (form.vatEnabled && l.vatApplicable) vat += a * (form.vatRate / 100);
      }
    }
    vat = Math.round(vat * 100) / 100;
    return { passThrough: ptotal, revenue: rtotal, vat, total: Math.round((ptotal + rtotal + vat) * 100) / 100 };
  })();

  const addRevenueLine = () => {
    setLines(ls => [...ls, {
      _key: newKey(), description: "", quantity: 1, unitPrice: 0, amount: 0,
      accountingType: "REVENUE", vatApplicable: false,
    }]);
  };

  const addPassThroughLine = (cs: CostSource) => {
    if (lines.some(l => l.accountingType === "PASS_THROUGH" && l.costSourceId === cs.id)) {
      toast.error("هذا المصدر مضاف مسبقاً"); return;
    }
    setLines(ls => [...ls, {
      _key: newKey(), description: `${cs.sourceTypeLabel} — ${cs.sourceNumber}`,
      quantity: 1, unitPrice: Number(cs.availableForAllocation), amount: Number(cs.availableForAllocation),
      accountingType: "PASS_THROUGH", vatApplicable: false,
      costSourceId: cs.id, allocatedAmount: Number(cs.availableForAllocation),
    }]);
  };

  const updateLine = (key: string, updates: Partial<InvoiceLine>) => {
    setLines(ls => ls.map(l => {
      if (l._key !== key) return l;
      const updated = { ...l, ...updates };
      if ("amount" in updates || "quantity" in updates || "unitPrice" in updates) {
        const amt = Number(updated.amount);
        if ("allocatedAmount" in updates) updated.allocatedAmount = Number(updates.allocatedAmount);
        else if (updated.accountingType === "PASS_THROUGH") updated.allocatedAmount = amt;
      }
      return updated;
    }));
  };

  const removeLine = (key: string) => setLines(ls => ls.filter(l => l._key !== key));

  const getSourceAvailable = (costSourceId: string) => {
    const cs = availableCostSources.find(c => c.id === costSourceId);
    return cs ? Number(cs.availableForAllocation) : 0;
  };

  const handleSave = async (asDraft = true) => {
    if (!form.customerId) { toast.error("اختر العميل"); return; }
    if (!lines.length) { toast.error("أضف سطراً واحداً على الأقل"); return; }
    for (const l of lines) {
      if (!l.description) { toast.error("وصف السطر مطلوب"); return; }
      if (Number(l.amount) <= 0) { toast.error("مبلغ السطر يجب أن يكون أكبر من صفر"); return; }
      if (l.accountingType === "PASS_THROUGH" && l.costSourceId) {
        const available = getSourceAvailable(l.costSourceId);
        if (Number(l.allocatedAmount ?? l.amount) > available + 0.01) {
          toast.error(`المبلغ المخصص يتجاوز الرصيد المتاح (${available} ر.س)`); return;
        }
      }
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        lines: lines.map(l => ({
          chargeTypeId: l.chargeTypeId,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          amount: l.amount,
          accountingType: l.accountingType,
          vatApplicable: l.vatApplicable,
          costSourceId: l.costSourceId,
          revenueAccountId: l.revenueAccountId,
          allocatedAmount: l.allocatedAmount,
        })),
      };

      if (editingId) {
        await apiClient.put(`/invoices/${editingId}`, payload);
        toast.success("تم تحديث الفاتورة");
      } else {
        await apiClient.post("/invoices", payload);
        toast.success("تم إنشاء الفاتورة كمسودة");
      }
      setShowModal(false);
      fetchList();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "حدث خطأ");
    } finally { setSaving(false); }
  };

  const handlePost = async (id: string) => {
    if (!confirm("هل أنت متأكد من ترحيل الفاتورة؟ لا يمكن التراجع.")) return;
    setSaving(true);
    try {
      await apiClient.post(`/invoices/${id}/post`);
      toast.success("تم ترحيل الفاتورة وإنشاء القيد المحاسبي");
      setShowDetail(false);
      fetchList();
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "فشل الترحيل");
    } finally { setSaving(false); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("إلغاء الفاتورة؟")) return;
    try {
      await apiClient.patch(`/invoices/${id}/cancel`);
      toast.success("تم إلغاء الفاتورة");
      setShowDetail(false);
      fetchList();
    } catch (err: any) { toast.error(err.response?.data?.error ?? "حدث خطأ"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الفواتير</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة فواتير الخدمة والتخصيص من مصادر التكلفة</p>
        </div>
        {canCreate && (
          <button onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            + إنشاء فاتورة
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex gap-3 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالرقم..." className="input flex-1 min-w-40" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input min-w-36">
            <option value="">جميع الحالات</option>
            <option value="DRAFT">مسودة</option>
            <option value="POSTED">مرحّلة</option>
            <option value="CANCELLED">ملغاة</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">جاري التحميل...</div>
        ) : !invoicesList.length ? (
          <div className="p-10 text-center text-gray-400">لا توجد فواتير</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-right font-medium text-gray-600">رقم الفاتورة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">العميل</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">التاريخ</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الإجمالي</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">المسدّد</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">المتبقي</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoicesList.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-700">{inv.number}</td>
                  <td className="px-4 py-3 text-gray-700">{inv.customerNameAr ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(inv.date)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatAmount(inv.totalAmount)}</td>
                  <td className="px-4 py-3 text-green-700">{formatAmount(inv.paidAmount)}</td>
                  <td className="px-4 py-3 font-semibold text-amber-700">{formatAmount(inv.outstandingAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {STATUS_LABELS[inv.status] ?? inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openDetail(inv)}
                        className="text-xs text-blue-600 hover:underline">عرض</button>
                      {inv.status === "DRAFT" && canEdit && (
                        <button onClick={() => openEdit(inv)}
                          className="text-xs text-gray-600 hover:underline">تعديل</button>
                      )}
                      {inv.status === "DRAFT" && canPost && (
                        <button onClick={() => handlePost(inv.id)}
                          className="text-xs text-green-700 hover:underline font-medium">ترحيل</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} size="xl"
        title={editingId ? "تعديل فاتورة" : "إنشاء فاتورة جديدة"}>
        <div className="space-y-5 text-sm">
          {/* Header fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">العميل *</label>
              <select value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))} className="input w-full">
                <option value="">اختر عميلاً</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.code} — {c.nameAr}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">تاريخ الفاتورة *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">تاريخ الاستحقاق</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="input w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ملاحظات</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input w-full" placeholder="ملاحظات اختيارية" />
            </div>
          </div>

          {/* Revenue Lines */}
          <div className="border border-green-200 rounded-lg overflow-hidden">
            <div className="bg-green-50 px-4 py-2 flex items-center justify-between">
              <span className="font-semibold text-green-800 text-sm">أسطر الإيراد (رسوم الخدمة)</span>
              <button onClick={addRevenueLine}
                className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors">
                + إضافة سطر إيراد
              </button>
            </div>
            {lines.filter(l => l.accountingType === "REVENUE").length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-xs">لا توجد أسطر إيراد — أضف رسوم الخدمة هنا</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-right">الوصف</th>
                    <th className="px-3 py-2 text-right w-24">المبلغ (ر.س)</th>
                    <th className="px-3 py-2 text-right w-28">نوع الرسم</th>
                    <th className="px-3 py-2 text-right w-20">ض.ق.م 15%</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.filter(l => l.accountingType === "REVENUE").map(l => (
                    <tr key={l._key} className="border-t border-gray-100">
                      <td className="px-3 py-2">
                        <input value={l.description} onChange={e => updateLine(l._key, { description: e.target.value })}
                          className="input w-full text-xs" placeholder="وصف السطر" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" step="0.01" value={l.amount}
                          onChange={e => updateLine(l._key, { amount: Number(e.target.value), unitPrice: Number(e.target.value) })}
                          className="input w-full text-xs" />
                      </td>
                      <td className="px-3 py-2">
                        <select value={l.chargeTypeId ?? ""} onChange={e => {
                          const ct = chargeTypes.find(c => c.id === e.target.value);
                          updateLine(l._key, {
                            chargeTypeId: e.target.value || undefined,
                            vatApplicable: ct?.vatApplicable ?? false,
                            revenueAccountId: ct?.defaultRevenueAccountId,
                          });
                        }} className="input w-full text-xs">
                          <option value="">— اختر —</option>
                          {chargeTypes.filter(ct => ct.accountingType === "REVENUE").map(ct =>
                            <option key={ct.id} value={ct.id}>{ct.nameAr}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked={l.vatApplicable}
                          onChange={e => updateLine(l._key, { vatApplicable: e.target.checked })} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => removeLine(l._key)} className="text-red-500 hover:text-red-700 font-bold">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pass-Through Lines — cost source picker */}
          <div className="border border-orange-200 rounded-lg overflow-hidden">
            <div className="bg-orange-50 px-4 py-2">
              <span className="font-semibold text-orange-800 text-sm">التكاليف بالنيابة (تخصيص من مصادر التكلفة)</span>
            </div>
            {availableCostSources.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-xs">لا توجد مصادر تكلفة متاحة للتخصيص</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-right">المصدر</th>
                    <th className="px-3 py-2 text-right">النوع</th>
                    <th className="px-3 py-2 text-right w-28">المتبقي (ر.س)</th>
                    <th className="px-3 py-2 text-right w-28">المخصص (ر.س)</th>
                    <th className="px-3 py-2 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {availableCostSources.map(cs => {
                    const existingLine = lines.find(l => l.accountingType === "PASS_THROUGH" && l.costSourceId === cs.id);
                    return (
                      <tr key={cs.id} className={`border-t border-gray-100 ${existingLine ? "bg-orange-50" : ""}`}>
                        <td className="px-3 py-2 font-mono text-orange-700">{cs.sourceNumber}</td>
                        <td className="px-3 py-2 text-gray-600">{cs.sourceTypeLabel}</td>
                        <td className="px-3 py-2 font-semibold text-gray-800">{formatAmount(cs.availableForAllocation)}</td>
                        <td className="px-3 py-2">
                          {existingLine ? (
                            <input type="number" step="0.01" max={Number(cs.availableForAllocation)}
                              value={existingLine.allocatedAmount ?? existingLine.amount}
                              onChange={e => {
                                const amt = Math.min(Number(e.target.value), Number(cs.availableForAllocation));
                                updateLine(existingLine._key, { amount: amt, unitPrice: amt, allocatedAmount: amt });
                              }}
                              className="input w-full text-xs" />
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {existingLine ? (
                            <button onClick={() => removeLine(existingLine._key)}
                              className="text-red-500 hover:text-red-700 text-xs font-bold">إزالة</button>
                          ) : (
                            <button onClick={() => addPassThroughLine(cs)}
                              className="text-xs text-orange-700 border border-orange-400 px-2 py-0.5 rounded hover:bg-orange-100">تخصيص</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Totals summary */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">التكاليف بالنيابة</div>
                <div className="font-semibold text-orange-700">{formatAmount(totals.passThrough.toFixed(2))}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">رسوم الخدمة</div>
                <div className="font-semibold text-green-700">{formatAmount(totals.revenue.toFixed(2))}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">ضريبة ق.م (15%)</div>
                <div className="font-semibold text-blue-700">{formatAmount(totals.vat.toFixed(2))}</div>
              </div>
              <div className="text-center border-r border-gray-300">
                <div className="text-xs text-gray-500 mb-1">الإجمالي الكلي</div>
                <div className="text-lg font-bold text-gray-900">{formatAmount(totals.total.toFixed(2))}</div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary" disabled={saving}>إلغاء</button>
            <button onClick={() => handleSave(true)} disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? "جاري الحفظ..." : "حفظ كمسودة"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      {selected && (
        <Modal open={showDetail} onClose={() => setShowDetail(false)} size="xl"
          title={`فاتورة — ${selected.number}`}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
              <div><span className="text-gray-500 text-xs">العميل:</span><br /><span className="font-semibold">{selected.customerNameAr}</span></div>
              <div><span className="text-gray-500 text-xs">التاريخ:</span><br /><span className="font-semibold">{formatDate(selected.date)}</span></div>
              <div><span className="text-gray-500 text-xs">الحالة:</span><br />
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selected.status]}`}>{STATUS_LABELS[selected.status]}</span>
              </div>
            </div>

            {/* Lines */}
            <table className="w-full text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-right">الوصف</th>
                  <th className="px-3 py-2 text-right">النوع</th>
                  <th className="px-3 py-2 text-right">المبلغ</th>
                  <th className="px-3 py-2 text-right">ض.ق.م</th>
                  <th className="px-3 py-2 text-right">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(selected.lines ?? []).map((l: any) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2">{l.description}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${l.accountingType === "PASS_THROUGH" ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"}`}>
                        {TYPE_LABELS[l.accountingType] ?? l.accountingType}
                      </span>
                    </td>
                    <td className="px-3 py-2">{formatAmount(l.amount)}</td>
                    <td className="px-3 py-2">{formatAmount(l.vatAmount)}</td>
                    <td className="px-3 py-2 font-semibold">{formatAmount(l.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="grid grid-cols-4 gap-3 bg-gray-50 p-3 rounded-lg text-center">
              <div>
                <div className="text-xs text-gray-500">بالنيابة</div>
                <div className="font-semibold text-orange-700">{formatAmount(selected.subtotalPassThrough)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">إيرادات</div>
                <div className="font-semibold text-green-700">{formatAmount(selected.subtotalRevenue)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">ض.ق.م</div>
                <div className="font-semibold text-blue-700">{formatAmount(selected.vatAmount)}</div>
              </div>
              <div className="border-r border-gray-300">
                <div className="text-xs text-gray-500">الإجمالي</div>
                <div className="text-lg font-bold text-gray-900">{formatAmount(selected.totalAmount)}</div>
              </div>
            </div>

            <div className="flex gap-3 justify-between items-center pt-2">
              <div className="text-sm">
                <span className="text-gray-500">مسدّد: </span>
                <span className="text-green-700 font-semibold">{formatAmount(selected.paidAmount)}</span>
                <span className="mx-2 text-gray-300">|</span>
                <span className="text-gray-500">متبقي: </span>
                <span className="text-amber-700 font-semibold">{formatAmount(selected.outstandingAmount)}</span>
              </div>
              <div className="flex gap-2">
                {selected.status === "DRAFT" && canPost && (
                  <button onClick={() => handlePost(selected.id)} disabled={saving}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    ترحيل الفاتورة
                  </button>
                )}
                {selected.status === "DRAFT" && canEdit && (
                  <button onClick={() => { setShowDetail(false); openEdit(selected); }}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    تعديل
                  </button>
                )}
                {selected.status === "DRAFT" && canEdit && (
                  <button onClick={() => handleCancel(selected.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    إلغاء
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
