import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Plus, ChevronDown, ChevronRight, Lock, Unlock, Search, X, Loader2, Info } from "lucide-react";
import { useForm } from "react-hook-form";

const typeColors: Record<string, string> = {
  ASSET: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
  LIABILITY: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30",
  EQUITY: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30",
  REVENUE: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
  EXPENSE: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30",
};
const typeLabels: Record<string, string> = { ASSET: "أصول", LIABILITY: "التزامات", EQUITY: "حقوق ملكية", REVENUE: "إيرادات", EXPENSE: "مصروفات" };

interface Account {
  id: string; code: string; nameAr: string; nameEn?: string;
  type: string; normalBalance: string; level: number; parentId?: string;
  allowPosting: boolean; isSystemAccount: boolean; isActive: boolean;
  notes?: string; children?: Account[];
}

function AccountRow({ account, depth = 0, onEdit }: { account: Account; depth?: number; onEdit: (a: Account) => void }) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = account.children && account.children.length > 0;
  return (
    <>
      <tr className={`border-b border-border/50 hover:bg-muted/20 ${depth === 0 ? "bg-muted/30 font-bold" : depth === 1 ? "bg-muted/10 font-semibold" : "bg-background"}`}>
        <td className="px-4 py-2.5 font-mono text-xs" style={{ paddingRight: `${16 + depth * 20}px` }}>
          {hasChildren ? (
            <button onClick={() => setOpen(!open)} className="ml-1 text-muted-foreground">
              {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          ) : <span className="inline-block w-4 ml-1" />}
          <span className={`font-bold ${typeColors[account.type]?.split(" ")[0]}`}>{account.code}</span>
        </td>
        <td className="px-4 py-2.5 text-sm">{account.nameAr}{account.isSystemAccount && <span className="mr-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">نظامي</span>}</td>
        <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[account.type]}`}>{typeLabels[account.type]}</span></td>
        <td className="px-4 py-2.5 text-center">{account.allowPosting ? <Unlock size={13} className="mx-auto text-emerald-500" /> : <Lock size={13} className="mx-auto text-muted-foreground" />}</td>
        <td className="px-4 py-2.5 text-center"><span className={`text-xs font-medium ${account.normalBalance === "DEBIT" ? "text-blue-600" : "text-red-600"}`}>{account.normalBalance === "DEBIT" ? "مدين" : "دائن"}</span></td>
        <td className="px-4 py-2.5 text-center"><StatusBadge status={account.isActive ? "ACTIVE" : "INACTIVE"} /></td>
        <td className="px-4 py-2.5">
          {!account.isSystemAccount && <button onClick={() => onEdit(account)} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"><Search size={13} /></button>}
        </td>
      </tr>
      {hasChildren && open && account.children!.map(child => <AccountRow key={child.id} account={child} depth={depth + 1} onEdit={onEdit} />)}
    </>
  );
}

export default function Accounts() {
  const [tree, setTree] = useState<Account[]>([]);
  const [flatList, setFlatList] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"tree" | "list">("tree");

  const { register, handleSubmit, reset } = useForm<any>();

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [treeData, listData] = await Promise.all([
        api("/accounts/tree").get(),
        api("/accounts").get({ limit: 200 } as any),
      ]);
      setTree(treeData as any);
      setFlatList((listData as any).data ?? []);
    } catch {} finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); reset({ type: "ASSET", normalBalance: "DEBIT", level: 3, allowPosting: true, isActive: true }); setError(""); setModalOpen(true); };
  const openEdit = (a: Account) => { setEditing(a); reset({ ...a }); setError(""); setModalOpen(true); };

  const onSubmit = async (values: any) => {
    setSaving(true); setError("");
    try {
      values.allowPosting = values.allowPosting === "true" || values.allowPosting === true;
      values.level = parseInt(values.level);
      if (editing) await api(`/accounts/${editing.id}`).put(values);
      else await api("/accounts").post(values);
      setModalOpen(false); load();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring";
  function F({ label, children }: { label: string; children: React.ReactNode }) {
    return <div><label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>{children}</div>;
  }

  return (
    <div dir="rtl">
      <PageHeader titleAr="دليل الحسابات" subtitleAr="الهرم المحاسبي الثلاثي — عربي أولاً — IFRS وزاتكا"
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => setView(v => v === "tree" ? "list" : "tree")} className="px-3 py-2 text-sm rounded-lg bg-muted hover:bg-muted/80 font-medium">
              {view === "tree" ? "عرض قائمة" : "عرض شجري"}
            </button>
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              <Plus size={15} /> إضافة حساب
            </button>
          </div>
        }
      />

      <div className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2">
        <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-400">الحساب <strong>1104</strong> — تكاليف قابلة للاسترداد — هو المحور الأساسي لنموذج الوكيل. لا يمكن تعديل الحسابات النظامية.</p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir="rtl">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">الكود</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">اسم الحساب</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">النوع</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">ترحيل</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">الرصيد</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">الحالة</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {view === "tree"
                  ? tree.map(acc => <AccountRow key={acc.id} account={acc} depth={0} onEdit={openEdit} />)
                  : flatList.map((acc, i) => (
                    <tr key={acc.id} className={`border-b border-border/50 hover:bg-muted/20 ${i % 2 === 0 ? "bg-background" : "bg-muted/10"}`}>
                      <td className="px-4 py-2.5 font-mono text-xs font-bold text-primary">{acc.code}</td>
                      <td className="px-4 py-2.5 text-sm">{acc.nameAr}</td>
                      <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[acc.type]}`}>{typeLabels[acc.type]}</span></td>
                      <td className="px-4 py-2.5 text-center">{acc.allowPosting ? <Unlock size={13} className="mx-auto text-emerald-500" /> : <Lock size={13} className="mx-auto text-muted-foreground" />}</td>
                      <td className="px-4 py-2.5 text-center text-xs font-medium">{acc.normalBalance === "DEBIT" ? "مدين" : "دائن"}</td>
                      <td className="px-4 py-2.5 text-center"><StatusBadge status={acc.isActive ? "ACTIVE" : "INACTIVE"} /></td>
                      <td className="px-4 py-2.5">{!acc.isSystemAccount && <button onClick={() => openEdit(acc)} className="p-1.5 hover:bg-muted rounded text-muted-foreground"><Search size={13} /></button>}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-bold">{editing ? "تعديل حساب" : "إضافة حساب جديد"}</h3>
              <button onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <F label="الكود *"><input {...register("code", { required: true })} className={inputCls} /></F>
                <F label="المستوى *">
                  <select {...register("level")} className={inputCls}><option value={1}>1 — رئيسي</option><option value={2}>2 — فرعي</option><option value={3}>3 — تفصيلي</option></select>
                </F>
              </div>
              <F label="الاسم بالعربي *"><input {...register("nameAr", { required: true })} className={inputCls} /></F>
              <F label="الاسم بالإنجليزي"><input {...register("nameEn")} className={inputCls} /></F>
              <div className="grid grid-cols-2 gap-3">
                <F label="النوع *">
                  <select {...register("type")} className={inputCls}>
                    {Object.entries(typeLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </F>
                <F label="الرصيد الطبيعي *">
                  <select {...register("normalBalance")} className={inputCls}><option value="DEBIT">مدين</option><option value="CREDIT">دائن</option></select>
                </F>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label="الحساب الأم"><input {...register("parentId")} className={inputCls} placeholder="UUID الحساب الأم" /></F>
                <F label="يسمح بالترحيل">
                  <select {...register("allowPosting")} className={inputCls}><option value="true">نعم</option><option value="false">لا</option></select>
                </F>
              </div>
              <F label="ملاحظات"><input {...register("notes")} className={inputCls} /></F>
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
