import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Shield, X, Loader2, ChevronDown, ChevronRight } from "lucide-react";

interface Role {
  id: string; name: string; nameAr: string; isSystem: boolean; isActive: boolean;
  permissionCount?: number;
}
interface Permission {
  id: string; module: string; screen: string; action: string; nameAr: string;
}

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalRole, setModalRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePerms, setRolePerms] = useState<Set<string>>(new Set());
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api("/roles").get({ limit: 50 } as any);
      setRoles((res as any).data ?? []);
    } catch {} finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openRole = async (role: Role) => {
    setModalRole(role);
    setLoadingPerms(true);
    try {
      const [allPerms, rPerms] = await Promise.all([
        api("/permissions").get({ limit: 500 } as any),
        api(`/roles/${role.id}/permissions`).get(),
      ]);
      setPermissions((allPerms as any).data ?? []);
      const assigned = new Set<string>(((rPerms as any) ?? []).map((p: any) => p.id));
      setRolePerms(assigned);
      // Expand first 3 modules by default
      const mods = [...new Set(((allPerms as any).data ?? []).map((p: Permission) => p.module))] as string[];
      setExpandedModules(new Set(mods.slice(0, 3)));
    } catch {} finally { setLoadingPerms(false); }
  };

  const togglePerm = (id: string) => {
    setRolePerms(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleModule = (mod: string, ids: string[]) => {
    const allOn = ids.every(id => rolePerms.has(id));
    setRolePerms(prev => {
      const next = new Set(prev);
      ids.forEach(id => allOn ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const savePerms = async () => {
    if (!modalRole) return;
    setSaving(true);
    try {
      await api(`/roles/${modalRole.id}/permissions`).put({ permissionIds: [...rolePerms] });
      setModalRole(null);
      load();
    } catch {} finally { setSaving(false); }
  };

  // Group permissions by module
  const grouped: Record<string, Permission[]> = {};
  for (const p of permissions) {
    if (!grouped[p.module]) grouped[p.module] = [];
    grouped[p.module].push(p);
  }

  const actionLabels: Record<string, string> = {
    view: "عرض", create: "إنشاء", edit: "تعديل", delete: "حذف",
    post: "ترحيل", reverse: "عكس", print: "طباعة", export: "تصدير", approve: "اعتماد",
  };

  const moduleLabels: Record<string, string> = {
    users: "المستخدمون", roles: "الأدوار", permissions: "الصلاحيات",
    branches: "الفروع", settings: "الإعدادات", sequences: "التسلسلات",
    customers: "العملاء", agents: "وكلاء الشحن", treasuries: "الخزائن",
    bank_accounts: "الحسابات البنكية", charge_types: "أنواع الرسوم",
    accounts: "دليل الحسابات", fiscal_years: "السنوات المالية",
    audit_logs: "سجل الأحداث", notifications: "الإشعارات",
  };

  const columns = [
    { key: "nameAr", headerAr: "الاسم بالعربي", render: (r: Role) => <span className="font-semibold">{r.nameAr}</span> },
    { key: "name", headerAr: "المعرف", render: (r: Role) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.name}</code> },
    { key: "isSystem", headerAr: "نوع", render: (r: Role) => r.isSystem ? <span className="text-xs text-primary font-medium">نظامي</span> : <span className="text-xs text-muted-foreground">مخصص</span> },
    { key: "isActive", headerAr: "الحالة", render: (r: Role) => <StatusBadge status={r.isActive ? "ACTIVE" : "INACTIVE"} /> },
    { key: "actions", headerAr: "الصلاحيات", render: (r: Role) => (
      <button onClick={() => openRole(r)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary hover:bg-primary/20">
        <Shield size={12} /> إدارة الصلاحيات
      </button>
    )},
  ];

  return (
    <div dir="rtl">
      <PageHeader titleAr="الأدوار والصلاحيات" subtitleAr="إدارة أدوار المستخدمين والتحكم في الوصول" />
      <DataTable columns={columns} data={roles} isLoading={isLoading} emptyMessageAr="لا توجد أدوار" />

      {modalRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <h3 className="font-bold">صلاحيات الدور: {modalRole.nameAr}</h3>
                {modalRole.isSystem && <p className="text-xs text-amber-600 mt-0.5">دور نظامي — سيتم حفظ التعديلات</p>}
              </div>
              <button onClick={() => setModalRole(null)}><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingPerms ? (
                <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(grouped).map(([mod, perms]) => {
                    const ids = perms.map(p => p.id);
                    const allOn = ids.every(id => rolePerms.has(id));
                    const someOn = ids.some(id => rolePerms.has(id));
                    const expanded = expandedModules.has(mod);
                    return (
                      <div key={mod} className="rounded-lg border border-border overflow-hidden">
                        <button
                          className="w-full flex items-center gap-2 px-3 py-2.5 bg-muted/30 hover:bg-muted/50 text-right"
                          onClick={() => setExpandedModules(prev => { const n = new Set(prev); expanded ? n.delete(mod) : n.add(mod); return n; })}
                        >
                          <input type="checkbox" checked={allOn} ref={el => { if (el) el.indeterminate = someOn && !allOn; }}
                            onChange={() => toggleModule(mod, ids)} onClick={e => e.stopPropagation()}
                            className="rounded ml-1" />
                          <span className="text-sm font-medium flex-1">{moduleLabels[mod] ?? mod}</span>
                          <span className="text-xs text-muted-foreground">{ids.filter(id => rolePerms.has(id)).length}/{ids.length}</span>
                          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        {expanded && (
                          <div className="flex flex-wrap gap-2 p-3">
                            {perms.map(p => (
                              <label key={p.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-pointer transition-colors ${rolePerms.has(p.id) ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground"}`}>
                                <input type="checkbox" checked={rolePerms.has(p.id)} onChange={() => togglePerm(p.id)} className="hidden" />
                                {actionLabels[p.action] ?? p.action}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-border flex justify-between items-center shrink-0">
              <span className="text-xs text-muted-foreground">{rolePerms.size} صلاحية محددة</span>
              <div className="flex gap-3">
                <button onClick={() => setModalRole(null)} className="px-4 py-2 text-sm rounded-lg hover:bg-muted">إلغاء</button>
                <button onClick={savePerms} disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-60">
                  {saving && <Loader2 size={14} className="animate-spin" />} حفظ الصلاحيات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
