"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveAuth, saveToken } from "@/lib/auth";

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
    try {
      const payload = JSON.parse(atob(token.split(".")[1] || "")) as { name?: string; email?: string };
      if (!payload.email) throw new Error("missing email");
      saveToken(token);
      saveAuth({ name: payload.name || payload.email.split("@")[0], email: payload.email });
      router.replace(next.startsWith("/") ? next : "/dashboard");
    } catch {
      router.replace("/login?error=google");
    }
  }, [params, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-line-strong border-t-lavender-ink" />
    </div>
  );
}
