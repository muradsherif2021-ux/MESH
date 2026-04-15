import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { apiRequest, setAccessToken } from "@/lib/api";

interface User {
  id: string;
  username: string;
  nameAr: string;
  nameEn?: string;
  roleId: string | null;
  roleName: string | null;
  roleNameAr: string | null;
  branchId: string | null;
  status: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (module: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Simple permission cache — in production, fetch from /api/auth/me/permissions
const permissionCache = new Set<string>();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMe = useCallback(async () => {
    try {
      const data = await apiRequest<User & { accessToken?: string }>("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Try to refresh token on mount
  useEffect(() => {
    const init = async () => {
      try {
        const data = await apiRequest<{ accessToken: string }>("/auth/refresh", { method: "POST" });
        setAccessToken(data.accessToken);
        await loadMe();
      } catch {
        setIsLoading(false);
      }
    };
    init();
  }, [loadMe]);

  const login = async (username: string, password: string) => {
    const data = await apiRequest<{ accessToken: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch {}
    setAccessToken(null);
    setUser(null);
    permissionCache.clear();
  };

  const hasPermission = (module: string, action: string): boolean => {
    // Super admin has all permissions
    if (user?.roleName === "super_admin") return true;
    if (user?.roleName === "admin") return true;
    // For other roles, we'd check a permissions set — simplified here
    if (action === "view") return true;
    return user?.roleName === "accountant" || user?.roleName === "operations";
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
