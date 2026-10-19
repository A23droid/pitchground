"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { completeTokenLogin } from "@/lib/auth";

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallback />
    </Suspense>
  );
}

function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get("token");
    const next = params.get("next") || "/dashboard";
    if (!token) {
      router.replace("/login?error=google");
      return;
    }
    let cancelled = false;
    completeTokenLogin(token).then(() => {
      if (!cancelled) router.replace(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
    }).catch(() => { if (!cancelled) router.replace("/login?error=google"); });
    return () => { cancelled = true; };
  }, [params, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-line-strong border-t-lavender-ink" />
    </div>
  );
}
