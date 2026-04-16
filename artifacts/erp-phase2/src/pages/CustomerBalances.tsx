import { useState, useEffect } from "react";
import { apiClient } from "../lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Modal from "@/components/Modal";
import { formatDate, formatAmount } from "../lib/format";

interface CustomerBalance {
  customerId: string; customerNameAr: string; customerCode: string; customerVatNumber?: string;
  totalInvoiced: string; totalPaid: string; totalOutstanding: string; invoiceCount: number;
}

const STATUS_LABELS: Record<string, string> = { DRAFT: "مسودة", POSTED: "مرحّلة", CANCELLED: "ملغاة" };
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-amber-100 text-amber-800", POSTED: "bg-green-100 text-green-800", CANCELLED: "bg-red-100 text-red-800",
};

export default function CustomerBalances() {
  const { hasPermission } = useAuth();
  const canView = hasPermission("invoices", "view");

  const [balances, setBalances] = useState<CustomerBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetail, setShowDetail] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!canView) return;
    setLoading(true);
    apiClient.get("/customer-balances").then(res => {
      setBalances(res.data.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const openDetail = async (customerId: string) => {
    setLoadingDetail(true);
    setShowDetail(true);
    try {
      const res = await apiClient.get(`/customer-balances/${customerId}`);
      setDetail(res.data);
    } finally { setLoadingDetail(false); }
  };

  const totalInvoiced = balances.reduce((s, b) => s + Number(b.totalInvoiced), 0);
  const totalPaid = balances.reduce((s, b) => s + Number(b.totalPaid), 0);
  const totalOutstanding = balances.reduce((s, b) => s + Number(b.totalOutstanding), 0);

  if (!canView) return (
    <div className="p-10 text-center text-gray-400">ليس لديك صلاحية عرض أرصدة العملاء</div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">أرصدة العملاء</h1>
        <p className="text-sm text-gray-500 mt-1">الذمم المدينة وأرصدة العملاء من الفواتير المرحّلة</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">إجمالي الفواتير المرحّلة</div>
          <div className="text-2xl font-bold text-gray-900">{formatAmount(totalInvoiced.toFixed(2))}</div>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-5 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">إجمالي المحصّل</div>
          <div className="text-2xl font-bold text-green-700">{formatAmount(totalPaid.toFixed(2))}</div>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-5 shadow-sm">
          <div className="text-xs text-gray-500 mb-1">إجمالي الذمم المتبقية</div>
          <div className="text-2xl font-bold text-amber-700">{formatAmount(totalOutstanding.toFixed(2))}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">جاري التحميل...</div>
        ) : !balances.length ? (
          <div className="p-10 text-center text-gray-400">لا توجد ذمم مدينة من فواتير مرحّلة</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-right font-medium text-gray-600">كود العميل</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">اسم العميل</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">ع. الفواتير</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">إجمالي الفواتير</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">المحصّل</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">المتبقي</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {balances.map(b => (
                <tr key={b.customerId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-700">{b.customerCode}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{b.customerNameAr}</td>
                  <td className="px-4 py-3 text-gray-600 text-center">{b.invoiceCount}</td>
                  <td className="px-4 py-3 text-gray-800">{formatAmount(b.totalInvoiced)}</td>
                  <td className="px-4 py-3 text-green-700">{formatAmount(b.totalPaid)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${Number(b.totalOutstanding) > 0 ? "text-amber-700" : "text-gray-400"}`}>
                      {formatAmount(b.totalOutstanding)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openDetail(b.customerId)}
                      className="text-xs text-blue-600 hover:underline">
                      كشف حساب
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Customer Detail Modal */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} size="xl"
        title={detail ? `كشف حساب — ${detail.customer?.nameAr}` : "كشف حساب"}>
        {loadingDetail ? (
          <div className="p-10 text-center text-gray-400">جاري التحميل...</div>
        ) : detail ? (
          <div className="space-y-5 text-sm">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">إجمالي الفواتير</div>
                <div className="font-bold text-gray-900">{formatAmount(detail.summary.totalInvoiced)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">المحصّل</div>
                <div className="font-bold text-green-700">{formatAmount(detail.summary.totalPaid)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">المتبقي</div>
                <div className="font-bold text-amber-700">{formatAmount(detail.summary.totalOutstanding)}</div>
              </div>
            </div>

            {/* Invoices */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">الفواتير</h3>
              {detail.openInvoices?.length === 0 ? (
                <div className="text-xs text-gray-400 p-3">لا توجد فواتير</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-right">رقم الفاتورة</th>
                      <th className="px-3 py-2 text-right">التاريخ</th>
                      <th className="px-3 py-2 text-right">الإجمالي</th>
                      <th className="px-3 py-2 text-right">المسدّد</th>
                      <th className="px-3 py-2 text-right">المتبقي</th>
                      <th className="px-3 py-2 text-right">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.openInvoices.map((inv: any) => (
                      <tr key={inv.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-mono text-blue-700">{inv.number}</td>
                        <td className="px-3 py-2">{formatDate(inv.date)}</td>
                        <td className="px-3 py-2 font-semibold">{formatAmount(inv.totalAmount)}</td>
                        <td className="px-3 py-2 text-green-700">{formatAmount(inv.paidAmount)}</td>
                        <td className="px-3 py-2 font-semibold text-amber-700">{formatAmount(inv.outstandingAmount)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status]}`}>
                            {STATUS_LABELS[inv.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Receipts */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">سندات القبض</h3>
              {detail.receipts?.length === 0 ? (
                <div className="text-xs text-gray-400 p-3">لا توجد سندات قبض</div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-right">رقم السند</th>
                      <th className="px-3 py-2 text-right">التاريخ</th>
                      <th className="px-3 py-2 text-right">المبلغ</th>
                      <th className="px-3 py-2 text-right">المطبّق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.receipts.map((r: any) => (
                      <tr key={r.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-mono text-blue-700">{r.number}</td>
                        <td className="px-3 py-2">{formatDate(r.date)}</td>
                        <td className="px-3 py-2 font-semibold">{formatAmount(r.amount)}</td>
                        <td className="px-3 py-2 text-green-700">{formatAmount(r.appliedAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
