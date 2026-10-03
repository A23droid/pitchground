"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/Button";
import { Menu, X, ArrowRight } from "lucide-react";

export function LandingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <div className="sticky top-3 z-40 mx-auto w-full max-w-6xl px-3 sm:top-4 sm:px-6">
        <nav className="flex items-center justify-between gap-2 rounded-full border border-line bg-paper-raised/90 px-3.5 py-2 shadow-soft backdrop-blur-md sm:gap-4 sm:px-5 sm:py-2.5">
          <Link href="/" className="shrink-0" onClick={() => setMobileMenuOpen(false)}>
            <Logo />
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden items-center gap-1 md:flex">
            <a
              href="#how-it-works"
              className="rounded-full px-3.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink"
            >
              How it works
            </a>
            <a
              href="#signals"
              className="rounded-full px-3.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink"
            >
              What it measures
            </a>
            <a
              href="#language"
              className="rounded-full px-3.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink"
            >
              Multilingual
            </a>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link href="/login" className="hidden sm:inline-flex">
              <Button size="sm" variant="ghost">
                Log in
              </Button>
            </Link>
            <Link href="/signup" className="hidden sm:inline-flex">
              <Button size="sm" className="h-8 px-3.5 text-xs sm:h-9 sm:px-4 sm:text-sm">
                Get started
              </Button>
            </Link>

            {/* Mobile menu toggle button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-paper px-3 text-xs font-medium text-ink shadow-xs transition-colors hover:bg-black/[0.05] md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu size={16} />
              <span>Menu</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Central Drawer Modal on Mobile */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:hidden">
            {/* Backdrop blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              aria-hidden="true"
            />

            {/* Centered Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-[24px] border border-line bg-paper-raised p-5 shadow-soft-xl"
            >
              <div className="flex items-center justify-between border-b border-line pb-3.5">
                <Logo />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-black/[0.06] hover:text-ink"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="my-3 flex flex-col gap-1">
                <a
                  href="#how-it-works"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink"
                >
                  <span>How it works</span>
                  <ArrowRight size={14} className="text-muted/60" />
                </a>
                <a
                  href="#signals"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink"
                >
                  <span>What it measures</span>
                  <ArrowRight size={14} className="text-muted/60" />
                </a>
                <a
                  href="#language"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink"
                >
                  <span>Multilingual</span>
                  <ArrowRight size={14} className="text-muted/60" />
                </a>
              </div>

              <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3.5">
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full"
                >
                  <Button size="lg" className="w-full justify-center text-sm">
                    Get started free
                    <ArrowRight size={15} />
                  </Button>
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center rounded-xl py-2 text-xs font-medium text-ink-soft hover:bg-black/[0.04] hover:text-ink"
                >
                  Already have an account? Log in
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

