import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Users, UserCircle, Ship, Landmark, CreditCard, BookOpen, Tag, Calendar, FileText } from "lucide-react";
import { Link } from "wouter";

interface CountCard {
  labelAr: string;
  icon: any;
  href: string;
  color: string;
  count?: number;
}

const cards: CountCard[] = [
  { labelAr: "العملاء", icon: UserCircle, href: "/customers", color: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/40" },
  { labelAr: "وكلاء الشحن", icon: Ship, href: "/agents", color: "text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-950/40" },
  { labelAr: "الخزائن", icon: Landmark, href: "/treasuries", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40" },
  { labelAr: "الحسابات البنكية", icon: CreditCard, href: "/bank-accounts", color: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40" },
  { labelAr: "أنواع الرسوم", icon: Tag, href: "/charge-types", color: "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/40" },
  { labelAr: "حسابات دليل الحسابات", icon: BookOpen, href: "/accounts", color: "text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950/40" },
  { labelAr: "السنوات المالية", icon: Calendar, href: "/fiscal-years", color: "text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950/40" },
  { labelAr: "المستخدمون", icon: Users, href: "/users", color: "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/40" },
];

const modules = [
  { href: "/customers", labelAr: "إدارة العملاء", descAr: "إضافة وتعديل وأرشفة العملاء" },
  { href: "/agents", labelAr: "وكلاء الشحن", descAr: "إدارة وكلاء الشحن والبيانات الأساسية" },
  { href: "/accounts", labelAr: "دليل الحسابات", descAr: "الهرم المحاسبي الثلاثي المستوى" },
  { href: "/fiscal-years", labelAr: "السنوات المالية", descAr: "إدارة الفترات والفترات الفرعية" },
  { href: "/charge-types", labelAr: "أنواع الرسوم", descAr: "كتالوج بنود الفاتورة والمعالجة المحاسبية" },
  { href: "/audit-logs", labelAr: "سجل الأحداث", descAr: "مسار التدقيق الكامل لجميع العمليات" },
];

export default function Dashboard() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetches = [
      { key: "customers", path: "/customers?limit=1" },
      { key: "agents", path: "/agents?limit=1" },
      { key: "treasuries", path: "/treasuries?limit=1" },
      { key: "bank-accounts", path: "/bank-accounts?limit=1" },
      { key: "charge-types", path: "/charge-types?limit=1" },
      { key: "accounts", path: "/accounts?limit=1" },
      { key: "fiscal-years", path: "/fiscal-years" },
      { key: "users", path: "/users?limit=1" },
    ];

    Promise.allSettled(
      fetches.map(({ key, path }) =>
        api(path).get().then((data: any) => ({ key, count: data?.pagination?.total ?? data?.length ?? 0 }))
      )
    ).then(results => {
      const c: Record<string, number> = {};
      results.forEach(r => { if (r.status === "fulfilled") c[r.value.key] = r.value.count; });
      setCounts(c);
    });
  }, []);

  const labelToKey: Record<string, string> = {
    "العملاء": "customers", "وكلاء الشحن": "agents", "الخزائن": "treasuries",
    "الحسابات البنكية": "bank-accounts", "أنواع الرسوم": "charge-types",
    "حسابات دليل الحسابات": "accounts", "السنوات المالية": "fiscal-years", "المستخدمون": "users",
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-lg font-bold text-foreground">لوحة التحكم</h1>
        <p className="text-sm text-muted-foreground">نظرة عامة على البيانات الأساسية للمرحلة الثانية</p>
      </div>

      {/* Count cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <div className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.color}`}>
                  <card.icon size={18} />
                </div>
                <span className="text-2xl font-bold text-foreground">
                  {counts[labelToKey[card.labelAr]] ?? "—"}
                </span>
              </div>
              <div className="text-sm font-medium text-foreground">{card.labelAr}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick access */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">الوحدات الأساسية</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {modules.map((mod) => (
            <Link key={mod.href} href={mod.href}>
              <div className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-primary/30">
                <div className="font-semibold text-foreground mb-1">{mod.labelAr}</div>
                <div className="text-xs text-muted-foreground">{mod.descAr}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Phase info callout */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20 p-5">
        <div className="font-bold text-blue-700 dark:text-blue-400 mb-2">المرحلة الثانية — قيد التشغيل</div>
        <p className="text-sm text-blue-600 dark:text-blue-300">
          تم تفعيل قاعدة البيانات الكاملة مع جميع الجداول الأساسية. المصادقة ونظام الأدوار والصلاحيات والبيانات الأساسية (العملاء، وكلاء الشحن، الخزائن، دليل الحسابات، السنوات المالية) جميعها تعمل بشكل كامل.
        </p>
      </div>
    </div>
  );
}
