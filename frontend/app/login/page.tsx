"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/shared/Logo";
import { GoogleSignInButton } from "@/components/shared/GoogleSignInButton";
import { completeTokenLogin, loginWithDemo } from "@/lib/auth";
import { API_URL, authJson } from "@/lib/api";
import { ArrowRight, Mail, Lock } from "lucide-react";
import styles from "./login.module.css";

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
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    try {
      const data = await authJson<{ access_token: string }>("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      await completeTokenLogin(data.access_token);

      router.push("/dashboard");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not sign in.");
      setSubmitting(false);
    }
  }

  async function onDemoLogin() {
    setDemoLoading(true);
    try {
      await loginWithDemo();
      router.push("/dashboard");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Demo sign-in failed.");
      setDemoLoading(false);
    }
  }

  return (
    <main className={`${styles.page} flex items-center justify-center px-4 py-8 sm:py-12`}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={styles.panel}
      >
        <Link href="/" className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-ink">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back to home
        </Link>

        <Link href="/" className="mb-6 flex justify-center">
          <Logo />
        </Link>

        <Card className={styles.card}>
          <h1 className="font-display text-2xl text-ink">Welcome back</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">Log in to pick up your training where you left off.</p>

          {googleError ? (
            <p className="mt-4 rounded-xl border border-rose/40 bg-rose-soft px-3.5 py-2.5 text-xs text-rose-ink">
              Google sign-in could not complete. Please retry. If this persists, check the configured callback:
              <span className="mt-1 block font-mono">{API_URL}/auth/google/callback</span>
            </p>
          ) : null}

          {errorMsg ? (
            <p className="mt-4 rounded-xl border border-rose/40 bg-rose-soft px-3.5 py-2.5 text-xs text-rose-ink">
              {errorMsg}
            </p>
          ) : null}

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-5">
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

            <Button type="submit" size="lg" disabled={submitting} className="mt-1 h-12 w-full text-[15px]">
              {submitting ? "Logging in…" : "Log in"}
              {!submitting && <ArrowRight size={16} />}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/forgot-password" className="text-xs text-ink-soft hover:text-ink underline underline-offset-2">
              Forgot password?
            </Link>
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-xs text-muted">or continue with</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <button
            type="button"
            onClick={onDemoLogin}
            disabled={demoLoading}
            className={`${styles.demo} min-h-12 w-full rounded-xl border border-dashed border-lavender-ink/40 bg-lavender/40 px-4 py-3 text-sm font-medium text-lavender-ink transition-all duration-200 hover:bg-lavender/70 disabled:opacity-60`}
          >
            {demoLoading ? "Loading demo…" : "Try guest practice (no account needed)"}
          </button>

          <div className={`${styles.google} mt-4`}>
            <GoogleSignInButton callbackUrl="/dashboard" />
          </div>
        </Card>

        <p className="mt-6 text-center text-sm leading-relaxed text-ink-soft">
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
      <div className={styles.field}>
        <span className="text-muted">{icon}</span>
        {children}
      </div>
    </label>
  );
}
