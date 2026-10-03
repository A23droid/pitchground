"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/shared/Logo";
import { GoogleSignInButton } from "@/components/shared/GoogleSignInButton";
import { saveAuth, saveToken } from "@/lib/auth";
import { API_URL } from "@/lib/api";
import { ArrowRight, ArrowLeft, Mail, Lock, User } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to create account");
      }
      const data = await res.json();
      saveToken(data.access_token);

      const meRes = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        saveAuth({ name: meData.name || name || "New learner", email: meData.email, learnerId: meData.learner_id || meData.id });
      } else {
        saveAuth({ name: name || "New learner", email });
      }

      router.push("/start");
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
          <h1 className="font-display text-2xl text-ink">Create your account</h1>
          <p className="mt-1 text-sm text-ink-soft">Pitchground starts building your communication profile from session one.</p>

          {errorMsg ? (
            <p className="mt-4 rounded-xl border border-rose/40 bg-rose-soft px-3.5 py-2.5 text-xs text-rose-ink">
              {errorMsg}
            </p>
          ) : null}

          <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
            <Field label="Name" icon={<User size={14} />}>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aravind Kumar"
                className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
              />
            </Field>
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
                placeholder="At least 8 characters"
                className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
              />
            </Field>

            <Button type="submit" size="lg" disabled={submitting} className="mt-2 w-full">
              {submitting ? "Creating account…" : "Create account"}
              {!submitting && <ArrowRight size={16} />}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-xs text-muted">or continue with</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <GoogleSignInButton callbackUrl="/start" />
        </Card>

        <p className="mt-5 text-center text-sm text-ink-soft">
          Already training with us?{" "}
          <Link href="/login" className="font-medium text-ink underline underline-offset-2">
            Log in
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