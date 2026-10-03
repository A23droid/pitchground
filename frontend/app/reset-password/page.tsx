"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/shared/Logo";
import { Lock } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setErrorMsg("Missing reset token");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("http://localhost:8000/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to reset password");
      }
      router.push("/login?reset=success");
    } catch (err: any) {
      setErrorMsg(err.message);
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <Link href="/" className="mb-8 flex justify-center">
          <Logo />
        </Link>

        <Card className="p-7 sm:p-8">
          <h1 className="font-display text-2xl text-ink">Set new password</h1>
          <p className="mt-1 text-sm text-ink-soft">Enter your new password below.</p>

          {!token ? (
            <p className="mt-4 rounded-xl border border-rose/40 bg-rose-soft px-3.5 py-2.5 text-xs text-rose-ink">
              Invalid or missing reset token. Please request a new link.
            </p>
          ) : null}

          {errorMsg ? (
            <p className="mt-4 rounded-xl border border-rose/40 bg-rose-soft px-3.5 py-2.5 text-xs text-rose-ink">
              {errorMsg}
            </p>
          ) : null}

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            <Field label="New Password" icon={<Lock size={14} />}>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
              />
            </Field>

            <Button type="submit" size="lg" disabled={submitting || !token} className="mt-2 w-full">
              {submitting ? "Resetting..." : "Reset password"}
            </Button>
          </form>
        </Card>
      </motion.div>
    </main>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <div className="flex items-center gap-2.5 rounded-xl border border-line bg-paper px-3.5 py-3 transition-colors focus-within:border-lavender-ink/50">
        <span className="text-muted">{icon}</span>
        {children}
      </div>
    </label>
  );
}
