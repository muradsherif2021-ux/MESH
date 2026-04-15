import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Database,
  BookOpen,
  FileText,
  ArrowLeftRight,
  Map,
  AlertTriangle,
  Globe,
  Menu,
  X,
  Moon,
  Sun,
  ChevronLeft,
} from "lucide-react";

interface NavItem {
  path: string;
  labelAr: string;
  labelEn: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: "/", labelAr: "نظرة عامة", labelEn: "Overview", icon: <LayoutDashboard size={18} /> },
  { path: "/architecture", labelAr: "المعمارية", labelEn: "Architecture", icon: <Globe size={18} /> },
  { path: "/domain", labelAr: "النموذج المجالي", labelEn: "Domain Model", icon: <Database size={18} /> },
  { path: "/database", labelAr: "قاعدة البيانات", labelEn: "Database ERD", icon: <Database size={18} /> },
  { path: "/chart-of-accounts", labelAr: "دليل الحسابات", labelEn: "Chart of Accounts", icon: <BookOpen size={18} /> },
  { path: "/posting-rules", labelAr: "قواعد الترحيل", labelEn: "Posting Rules", icon: <ArrowLeftRight size={18} /> },
  { path: "/invoice-lifecycle", labelAr: "دورة الفاتورة", labelEn: "Invoice Lifecycle", icon: <FileText size={18} /> },
  { path: "/api", labelAr: "مخطط API", labelEn: "API Outline", icon: <Globe size={18} /> },
  { path: "/risks", labelAr: "المخاطر والقرارات", labelEn: "Risks & Decisions", icon: <AlertTriangle size={18} /> },
  { path: "/roadmap", labelAr: "خارطة الطريق", labelEn: "Roadmap", icon: <Map size={18} /> },
];

interface LayoutProps {
  children: React.ReactNode;
  darkMode: boolean;
  toggleDark: () => void;
}

export default function Layout({ children, darkMode, toggleDark }: LayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden bg-background" dir="rtl">
      {/* Sidebar */}
      <div
        className={`flex flex-col bg-sidebar text-sidebar-foreground border-l border-sidebar-border transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-0 overflow-hidden"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-sm">
            ERP
          </div>
          <div>
            <div className="font-bold text-sm leading-tight">نظام تخليص جمركي</div>
            <div className="text-xs text-sidebar-accent-foreground opacity-70 mt-0.5">المرحلة الأولى — الهندسة</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <div className="text-xs font-semibold text-sidebar-accent-foreground opacity-50 px-3 mb-2 uppercase tracking-wider">
            أقسام الوثيقة
          </div>
          {navItems.map((item) => {
            const active = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 cursor-pointer transition-all text-sm font-medium ${
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                  data-testid={`nav-${item.path.replace("/", "") || "home"}`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="flex-1">{item.labelAr}</span>
                  {active && <ChevronLeft size={14} className="shrink-0 opacity-70" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-4 border-t border-sidebar-border flex items-center justify-between">
          <span className="text-xs text-sidebar-accent-foreground opacity-60">المرحلة 1 / 2025</span>
          <button
            onClick={toggleDark}
            className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-sidebar-accent-foreground"
            data-testid="toggle-dark-mode"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground"
            data-testid="toggle-sidebar"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="flex-1">
            <h2 className="font-bold text-base text-foreground">
              {navItems.find((n) => n.path === location)?.labelAr ?? "ERP Architecture"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {navItems.find((n) => n.path === location)?.labelEn}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
              وثيقة المرحلة الأولى
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-background" dir="rtl">
          {children}
        </main>
      </div>
    </div>
  );
}
