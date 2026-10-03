"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { completeTokenLogin } from "@/lib/auth";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-sm text-ink-soft">Signing you in…</main>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    const next = params.get("next") || "/dashboard";
    if (!token) {
      setError("Missing token");
      return;
    }
    void completeTokenLogin(token)
      .then(() => router.replace(next.startsWith("/") ? next : "/dashboard"))
      .catch(() => {
        setError("Could not complete sign-in");
        router.replace("/login?error=google");
      });
  }, [params, router]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-rose-ink">{error}</main>
    );
  }

  return <main className="flex min-h-screen items-center justify-center text-sm text-ink-soft">Signing you in…</main>;
}
