import { API_URL, clearToken, getToken, setToken } from "@/lib/api";

const AUTH_KEY = "pitchground_auth_v1";

export interface AuthSession {
  name: string;
  email: string;
  learnerId?: string;
}

export function saveAuth(session: AuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

export function getAuth(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_KEY);
  clearToken();
}

export function nameFromEmail(email: string): string {
  const local = email.split("@")[0] || "there";
  return local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function googleAuthUrl(next = "/dashboard"): string {
  const params = new URLSearchParams({ next });
  return `${API_URL}/auth/google?${params.toString()}`;
}

export async function loginWithDemo(): Promise<AuthSession> {
  const res = await fetch(`${API_URL}/auth/demo`, { method: "POST" });
  if (!res.ok) throw new Error("Demo login failed");
  const data = (await res.json()) as { token: string; name: string; email: string; learner_id: string };
  setToken(data.token);
  const session = { name: data.name, email: data.email, learnerId: data.learner_id };
  saveAuth(session);
  return session;
}

export async function completeTokenLogin(token: string): Promise<AuthSession> {
  setToken(token);
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Invalid session");
  const data = (await res.json()) as { name: string; email: string; learner_id: string };
  const session = { name: data.name, email: data.email, learnerId: data.learner_id };
  saveAuth(session);
  return session;
}

export function hasBackendSession(): boolean {
  return Boolean(getToken());
}
