"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AdaptivePulse } from "@/components/ui/AdaptivePulse";
import { Brain, Code2, Cpu, Mic2, ChevronRight, Link as LinkIcon, Upload, FileText, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const ROUNDS = [
  { id: "aptitude", label: "Aptitude", icon: Brain, desc: "MCQ — Quant, Logical, Verbal, CS", duration: "30 min", href: "/interview/aptitude" },
  { id: "coding", label: "Coding", icon: Code2, desc: "Algorithm challenge in Monaco IDE", duration: "45 min", href: "/interview/coding" },
  { id: "technical", label: "Technical", icon: Cpu, desc: "System design & domain Q&A with AI", duration: "30 min", href: "/interview/technical" },
  { id: "hr", label: "HR / Behavioral", icon: Mic2, desc: "Voice-first with adaptive follow-ups", duration: "20 min", href: "/interview/hr" },
];

const JD_TABS = ["Link", "Text", "Upload"] as const;
type JDTab = typeof JD_TABS[number];

export default function SingleRoundPracticePage() {
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [jdTab, setJdTab] = useState<JDTab>("Text");
  const [jdText, setJdText] = useState("");
  const [jdLink, setJdLink] = useState("");

  const selectedRoundData = ROUNDS.find((r) => r.id === selectedRound);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--th-bg)", color: "var(--th-text-primary)", fontFamily: "var(--font-inter), sans-serif" }}>
      <Navbar mode="intelligence" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8" style={{ backgroundColor: "var(--th-bg)", color: "var(--th-text-secondary)" }}>
        <div>
          <div
            className="flex items-center gap-2 mb-1"
            style={{ color: "var(--th-text-secondary)" }}
          >
            {/* <Badge variant="amber">Tool</Badge> */}
            <p className="label-caption" style={{ color: "var(--th-text-secondary)" }}>
              Single Round Practice
            </p>
          </div>

          <h1
            className="text-[2rem] font-medium tracking-tight"
            style={{
              fontFamily: "var(--font-inter-tight), sans-serif",
              color: "var(--th-text-primary)",
            }}
          >
            Practice a single round
          </h1>

          <p
            className="mt-1 text-sm"
            style={{ color: "var(--th-text-faint)" }}
          >
            Drill a specific round in isolation. Full Focus Mode experience —
            same AdaptivePulse shell, same timer, same AI calibration.
          </p>
        </div>

        {/* Round selector */}
        <div className="space-y-3" style={{ backgroundColor: "var(--th-bg)", color: "var(--th-text-secondary)" }}>
          <h2
            className="text-sm font-semibold"
            style={{
              fontFamily: "var(--font-inter-tight), sans-serif",
              color: "var(--th-text-primary)",
            }}
          >
            Select round to practice
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {ROUNDS.map((round) => {
              const isSelected = selectedRound === round.id;
              return (
                <button
                  key={round.id}
                  onClick={() => setSelectedRound(round.id)}
                  className="p-5 rounded-[8px] border text-left transition-all"
                  style={{
                    borderColor: isSelected
                      ? "var(--th-secondary)"
                      : "var(--th-border)",
                    backgroundColor: isSelected
                      ? "color-mix(in srgb, var(--th-secondary) 8%, transparent)"
                      : "var(--th-card-bg-alt)",
                  }}
                  data-testid={`practice-round-${round.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn(
                      "w-9 h-9 rounded flex items-center justify-center transition-all",
                      isSelected ? "bg-[rgba(0, 98, 255, 0.12)]" : "var(--th-bg-alt)"
                    )}>
                      <round.icon size={20} className={isSelected ? "var(--th-toggle-track)" : "var(--th-toggle-track)"} />
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                      isSelected ? "border-(--th-secondary) bg-(--th-secondary)" : "var(--th-border)"
                    )}>
                      {isSelected && <Check size={10} className="var(--th-toggle-track)" />}
                    </div>
                  </div>
                  <div className="font-semibold text-sm mb-1" style={{ color: isSelected ? "var(--th-secondary)" : "var(--th-text-primary)", fontFamily: "var(--font-inter-tight), sans-serif" }}>
                    {round.label}
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: "var(--th-text-faint)" }}>{round.desc}</div>
                  <div className="text-xs font-mono mt-2" style={{ color: "var(--th-text-faint)" }}>{round.duration}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* JD input (reused from setup) */}
        <div className="card-light p-6 space-y-4" style={{ backgroundColor: "var(--th-bg)" }}>
          <h2 className="font-semibold " style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
            Job description (optional — improves calibration)
          </h2>

          <div
            className="flex gap-1 p-0.5 w-fit"
            style={{ backgroundColor: "var(--th-bg)", borderRadius: "var(--radius-card)", 
              borderColor: "var(--th-border)" }}
          >
            {JD_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setJdTab(tab)}
                className="px-4 py-1.5 rounded text-xs font-medium transition-all"
                style={{
                  backgroundColor:
                    jdTab === tab ? "var(--th-bg)" : "transparent",
                  color:
                    jdTab === tab
                      ? "var(--th-text-primary)"
                      : "var(--th-text-secondary)",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {jdTab === "Text" && (
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              className="input-light h-24 resize-none"
              placeholder="Paste the job description to calibrate question difficulty and relevance..."
              data-testid="practice-jd-text"
              style={{
                backgroundColor: "var(--th-bg-alt)",
                color: "var(--th-text-secondary)",
                borderColor: "var(--th-border)",
              }}
            />
          )}
          {jdTab === "Link" && (
            <div className="flex gap-2">
              <input
                value={jdLink}
                onChange={(e) => setJdLink(e.target.value)}
                placeholder="https://jobs.example.com/role"
                className="flex-1 rounded-md border px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  backgroundColor: "var(--th-card)",
                  color: "var(--th-text-primary)",
                  borderColor: "var(--th-border)",
                }}
              />

              <Button
                variant="secondary"
                size="sm"
                icon={<LinkIcon size={12} />}
              >
                Fetch
              </Button>
            </div>
          )}
          {jdTab === "Upload" && (
            <div
              className="border-2 border-dashed rounded p-6 text-center cursor-pointer transition-colors"
              style={{
                borderColor: "var(--th-border)",
                backgroundColor: "var(--th-card)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--th-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--th-border)";
              }}
            >
              <Upload
                size={18}
                className="mx-auto mb-2"
                style={{ color: "var(--th-text-secondary)" }}
              />

              <p
                className="text-xs"
                style={{ color: "var(--th-text-secondary)" }}
              >
                Upload JD PDF
              </p>
            </div>
          )}
        </div>

        {/* Preview of Focus Mode */}
        {selectedRound && (
          <div className="card-light p-5 space-y-3" style={{ background: "var(--th-card)", borderColor: "var(--th-border)" }}>
            <p className="text-xs  font-mono uppercase tracking-wider" style={{ color: "var(--th-text-faint)" }}>Preview — Focus Mode shell</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="uppercase tracking-wider" style={{ color: "var(--th-text-faint)" }}>
                  {ROUNDS.findIndex((r) => r.id === selectedRound) + 1 === 1 ? "01" :
                    ROUNDS.findIndex((r) => r.id === selectedRound) + 1 === 2 ? "02" :
                      ROUNDS.findIndex((r) => r.id === selectedRound) + 1 === 3 ? "03" : "04"} — {selectedRoundData?.label}
                </span>
                <span style={{ color: "var(--th-text-faint)" }}>{selectedRoundData?.duration}</span>
              </div>
              <AdaptivePulse mode="steady" intensity={0.5} />
            </div>
          </div>
        )}

        {/* Start button */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm" style={{ color: "var(--th-text-faint)" }}>
            {selectedRound ? (
              <>Starting <span className="font-medium" style={{ color: "var(--th-text-faint)" }}>{selectedRoundData?.label}</span> practice</>
            ) : (
              "Select a round to continue"
            )}
          </p>
          <Link href={selectedRoundData?.href ?? "#"}>
            <Button
              size="lg"
              disabled={!selectedRound}
              iconRight={<ChevronRight size={16} />}
              data-testid="start-practice-btn"
            >
              Start practice
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
