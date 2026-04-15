import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import { Pencil, X, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

interface Sequence {
  id: string; module: string; nameAr: string; prefix: string;
  currentNumber: number; currentYear: number; padding: number; separator: string;
}

const moduleLabels: Record<string, string> = {
  customers: "العملاء", agents: "وكلاء الشحن", invoices: "الفواتير",
  receipts: "سندات القبض", payments: "سندات الصرف",
  journal_entries: "القيود اليومية", clearance_files: "ملفات التخليص",
};

export default function Sequences() {
  const [data, setData] = useState<{ data: Sequence[]; pagination: any } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Sequence | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { register, handleSubmit, reset } = useForm<any>();

  const load = useCallback(async () => {
    setIsLoading(true);
    try { const res = await api("/sequences").get({ limit: 50 } as any); setData(res as any); } catch {} finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (s: Sequence) => { setEditing(s); reset({ ...s }); setError(""); setModalOpen(true); };

  const onSubmit = async (values: any) => {
    setSaving(true); setError("");
    try {
      await api(`/sequences/${editing!.id}`).put({ prefix: values.prefix, padding: parseInt(values.padding), separator: values.separator });
      setModalOpen(false); load();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const columns = [
    { key: "module", headerAr: "الوحدة", render: (r: Sequence) => <span className="font-medium">{moduleLabels[r.module] ?? r.module}</span> },
    { key: "nameAr", headerAr: "الوصف" },
    { key: "prefix", headerAr: "البادئة", render: (r: Sequence) => <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-bold">{r.prefix}</code> },
    { key: "currentNumber", headerAr: "الرقم الحالي", render: (r: Sequence) => <span className="font-mono font-bold text-primary">{r.currentNumber}</span> },
    { key: "currentYear", headerAr: "السنة", render: (r: Sequence) => <span className="font-mono">{r.currentYear}</span> },
    { key: "preview", headerAr: "مثال", render: (r: Sequence) => {
      const num = String(r.currentNumber + 1).padStart(r.padding, "0");
      return <code className="text-xs bg-muted/80 px-1.5 py-0.5 rounded">{r.prefix}{r.currentYear}{r.separator}{num}</code>;
    }},
    { key: "actions", headerAr: "", render: (r: Sequence) => (
      <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="p-1.5 hover:bg-muted rounded text-muted-foreground"><Pencil size={13} /></button>
    )},
  ];

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring";
  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div><label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>{children}</div>
  );

  return (
    <div dir="rtl">
      <PageHeader titleAr="التسلسلات الرقمية" subtitleAr="إدارة قواعد ترقيم الوثائق والمستندات" />
      <DataTable columns={columns} data={data?.data ?? []} isLoading={isLoading} emptyMessageAr="لا توجد تسلسلات" />
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-bold">تعديل التسلسل: {editing ? (moduleLabels[editing.module] ?? editing.module) : ""}</h3>
              <button onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
              <F label="البادئة"><input {...register("prefix")} className={inputCls} /></F>
              <div className="grid grid-cols-2 gap-3">
                <F label="عدد خانات الرقم"><input {...register("padding")} type="number" min={1} max={8} className={inputCls} /></F>
                <F label="الفاصل"><input {...register("separator")} maxLength={2} className={inputCls} placeholder="-" /></F>
              </div>
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
