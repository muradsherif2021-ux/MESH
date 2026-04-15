import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Plus, ChevronDown, ChevronRight, Lock, X, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

interface Period {
  id: string; periodNumber: number; nameAr: string; startDate: string; endDate: string; status: string;
}
interface FiscalYear {
  id: string; name: string; nameAr: string; startDate: string; endDate: string; status: string; periods?: Period[];
}

export default function FiscalYears() {
  const [years, setYears] = useState<FiscalYear[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [periods, setPeriods] = useState<Record<string, Period[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, reset } = useForm<any>();

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api("/fiscal-years").get();
      setYears(res as any);
    } catch {} finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadPeriods = async (fyId: string) => {
    if (periods[fyId]) return;
    try {
      const res = await api(`/fiscal-years/${fyId}/periods`).get();
      setPeriods(p => ({ ...p, [fyId]: res as any }));
    } catch {}
  };

  const toggleExpand = (id: string) => {
    setExpanded(e => e === id ? null : id);
    loadPeriods(id);
  };

  const closePeriod = async (fyId: string, periodId: string) => {
    try {
      await api(`/fiscal-years/${fyId}/periods/${periodId}/close`).patch({});
      setPeriods(p => ({ ...p, [fyId]: p[fyId]?.map(pr => pr.id === periodId ? { ...pr, status: "CLOSED" } : pr) ?? [] }));
    } catch {}
  };

  const onSubmit = async (values: any) => {
    setSaving(true); setError("");
    try {
      await api("/fiscal-years").post(values);
      setModalOpen(false); load();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring";
  function F({ label, children }: { label: string; children: React.ReactNode }) {
    return <div><label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>{children}</div>;
  }

  return (
    <div dir="rtl">
      <PageHeader titleAr="السنوات المالية" subtitleAr="إدارة الفترات المالية وحالة الإغلاق"
        action={<button onClick={() => { reset(); setError(""); setModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"><Plus size={15} /> إضافة سنة مالية</button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {years.map(fy => (
            <div key={fy.id} className="rounded-xl border border-border bg-card overflow-hidden">
              <button className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/20 transition-colors text-right" onClick={() => toggleExpand(fy.id)}>
                <div className="flex-1">
                  <div className="font-bold text-base">{fy.nameAr}</div>
                  <div className="text-xs text-muted-foreground ltr">{fy.startDate} → {fy.endDate}</div>
                </div>
                <StatusBadge status={fy.status} />
                {expanded === fy.id ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
              </button>

              {expanded === fy.id && (
                <div className="border-t border-border p-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">الفترات الشهرية</div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {(periods[fy.id] ?? []).map(period => (
                      <div key={period.id} className={`rounded-lg p-2.5 text-center border ${period.status === "CLOSED" ? "border-border bg-muted/30" : "border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20"}`}>
                        <div className="text-xs font-medium text-foreground truncate">{period.nameAr}</div>
                        <StatusBadge status={period.status} />
                        {period.status === "OPEN" && fy.status === "OPEN" && (
                          <button onClick={() => closePeriod(fy.id, period.id)} className="mt-1 text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 mx-auto">
                            <Lock size={10} /> إغلاق
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {years.length === 0 && <div className="text-center py-16 text-muted-foreground">لا توجد سنوات مالية بعد</div>}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-bold">إضافة سنة مالية</h3>
              <button onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
              <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">سيتم إنشاء 12 فترة شهرية تلقائياً.</div>
              <F label="رمز السنة (مثل: 2026)"><input {...register("name", { required: true })} className={inputCls} placeholder="2026" /></F>
              <F label="الاسم بالعربي *"><input {...register("nameAr", { required: true })} className={inputCls} placeholder="السنة المالية 2026" /></F>
              <div className="grid grid-cols-2 gap-3">
                <F label="تاريخ البداية *"><input {...register("startDate", { required: true })} type="date" className={inputCls} /></F>
                <F label="تاريخ النهاية *"><input {...register("endDate", { required: true })} type="date" className={inputCls} /></F>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg hover:bg-muted">إلغاء</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-60">
                  {saving && <Loader2 size={14} className="animate-spin" />} إنشاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
