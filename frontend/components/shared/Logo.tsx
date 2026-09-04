import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-display text-[19px] tracking-tight text-ink", className)}>
      <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-teal">
        <span className="h-2 w-2 rounded-full bg-lavender" />
      </span>
      Pitchground
    </span>
  );
}
