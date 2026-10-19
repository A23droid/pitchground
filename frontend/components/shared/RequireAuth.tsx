"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import { clearAuth, getToken, saveAuth } from "@/lib/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const token = getToken();
      if (token) {
        try {
          const res = await fetch(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const user = (await res.json()) as { name: string; email: string; learner_id: string };
            saveAuth({ name: user.name, email: user.email, learnerId: user.learner_id });
            if (!cancelled) setReady(true);
            return;
          }
          if (res.status !== 401 && res.status !== 403) {
            throw new Error("The sign-in service is unavailable. Please try again.");
          }
        } catch {
          if (!cancelled) setError("Cannot verify your session. Check that the API is running, then retry.");
          return;
        }
      }

      clearAuth();
      router.replace("/login");
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) return (
    <div className="mx-auto mt-8 max-w-md rounded-2xl border border-line bg-paper-raised p-6 text-sm text-ink-soft" role="alert">
      <p>{error}</p>
      <button className="mt-4 font-semibold text-lavender-ink" onClick={() => window.location.reload()}>Retry</button>
    </div>
  );

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-line-strong border-t-lavender-ink" />
      </div>
    );
  }

  return <>{children}</>;
}
