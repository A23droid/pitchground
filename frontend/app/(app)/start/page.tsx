"use client";

import { ArrowRight, Mic, Swords, Zap, Languages as LanguagesIcon, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";

export default function StartPage() {
  return (
    <div className="mx-auto mt-6 w-full max-w-4xl px-4 pb-20 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">Choose your training mode</h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          Select a mode to begin your next communication challenge.
        </p>
      </motion.div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ModeCard 
          href="/interview" 
          icon={Mic} 
          title="Technical Interview" 
          desc="Simulate a technical interview under pressure." 
          delay={0.05} 
        />
        <ModeCard 
          href="/debate" 
          icon={Swords} 
          title="Debate Arena" 
          desc="Live adversarial sparring against an AI." 
          delay={0.1} 
        />
        <ModeCard 
          href="/impromptu" 
          icon={Zap} 
          title="Impromptu Speaking" 
          desc="Unprepared response to a random prompt." 
          delay={0.15} 
        />
        <ModeCard 
          href="/language-diagnostic" 
          icon={LanguagesIcon} 
          title="Language Diagnostic" 
          desc="Test your English articulation and clarity." 
          delay={0.2} 
        />
        <ModeCard 
          href="/recovery-training" 
          icon={ShieldAlert} 
          title="Recovery Training" 
          desc="Practice recovering from mistakes." 
          delay={0.25} 
        />
      </div>
    </div>
  );
}

function ModeCard({ href, icon: Icon, title, desc, delay }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }} className="h-full">
      <Link href={href} className="group block h-full">
        <Card className="flex h-full flex-col justify-between p-6 transition-all duration-200 hover:border-lavender-ink/40 hover:bg-lavender/5 hover:shadow-soft-lg">
          <div>
            <div className="mb-4 inline-flex rounded-xl bg-paper-raised p-2.5 text-ink transition-colors group-hover:bg-lavender group-hover:text-lavender-ink">
              <Icon size={20} />
            </div>
            <h3 className="font-display text-lg font-semibold text-ink group-hover:text-lavender-ink">{title}</h3>
            <p className="mt-1.5 text-sm text-ink-soft">{desc}</p>
          </div>
          <div className="mt-6 flex items-center text-sm font-medium text-muted transition-colors group-hover:text-lavender-ink">
            Start session
            <ArrowRight size={14} className="ml-1.5 transition-transform group-hover:translate-x-1" />
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
