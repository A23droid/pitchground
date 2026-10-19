"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { formatSigned } from "@/lib/utils";
import type { RecentSessionSummary, TrainingMode } from "@/lib/types";
import { Mic, Swords, Zap, Languages, ShieldAlert, ArrowRight, Layers } from "lucide-react";

const modes = [
  {id:"interview",label:"Interview",href:"/interview",icon:Mic,tone:"teal",description:"Baseline, pressure and retry recordings for your chosen domain."},
  {id:"debate",label:"Debate Arena",href:"/debate",icon:Swords,tone:"lavender",description:"Opening, rebuttal and closing responses to an AI opponent."},
  {id:"impromptu",label:"Impromptu Speaking",href:"/impromptu",icon:Zap,tone:"amber",description:"Spontaneous speaking with pacing measured over your recording."},
  {id:"language-diagnostic",label:"Language Diagnostic",href:"/language-diagnostic",icon:Languages,tone:"lavender",description:"The same question recorded in your comfortable language and English."},
  {id:"recovery-training",label:"Recovery Training",href:"/recovery-training",icon:ShieldAlert,tone:"teal",description:"Recorded delivery before and after an interruption."},
] as const;

export function ModeUsageCard({sessions}:{sessions:RecentSessionSummary[]}) {
  const [activeFilter,setActiveFilter]=useState<"all"|TrainingMode>("all");
  const measured=sessions.filter(s=>s.overallScore!==null);
  const active=new Set(measured.map(s=>s.mode)).size;
  const filtered=activeFilter==="all" ? sessions : sessions.filter(s=>s.mode===activeFilter);
  return <div className="flex flex-col gap-6">
    <div>
      <div className="mb-3 flex items-center justify-between"><div><h2 className="font-display text-xl text-ink">Training Modes Mastery</h2><p className="text-xs text-ink-soft">Measured results across your recorded practice formats.</p></div><Badge variant="outline" size="sm">{active} Practiced Modes</Badge></div>
      <div className="grid gap-4 sm:grid-cols-3">{modes.map(mode=>{
        const history=measured.filter(s=>s.mode===mode.id);
        const scores=history.map(s=>s.overallScore).filter((v):v is number=>v!==null);
        const average=scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : null;
        const Icon=mode.icon;
        return <Card key={mode.id} className="flex flex-col justify-between border-line bg-paper-raised p-5 shadow-soft transition-all hover:border-teal">
          <div><div className="flex items-center justify-between"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${mode.tone==="teal"?"bg-teal-soft text-teal-ink":mode.tone==="amber"?"bg-amber-soft text-amber-ink":"bg-lavender text-lavender-ink"}`}><Icon size={18}/></div><Badge variant={mode.tone} size="sm">{history.length} Sessions</Badge></div>
          <h3 className="mt-3 font-display text-base font-semibold text-ink">{mode.label}</h3><p className="mt-0.5 text-xs text-ink-soft">{mode.description}</p>
          <div className="my-4 flex items-baseline justify-between border-y border-line/60 py-3"><span className="text-xs text-muted">Average Score</span><div className="flex items-baseline gap-1"><span className="font-display text-2xl font-bold text-ink">{average ?? "—"}</span><span className="text-xs text-muted">/100</span></div></div>
          <div className="flex flex-col gap-2 text-xs"><p className="text-ink-soft">{average===null ? "Complete a recorded practice to see your measurements." : `Based on ${scores.length} verified sessions.`}</p><Progress value={average ?? 0} barClassName={mode.tone==="teal"?"bg-teal":mode.tone==="amber"?"bg-amber":"bg-lavender-ink"}/></div></div>
          <Link href={mode.href} className="mt-5"><Button size="sm" variant="outline" className="w-full justify-center text-xs">Practice {mode.label}<ArrowRight size={13}/></Button></Link>
        </Card>;
      })}</div>
    </div>
    <Card className="p-5 sm:p-6"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-display text-lg text-ink"><Layers size={17}/>Session History</h2><div className="flex flex-wrap gap-2">{[{id:"all",label:"All"},...modes].map(mode=><button key={mode.id} onClick={()=>setActiveFilter(mode.id as "all"|TrainingMode)} className={`rounded-full border px-3 py-1 text-xs ${activeFilter===mode.id?"border-lavender-ink bg-lavender text-ink":"border-line text-muted"}`}>{mode.label}</button>)}</div></div>
      {!filtered.length ? <p className="rounded-xl border border-line bg-paper p-4 text-sm text-muted">No sessions in this mode yet.</p> : filtered.map((s,i)=><motion.div key={s.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*.02}} className="flex items-center justify-between gap-4 border-b border-line py-3.5 last:border-b-0"><div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{s.topic}</p><p className="mt-0.5 text-xs text-muted">{s.date} · {s.primaryWeakness}</p></div><div className="flex shrink-0 items-center gap-2">{s.scoreDelta!==null && <Badge variant={s.scoreDelta>=0?"teal":"amber"} size="sm">{formatSigned(s.scoreDelta)}</Badge>}<span className="w-10 text-right font-mono text-sm font-semibold text-ink">{s.overallScore ?? "—"}</span></div></motion.div>)}
    </Card>
  </div>;
}
