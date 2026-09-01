// Mock auth layer. No real backend — this stores a session in localStorage
// so the prototype has a believable login/signup gate. Swap for real
// session cookies / JWT once a backend exists; callers only touch this file.

const AUTH_KEY = "pitchground_auth_v1";

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

export function clearAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_KEY);
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
