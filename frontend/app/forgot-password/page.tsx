"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/shared/Logo";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("http://localhost:8000/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to request password reset");
      }
      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
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
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-ink"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <Link href="/" className="mb-8 flex justify-center">
          <Logo />
        </Link>

        <Card className="p-7 sm:p-8">
          <h1 className="font-display text-2xl text-ink">Reset password</h1>
          <p className="mt-1 text-sm text-ink-soft">Enter your email to receive a password reset link.</p>

          {errorMsg ? (
            <p className="mt-4 rounded-xl border border-rose/40 bg-rose-soft px-3.5 py-2.5 text-xs text-rose-ink">
              {errorMsg}
            </p>
          ) : null}

          {success ? (
            <div className="mt-6 rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-700">
              If an account exists with that email, a password reset link has been sent. Please check your inbox.
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
              <Field label="Email" icon={<Mail size={14} />}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@college.edu"
                  className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
                />
              </Field>

              <Button type="submit" size="lg" disabled={submitting} className="mt-2 w-full">
                {submitting ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          )}
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
