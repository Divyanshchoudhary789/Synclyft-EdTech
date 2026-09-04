"use client";

import { cn } from "@synclyft/lib/utils";
import { Flag, Check, Loader2 } from "lucide-react";

export type PaletteState = "answered" | "selected" | "unanswered" | "pending";

interface Props {
  total: number;
  current: number;
  stateFor: (page: number) => PaletteState;
  flagged: Set<number>;
  onJump: (page: number) => void;
  className?: string;
}

const DOT: Record<PaletteState, string> = {
  answered: "bg-[#3DDC84]/15 text-[#3DDC84] border-[#3DDC84]/30",
  selected: "bg-[#0062FF]/12 text-[#0062FF] border-[#0062FF]/40",
  pending: "bg-[#F59E0B]/12 text-[#F59E0B] border-[#F59E0B]/30",
  unanswered: "bg-[var(--iv-elevated)] text-[var(--iv-text-muted)] border-[var(--iv-border)]",
};

export function QuestionPalette({ total, current, stateFor, flagged, onJump, className }: Props) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-5">
        {Array.from({ length: total }, (_, i) => i + 1).map((p) => {
          const st = stateFor(p);
          const isCurrent = p === current;
          return (
            <button
              key={p}
              onClick={() => onJump(p)}
              className={cn(
                "relative flex h-8 items-center justify-center rounded-md border text-xs font-semibold tabular-nums transition-all",
                DOT[st],
                isCurrent && "ring-2 ring-[#0062FF] ring-offset-1 ring-offset-[var(--iv-panel)]"
              )}
              aria-current={isCurrent ? "true" : undefined}
              aria-label={`Question ${p}${st === "answered" ? " (answered)" : ""}`}
            >
              {st === "pending" ? <Loader2 size={11} className="animate-spin" /> : st === "answered" ? <Check size={11} /> : p}
              {flagged.has(p) && (
                <Flag size={8} className="absolute -right-0.5 -top-0.5 fill-[#F59E0B] text-[#F59E0B]" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--iv-text-faint)]">
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-[#3DDC84]/60" /> Answered</span>
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-[#0062FF]/60" /> Current / selected</span>
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-[var(--iv-elevated)] border border-[var(--iv-border)]" /> Not answered</span>
      </div>
    </div>
  );
}
