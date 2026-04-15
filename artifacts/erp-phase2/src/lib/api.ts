const API_BASE = "/api";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      accessToken = data.accessToken;
      return data.accessToken;
    }
  } catch {}
  return null;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let res = await fetch(url, { ...options, headers, credentials: "include" });

  // Try to refresh token if 401
  if (res.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(url, { ...options, headers, credentials: "include" });
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "خطأ غير متوقع" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

export function api<T = unknown>(path: string) {
  return {
    get: (params?: Record<string, string | number | boolean | undefined>) => {
      const query = params
        ? "?" + Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&")
        : "";
      return apiRequest<T>(`${path}${query}`);
    },
    post: (body?: unknown) => apiRequest<T>(path, { method: "POST", body: JSON.stringify(body) }),
    put: (body?: unknown) => apiRequest<T>(path, { method: "PUT", body: JSON.stringify(body) }),
    patch: (body?: unknown) => apiRequest<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
    delete: () => apiRequest<T>(path, { method: "DELETE" }),
  };
}
