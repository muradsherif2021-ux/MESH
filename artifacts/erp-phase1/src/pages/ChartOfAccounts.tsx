import { useState } from "react";
import { chartOfAccounts, Account } from "../data/chartOfAccounts";
import { ChevronDown, ChevronRight, Info, Lock, Unlock } from "lucide-react";

const typeColors: Record<string, string> = {
  ASSET: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
  LIABILITY: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30",
  EQUITY: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30",
  REVENUE: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
  EXPENSE: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30",
};

const typeLabels: Record<string, string> = {
  ASSET: "أصول",
  LIABILITY: "التزامات",
  EQUITY: "حقوق ملكية",
  REVENUE: "إيرادات",
  EXPENSE: "مصروفات",
};

function AccountRow({ account, depth = 0 }: { account: Account; depth?: number }) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = account.children && account.children.length > 0;

  const indent = depth * 20;

  return (
    <>
      <tr
        className={`border-b border-border hover:bg-muted/20 transition-colors ${
          depth === 0 ? "bg-muted/40 font-bold" : depth === 1 ? "bg-muted/10 font-semibold" : "bg-background"
        }`}
        data-testid={`account-${account.code}`}
      >
        {/* Code */}
        <td className="px-4 py-2.5 font-mono text-sm ltr" style={{ paddingRight: `${indent + 16}px` }}>
          {hasChildren && (
            <button onClick={() => setOpen(!open)} className="ml-1 text-muted-foreground inline-flex">
              {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
          )}
          {!hasChildren && <span className="inline-block w-4 mr-1" />}
          <span className={`font-mono text-xs font-bold ${typeColors[account.type].split(" ")[0]}`}>{account.code}</span>
        </td>

        {/* Arabic name */}
        <td className="px-4 py-2.5 text-sm">
          <span className={depth === 0 ? "font-bold" : depth === 1 ? "font-semibold" : ""}>{account.nameAr}</span>
          {account.isSystem && (
            <span className="mr-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">نظامي</span>
          )}
        </td>

        {/* Type */}
        <td className="px-4 py-2.5">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[account.type]}`}>
            {typeLabels[account.type]}
          </span>
        </td>

        {/* Level */}
        <td className="px-4 py-2.5 text-center">
          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{account.level}</span>
        </td>

        {/* Allow Posting */}
        <td className="px-4 py-2.5 text-center">
          {account.allowPosting ? (
            <Unlock size={14} className="mx-auto text-emerald-500" />
          ) : (
            <Lock size={14} className="mx-auto text-muted-foreground" />
          )}
        </td>

        {/* Normal Balance */}
        <td className="px-4 py-2.5 text-center">
          <span className={`text-xs font-medium ${account.normalBalance === "DEBIT" ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>
            {account.normalBalance === "DEBIT" ? "مدين" : "دائن"}
          </span>
        </td>

        {/* Notes */}
        <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-xs">
          {account.notes && (
            <div className="flex items-center gap-1">
              <Info size={11} className="shrink-0 text-amber-500" />
              <span className="truncate">{account.notes}</span>
            </div>
          )}
        </td>
      </tr>
      {hasChildren && open && account.children!.map((child) => (
        <AccountRow key={child.code} account={child} depth={depth + 1} />
      ))}
    </>
  );
}

export default function ChartOfAccounts() {
  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold mb-1">دليل الحسابات</h1>
        <p className="text-muted-foreground text-sm">
          هرم ثلاثي المستويات — عربي أولاً — متوافق مع IFRS والمتطلبات السعودية — جاهز لزاتكا
        </p>
      </div>

      {/* Key account callout */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-4">
        <div className="font-semibold text-amber-700 dark:text-amber-400 mb-2 text-sm">الحساب المحوري — 1104</div>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono font-bold text-amber-700 dark:text-amber-400">1104 — تكاليف قابلة للاسترداد / تكاليف عبور غير مخصصة</span>
          {" "}هو قلب النظام. يستقبل كل المبالغ المدفوعة بالنيابة عن العملاء (جمارك، شحن، سلف)، ويُخفَّض عند تخصيص هذه التكاليف في الفاتورة النهائية.
          هذا ليس إيراداً ولا مصروفاً تشغيلياً.
        </p>
      </div>

      {/* Summary counts */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(typeLabels).map(([type, label]) => (
          <div key={type} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${typeColors[type]}`}>
            {label}
          </div>
        ))}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground">
          <Lock size={12} /> غير قابل للترحيل = حسابات أم
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground">
          <Unlock size={12} /> قابل للترحيل = حسابات تفصيلية
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="bg-muted/60 border-b border-border">
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs">الكود</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs">اسم الحساب (عربي)</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs">النوع</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs">المستوى</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs">ترحيل</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs">الرصيد الطبيعي</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground text-xs">ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {chartOfAccounts.map((account) => (
                <AccountRow key={account.code} account={account} depth={0} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
