"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";
import { getAuth, getToken, saveAuth } from "@/lib/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

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
            const user = (await res.json()) as { name: string; email: string };
            saveAuth(user);
            if (!cancelled) setReady(true);
            return;
          }
        } catch {
          // fall through to local demo session
        }
      }

      const local = getAuth();
      if (!local) {
        router.replace("/login");
        return;
      }
      if (!cancelled) setReady(true);
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-line-strong border-t-lavender-ink" />
      </div>
    );
  }

  return <>{children}</>;
}
