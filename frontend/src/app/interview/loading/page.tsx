"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdaptivePulse } from "@/components/ui/AdaptivePulse";

import { Logo } from "@/components/ui/Logo";

const STAGES = [
  { id: "analyze", label: "Analyzing answers", delay: 0, duration: 2000 },
  { id: "benchmark", label: "Comparing to benchmark cohort", delay: 2000, duration: 2500 },
  { id: "score", label: "Calculating round scores", delay: 4500, duration: 2000 },
  { id: "narrative", label: "Generating AI narrative insights", delay: 6500, duration: 2500 },
  { id: "grade", label: "Computing final grade", delay: 9000, duration: 1500 },
  { id: "report", label: "Building your report", delay: 10500, duration: 1000 },
];

type StageStatus = "pending" | "active" | "done";

export default function EvaluationLoadingPage() {
  const router = useRouter();
  const [stageStatuses, setStageStatuses] = useState<Record<string, StageStatus>>(() =>
    Object.fromEntries(STAGES.map((s) => [s.id, "pending"]))
  );

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    STAGES.forEach((stage) => {
      timers.push(
        setTimeout(() => {
          setStageStatuses((prev) => ({ ...prev, [stage.id]: "active" }));
        }, stage.delay)
      );

      timers.push(
        setTimeout(() => {
          setStageStatuses((prev) => ({ ...prev, [stage.id]: "done" }));
        }, stage.delay + stage.duration)
      );
    });

    const totalDuration = STAGES[STAGES.length - 1].delay + STAGES[STAGES.length - 1].duration + 500;
    timers.push(
      setTimeout(() => {
        router.push("/interview/report");
      }, totalDuration)
    );

    return () => timers.forEach(clearTimeout);
  }, [router]);

  const activeStage = STAGES.find((s) => stageStatuses[s.id] === "active");

  return (
    <div className="min-h-screen bg-[#0B0D10] flex flex-col" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      {/* Top pulse */}
      <AdaptivePulse mode={activeStage ? "processing" : "steady"} intensity={0.7} />

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-10">
          {/* Icon */}
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-[rgba(0,98,255,0.1)] border border-[rgba(0,98,255,0.2)] flex items-center justify-center">
                <Logo size={36} />
              </div>
              <div className="absolute inset-0 rounded-full border border-[#0062FF] animate-ping opacity-20" />
            </div>
          </div>

          {/* Headline */}
          <div className="text-center">
            <h1
              className="text-xl font-bold text-[#E8EAF0] tracking-tight mb-2"
              style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}
            >
              Generating your report
            </h1>
            <p className="text-sm text-[#6B7280]">
              Our AI is analyzing your performance across all four rounds.
            </p>
          </div>

          {/* Stage list */}
          <div className="space-y-4">
            {STAGES.map((stage) => {
              const status = stageStatuses[stage.id];
              return (
                <div key={stage.id} className="flex items-center gap-4">
                  {/* Status indicator */}
                  <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                    {status === "done" ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" fill="rgba(61,220,132,0.1)" stroke="rgba(61,220,132,0.3)" />
                        <path d="M5 8l2 2 4-4" stroke="#3DDC84" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : status === "active" ? (
                      <div className="w-3 h-3 border-2 border-[#0062FF] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-[#2A2F38]" />
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className="font-mono text-sm"
                    style={{
                      color:
                        status === "done"
                          ? "#3DDC84"
                          : status === "active"
                          ? "#0062FF"
                          : "#2A2F38",
                    }}
                    data-testid={`stage-${stage.id}`}
                  >
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="h-px bg-[#1B1F26] rounded overflow-hidden">
              <div
                className="h-full bg-[#0062FF] transition-all duration-500"
                style={{
                  width: `${(Object.values(stageStatuses).filter((s) => s === "done").length / STAGES.length) * 100}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-[#4A5260]">Processing...</span>
              <span className="font-mono text-xs text-[#0062FF]">
                {Math.round((Object.values(stageStatuses).filter((s) => s === "done").length / STAGES.length) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
