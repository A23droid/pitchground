"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/shared/Logo";
import { GoogleSignInButton } from "@/components/shared/GoogleSignInButton";
import { saveAuth, nameFromEmail } from "@/lib/auth";
import { ArrowRight, Mail, Lock } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const googleError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      saveAuth({ name: nameFromEmail(email || "student@example.com"), email: email || "student@example.com" });
      router.push("/dashboard");
    }, 500);
  }

  function onDemoLogin() {
    setDemoLoading(true);
    setTimeout(() => {
      saveAuth({ name: "Demo User", email: "demo@pitchground.ai" });
      router.push("/dashboard");
    }, 600);
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
          <h1 className="font-display text-2xl text-ink">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-soft">Log in to pick up your training where you left off.</p>

          {googleError ? (
            <p className="mt-4 rounded-xl border border-rose/40 bg-rose-soft px-3.5 py-2.5 text-xs text-rose-ink">
              Google sign-in failed. In Google Cloud, add this exact redirect URI:
              <span className="mt-1 block font-mono">http://localhost:3000/api/auth/callback/google</span>
            </p>
          ) : null}

          <GoogleSignInButton callbackUrl="/dashboard" />

          <button
            type="button"
            onClick={onDemoLogin}
            disabled={demoLoading}
            className="mt-3 w-full rounded-xl border border-dashed border-lavender-ink/40 bg-lavender/40 px-4 py-3 text-sm font-medium text-lavender-ink transition-all duration-200 hover:bg-lavender/70 disabled:opacity-60"
          >
            {demoLoading ? "Loading demo…" : "✦ Try demo — no account needed"}
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-xs text-muted">or sign in with email</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
            <Field label="Password" icon={<Lock size={14} />}>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
              />
            </Field>

            <Button type="submit" size="lg" disabled={submitting} className="mt-2 w-full">
              {submitting ? "Logging in…" : "Log in"}
              {!submitting && <ArrowRight size={16} />}
            </Button>
          </form>
        </Card>

        <p className="mt-5 text-center text-sm text-ink-soft">
          New to Pitchground?{" "}
          <Link href="/signup" className="font-medium text-ink underline underline-offset-2">
            Create an account
          </Link>
        </p>
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
