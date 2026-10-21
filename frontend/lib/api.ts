export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

const TOKEN_KEY = "pitchground_jwt_v1";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  try {
    return await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch (err) {
    const hint =
      err instanceof TypeError
        ? `Cannot reach API at ${API_URL}. The backend may be starting or temporarily unavailable. Please retry shortly.`
        : err instanceof Error
          ? err.message
          : "Network error";
    throw new Error(hint);
  }
}

export async function authJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authFetch(path, init);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      const error = body.detail?.error || body.detail || body.error || body;
      detail = typeof error === "string" ? error : typeof error.message === "string" ? error.message : Array.isArray(error) ? error.map((item: { msg?: string }) => item.msg || "Invalid request").join("; ") : `Request failed (${res.status})`;
      if (body.retry_after) detail += ` Retry in ${body.retry_after}s.`;
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
