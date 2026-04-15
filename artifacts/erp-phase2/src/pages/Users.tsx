import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Plus, Pencil, Search, X, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

interface User {
  id: string; username: string; nameAr: string; nameEn?: string;
  email?: string; status: string; roleId?: string; lastLoginAt?: string;
  createdAt: string;
}

export default function Users() {
  const [data, setData] = useState<{ data: User[]; pagination: any } | null>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, reset } = useForm<any>();

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [res, rolesRes] = await Promise.all([
        api("/users").get({ page, limit: 20, search: search || undefined } as any),
        api("/roles").get({ limit: 100 } as any),
      ]);
      setData(res as any);
      setRoles((rolesRes as any).data ?? []);
    } catch {} finally { setIsLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); reset({ status: "ACTIVE" }); setError(""); setModalOpen(true); };
  const openEdit = (u: User) => { setEditing(u); reset({ ...u, password: undefined }); setError(""); setModalOpen(true); };

  const onSubmit = async (values: any) => {
    setSaving(true); setError("");
    try {
      if (editing) await api(`/users/${editing.id}`).put(values);
      else await api("/users").post(values);
      setModalOpen(false); load();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const statusAction = async (user: User) => {
    const newStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try { await api(`/users/${user.id}/status`).patch({ status: newStatus }); load(); } catch {}
  };

  const columns = [
    { key: "username", headerAr: "اسم المستخدم", render: (r: User) => <span className="font-mono text-xs font-bold text-primary">{r.username}</span> },
    { key: "nameAr", headerAr: "الاسم الكامل" },
    { key: "email", headerAr: "البريد الإلكتروني", render: (r: User) => <span className="text-xs ltr">{r.email ?? "—"}</span> },
    { key: "status", headerAr: "الحالة", render: (r: User) => <StatusBadge status={r.status} /> },
    { key: "lastLoginAt", headerAr: "آخر دخول", render: (r: User) => <span className="text-xs text-muted-foreground">{r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleDateString("ar-SA") : "—"}</span> },
    { key: "actions", headerAr: "", render: (r: User) => (
      <div className="flex items-center gap-1">
        <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="p-1.5 hover:bg-muted rounded text-muted-foreground"><Pencil size={13} /></button>
        <button onClick={(e) => { e.stopPropagation(); statusAction(r); }} className={`p-1.5 hover:bg-muted rounded text-xs font-medium ${r.status === "ACTIVE" ? "text-amber-600" : "text-emerald-600"}`}>
          {r.status === "ACTIVE" ? "تعطيل" : "تفعيل"}
        </button>
      </div>
    )},
  ];

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring";
  function F({ label, children }: { label: string; children: React.ReactNode }) {
    return <div><label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>{children}</div>;
  }

  return (
    <div dir="rtl">
      <PageHeader titleAr="المستخدمون" subtitleAr="إدارة حسابات المستخدمين والصلاحيات"
        action={<button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"><Plus size={15} /> إضافة مستخدم</button>}
      />
      <div className="mb-4">
        <div className="relative max-w-xs">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="بحث..."
            className="w-full pr-9 pl-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <DataTable columns={columns} data={data?.data ?? []} pagination={data?.pagination} onPageChange={setPage} isLoading={isLoading} emptyMessageAr="لا يوجد مستخدمون بعد" />

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-bold">{editing ? "تعديل مستخدم" : "إضافة مستخدم جديد"}</h3>
              <button onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
              {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                <F label="اسم المستخدم *"><input {...register("username", { required: !editing })} className={inputCls} readOnly={!!editing} /></F>
                <F label="البريد الإلكتروني"><input {...register("email")} type="email" className={inputCls} /></F>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label="الاسم بالعربي *"><input {...register("nameAr", { required: true })} className={inputCls} /></F>
                <F label="الاسم بالإنجليزي"><input {...register("nameEn")} className={inputCls} /></F>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label={editing ? "كلمة المرور (اتركها فارغة للإبقاء)" : "كلمة المرور *"}>
                  <input {...register("password", { required: !editing })} type="password" className={inputCls} placeholder={editing ? "••••••••" : ""} />
                </F>
                <F label="الدور"><select {...register("roleId")} className={inputCls}><option value="">— لا يوجد —</option>{roles.map(r => <option key={r.id} value={r.id}>{r.nameAr}</option>)}</select></F>
              </div>
              <F label="الهاتف"><input {...register("phone")} className={inputCls} /></F>
              {editing && <F label="الحالة"><select {...register("status")} className={inputCls}><option value="ACTIVE">نشط</option><option value="INACTIVE">غير نشط</option><option value="LOCKED">مقفول</option></select></F>}
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
