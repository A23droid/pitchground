const AUTH_KEY = "pitchground_auth_v1";
const TOKEN_KEY = "pitchground_jwt_v1";

export interface AuthSession {
  name: string;
  email: string;
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

export function saveToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_KEY);
  window.localStorage.removeItem(TOKEN_KEY);
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
