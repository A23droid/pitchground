"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getAuth, saveAuth } from "@/lib/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    if (session?.user?.email) {
      saveAuth({
        name: session.user.name || session.user.email.split("@")[0],
        email: session.user.email,
      });
      setReady(true);
      return;
    }

    const local = getAuth();
    if (!local) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router, session, status]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-line-strong border-t-lavender-ink" />
      </div>
    );
  }

  return <>{children}</>;
}
