"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, hasBackendSession } from "@/lib/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const local = getAuth();
    if (!local || !hasBackendSession()) {
      router.replace("/login");
      return;
    }
    setReady(true);
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
