"use client";

/** Passthrough — auth is FastAPI JWT in localStorage (no NextAuth). */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
