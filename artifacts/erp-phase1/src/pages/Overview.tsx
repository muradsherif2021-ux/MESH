import { CheckCircle, AlertTriangle, Target, Layers, Database, BookOpen, ArrowLeftRight, FileText, Map } from "lucide-react";
import { Link } from "wouter";

const sections = [
  { path: "/architecture", icon: <Layers size={22} />, titleAr: "المعمارية والسياقات المحدودة", descAr: "8 وحدات منفصلة بقواعد تبعية واضحة", color: "bg-blue-500" },
  { path: "/domain", icon: <Database size={22} />, titleAr: "النموذج المجالي", descAr: "الكيانات الرئيسية، المجاميع، والقواعد الثابتة", color: "bg-emerald-500" },
  { path: "/database", icon: <Database size={22} />, titleAr: "قاعدة البيانات", descAr: "20+ جدول مع علاقات كاملة وقيود البيانات", color: "bg-violet-500" },
  { path: "/chart-of-accounts", icon: <BookOpen size={22} />, titleAr: "دليل الحسابات", descAr: "هرم ثلاثي المستويات عربي أولاً — متوافق مع IFRS وزاتكا", color: "bg-orange-500" },
  { path: "/posting-rules", icon: <ArrowLeftRight size={22} />, titleAr: "قواعد الترحيل", descAr: "10 أحداث محاسبية مع مدين/دائن وتوقيت الترحيل", color: "bg-red-500" },
  { path: "/invoice-lifecycle", icon: <FileText size={22} />, titleAr: "دورة حياة الفاتورة", descAr: "مسودة ← نهائية ← معكوسة مع قواعد القفل", color: "bg-pink-500" },
  { path: "/api", icon: <Database size={22} />, titleAr: "مخطط API", descAr: "70+ نقطة نهاية منظمة حسب الوحدة", color: "bg-cyan-500" },
  { path: "/risks", icon: <AlertTriangle size={22} />, titleAr: "المخاطر والقرارات", descAr: "5 مخاطر تصميمية و6 قرارات معمارية موثقة", color: "bg-yellow-600" },
  { path: "/roadmap", icon: <Map size={22} />, titleAr: "خارطة الطريق", descAr: "5 مراحل تطوير بإجمالي 32 أسبوع", color: "bg-slate-600" },
];

const keyPrinciples = [
  "نموذج IFRS 15 — الشركة وكيل وليست مبيعاً للخدمات العابرة",
  "مصادر التكلفة المجمعة — تخصيص في وقت الفاتورة وليس مباشرة",
  "قيد مزدوج حقيقي — يساوي مدين = دائن دائماً",
  "القيود المرحّلة محمية — تصحيح بالعكس فقط",
  "ضريبة القيمة المضافة على إيرادات الشركة فقط — ليس على مبالغ العبور",
  "جميع التقارير المالية من القيود المرحّلة حصراً",
  "واجهة عربية RTL-أولاً بمصطلحات ERP سعودية أصيلة",
];

export default function Overview() {
  return (
    <div className="space-y-8 max-w-5xl">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-l from-primary/5 to-primary/10 border border-primary/20 p-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
            ERP
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              نظام ERP للتخليص الجمركي السعودي
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              وثيقة هندسية شاملة — المرحلة الأولى | نظام عربي أولاً | IFRS 15 | نموذج الوكيل | زاتكا
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {["IFRS 15", "نموذج الوكيل", "قيد مزدوج", "زاتكا جاهز", "RTL أولاً", "PostgreSQL", "Express 5"].map((tag) => (
                <span key={tag} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Key Principles */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <CheckCircle size={20} className="text-emerald-500" />
          <h2 className="font-bold text-lg">المبادئ الجوهرية الإلزامية</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {keyPrinciples.map((principle, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
              <CheckCircle size={16} className="text-emerald-600 mt-0.5 shrink-0" />
              <span className="text-sm text-foreground">{principle}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sections grid */}
      <div>
        <h2 className="font-bold text-lg mb-4">محتويات الوثيقة</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((section) => (
            <Link key={section.path} href={section.path}>
              <div
                className="rounded-xl border border-border bg-card p-5 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group"
                data-testid={`section-card-${section.path.replace("/", "")}`}
              >
                <div className={`w-10 h-10 rounded-lg ${section.color} flex items-center justify-center text-white mb-3 group-hover:scale-105 transition-transform`}>
                  {section.icon}
                </div>
                <div className="font-semibold text-foreground mb-1">{section.titleAr}</div>
                <div className="text-sm text-muted-foreground">{section.descAr}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Business Model Summary */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-bold text-lg mb-4">ملخص نموذج الأعمال</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
            <div className="font-semibold text-blue-700 dark:text-blue-400 mb-2 text-sm">الشركة تتصرف كـ وكيل</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              الشركة تدفع رسوماً بالنيابة عن العملاء — هذه المبالغ ليست إيراداً ولا مصروفاً تشغيلياً
            </p>
          </div>
          <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
            <div className="font-semibold text-emerald-700 dark:text-emerald-400 mb-2 text-sm">الإيراد الحقيقي فقط</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              رسوم التخليص والرسوم الإدارية هي الإيراد الحقيقي — تخضع لضريبة القيمة المضافة 15%
            </p>
          </div>
          <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50">
            <div className="font-semibold text-orange-700 dark:text-orange-400 mb-2 text-sm">مبالغ العبور</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              رسوم الجمارك والشحن تُدار كأرصدة مؤقتة قابلة للاسترداد — لا ضريبة قيمة مضافة
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
