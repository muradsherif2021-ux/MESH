import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Users, Shield, Building2, Settings, Hash,
  UserCircle, Ship, Landmark, CreditCard, Tag, BookOpen,
  Calendar, FileText, Bell, LogOut, Sun, Moon, Menu, X,
  ChevronDown, ChevronLeft, CircleUser,
} from "lucide-react";

interface NavItem {
  id: string;
  labelAr: string;
  icon: any;
  href?: string;
  children?: NavItem[];
}

const navGroups: Array<{ groupAr: string; items: NavItem[] }> = [
  {
    groupAr: "الرئيسية",
    items: [
      { id: "dashboard", labelAr: "لوحة التحكم", icon: LayoutDashboard, href: "/" },
    ],
  },
  {
    groupAr: "إدارة النظام",
    items: [
      { id: "users", labelAr: "المستخدمون", icon: Users, href: "/users" },
      { id: "roles", labelAr: "الأدوار والصلاحيات", icon: Shield, href: "/roles" },
      { id: "branches", labelAr: "الفروع", icon: Building2, href: "/branches" },
      { id: "settings", labelAr: "الإعدادات", icon: Settings, href: "/settings" },
      { id: "sequences", labelAr: "التسلسلات الرقمية", icon: Hash, href: "/sequences" },
    ],
  },
  {
    groupAr: "البيانات الأساسية",
    items: [
      { id: "customers", labelAr: "العملاء", icon: UserCircle, href: "/customers" },
      { id: "agents", labelAr: "وكلاء الشحن", icon: Ship, href: "/agents" },
      { id: "treasuries", labelAr: "الخزائن", icon: Landmark, href: "/treasuries" },
      { id: "bank-accounts", labelAr: "الحسابات البنكية", icon: CreditCard, href: "/bank-accounts" },
      { id: "charge-types", labelAr: "أنواع الرسوم", icon: Tag, href: "/charge-types" },
    ],
  },
  {
    groupAr: "المحاسبة",
    items: [
      { id: "accounts", labelAr: "دليل الحسابات", icon: BookOpen, href: "/accounts" },
      { id: "fiscal-years", labelAr: "السنوات المالية", icon: Calendar, href: "/fiscal-years" },
    ],
  },
  {
    groupAr: "التدقيق والمتابعة",
    items: [
      { id: "audit-logs", labelAr: "سجل الأحداث", icon: FileText, href: "/audit-logs" },
    ],
  },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") !== "light");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const isActive = (href: string) => {
    if (href === "/") return location === "/" || location === "";
    return location.startsWith(href);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans">
      {/* Sidebar */}
      <aside
        className={`flex-shrink-0 flex flex-col bg-sidebar border-l border-sidebar-border transition-all duration-300 ${sidebarOpen ? "w-60" : "w-14"}`}
        style={{ direction: "rtl" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm shrink-0">ERP</div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <div className="text-sidebar-foreground font-bold text-sm truncate">التخليص الجمركي</div>
              <div className="text-xs text-sidebar-foreground/50 truncate">المرحلة الثانية</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navGroups.map((group) => (
            <div key={group.groupAr} className="mb-4">
              {sidebarOpen && (
                <div className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-2 mb-1">
                  {group.groupAr}
                </div>
              )}
              {group.items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href!}
                  className={`flex items-center gap-2.5 px-2 py-2 rounded-lg mb-0.5 text-sm transition-colors cursor-pointer ${
                    isActive(item.href!)
                      ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <item.icon size={16} className="shrink-0" />
                  {sidebarOpen && <span className="truncate">{item.labelAr}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-sidebar-border p-3">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <CircleUser size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-sidebar-foreground truncate">{user?.nameAr}</div>
                <div className="text-xs text-sidebar-foreground/50 truncate">{user?.roleNameAr ?? user?.roleName}</div>
              </div>
              <button
                onClick={logout}
                className="text-sidebar-foreground/50 hover:text-destructive transition-colors p-1"
                title="تسجيل الخروج"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button onClick={logout} className="w-full flex justify-center text-sidebar-foreground/50 hover:text-destructive p-1" title="تسجيل الخروج">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 bg-card border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <Menu size={18} />
            </button>
            <BreadcrumbNav location={location} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              title={darkMode ? "الوضع الفاتح" : "الوضع الداكن"}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5">
          {children}
        </main>
      </div>
    </div>
  );
}

function BreadcrumbNav({ location }: { location: string }) {
  const pathMap: Record<string, string> = {
    "/": "لوحة التحكم",
    "/users": "المستخدمون",
    "/roles": "الأدوار والصلاحيات",
    "/branches": "الفروع",
    "/settings": "الإعدادات",
    "/sequences": "التسلسلات",
    "/customers": "العملاء",
    "/agents": "وكلاء الشحن",
    "/treasuries": "الخزائن",
    "/bank-accounts": "الحسابات البنكية",
    "/charge-types": "أنواع الرسوم",
    "/accounts": "دليل الحسابات",
    "/fiscal-years": "السنوات المالية",
    "/audit-logs": "سجل الأحداث",
  };
  const label = pathMap[location] ?? pathMap[Object.keys(pathMap).find(k => k !== "/" && location.startsWith(k)) ?? ""] ?? location;
  return (
    <div className="text-sm text-muted-foreground">
      <span className="text-foreground font-medium">{label}</span>
    </div>
  );
}
