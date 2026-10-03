"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { clearAuth } from "@/lib/auth";
import {
  LogOut,
  Menu,
  X,
  Mic,
  Swords,
  Zap,
  Languages,
  User,
  LayoutDashboard,
  ArrowRight,
} from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/interview", label: "Interview", icon: Mic },
  { href: "/debate", label: "Debate", icon: Swords },
  { href: "/impromptu", label: "Impromptu", icon: Zap },
  { href: "/language-diagnostic", label: "Language", icon: Languages },
  { href: "/profile", label: "Profile", icon: User },
];

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route change or ESC
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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

  function logout() {
    clearAuth();
    setMobileMenuOpen(false);
    router.push("/");
  }

  return (
    <>
      {/* Top Navigation Bar */}
      <div className="sticky top-3 z-40 mx-auto w-full max-w-6xl px-3 sm:top-4 sm:px-6">
        <nav className="flex w-full items-center justify-between gap-2 rounded-full border border-line bg-paper-raised/90 px-3.5 py-2 shadow-soft backdrop-blur-md sm:gap-4 sm:px-5 sm:py-2.5">
          <Link href="/dashboard" className="shrink-0" onClick={() => setMobileMenuOpen(false)}>
            <Logo />
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-black/[0.04] hover:text-ink lg:px-3.5 lg:text-sm",
                  pathname === link.href && "bg-black/[0.06] font-semibold text-ink",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Action Controls */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              onClick={logout}
              className="hidden h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-black/[0.05] hover:text-ink sm:flex"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut size={14} />
            </button>
            <Link href="/start" onClick={() => setMobileMenuOpen(false)} className="hidden sm:inline-flex">
              <Button size="sm" className="h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm">
                Start session
              </Button>
            </Link>

            {/* Mobile central drawer trigger button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-8 items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 text-xs font-medium text-ink shadow-xs transition-colors hover:bg-black/[0.05] md:hidden"
              aria-label="Open navigation drawer"
            >
              <Menu size={15} />
              <span>Menu</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Central Drawer Modal for Mobile Navigation */}
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
              className="absolute inset-0 bg-black/45 backdrop-blur-md"
              aria-hidden="true"
            />

            {/* Central Floating Drawer Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              className="relative z-10 w-full max-w-[360px] overflow-hidden rounded-[28px] border border-line bg-paper-raised p-5 shadow-soft-xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-line pb-3.5">
                <Logo />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.04] text-ink hover:bg-black/[0.08]"
                  aria-label="Close menu"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Navigation Links Grid / List */}
              <div className="my-3.5 flex flex-col gap-1.5">
                {links.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-ink font-semibold text-white shadow-soft"
                          : "text-ink-soft hover:bg-black/[0.04] hover:text-ink",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-xl",
                            isActive ? "bg-white/15 text-white" : "bg-black/[0.04] text-ink",
                          )}
                        >
                          <Icon size={16} />
                        </div>
                        <span>{link.label}</span>
                      </div>
                      <ArrowRight size={14} className={isActive ? "text-white/70" : "text-muted/60"} />
                    </Link>
                  );
                })}
              </div>

              {/* Bottom Actions */}
              <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3.5">
                <Link
                  href="/start"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full"
                >
                  <Button size="lg" className="w-full justify-center text-sm">
                    Start new session
                    <ArrowRight size={15} />
                  </Button>
                </Link>

                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-medium text-ink-soft hover:bg-black/[0.04] hover:text-ink transition-colors"
                >
                  <LogOut size={13} />
                  <span>Log out of Pitchground</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
