import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Loader2, Save, CheckCircle } from "lucide-react";

interface Setting { id: string; key: string; value: string; category: string; nameAr: string; }

export default function Settings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api("/settings").get({ limit: 100 } as any);
      const list = (res as any).data ?? [];
      setSettings(list);
      const vals: Record<string, string> = {};
      for (const s of list) vals[s.key] = s.value;
      setValues(vals);
    } catch {} finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveSetting = async (key: string) => {
    setSaving(key);
    try {
      await api(`/settings/${key}`).put({ value: values[key] });
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } catch {} finally { setSaving(null); }
  };

  const categories = [...new Set(settings.map(s => s.category))];
  const categoryLabels: Record<string, string> = {
    company: "بيانات الشركة",
    vat: "ضريبة القيمة المضافة",
    appearance: "المظهر والواجهة",
    system: "النظام",
  };

  const inputCls = "flex-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div dir="rtl">
      <PageHeader titleAr="إعدادات النظام" subtitleAr="تكوين المعاملات الأساسية للنظام" />

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-6">
          {categories.map(cat => (
            <div key={cat} className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-5 py-3 bg-muted/30 border-b border-border">
                <h3 className="font-semibold text-sm">{categoryLabels[cat] ?? cat}</h3>
              </div>
              <div className="divide-y divide-border">
                {settings.filter(s => s.category === cat).map(setting => (
                  <div key={setting.key} className="flex items-center gap-3 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{setting.nameAr}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{setting.key}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <input
                        value={values[setting.key] ?? ""}
                        onChange={(e) => setValues(v => ({ ...v, [setting.key]: e.target.value }))}
                        className="w-56 px-3 py-1.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        onClick={() => saveSetting(setting.key)}
                        disabled={saving === setting.key}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-medium disabled:opacity-60"
                      >
                        {saving === setting.key ? <Loader2 size={13} className="animate-spin" /> : saved === setting.key ? <CheckCircle size={13} className="text-emerald-500" /> : <Save size={13} />}
                        {saved === setting.key ? "تم" : "حفظ"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
