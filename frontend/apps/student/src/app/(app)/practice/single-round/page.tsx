"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@synclyft/ui/components/Button";
import { AdaptivePulse } from "@synclyft/ui/components/AdaptivePulse";
import { Brain, Code2, Cpu, Mic2, ChevronRight, Link as LinkIcon, Upload, Check } from "lucide-react";
import { cn } from "@synclyft/lib/utils";
import { interviewService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import toast from "react-hot-toast";

const ROUND_ROUTE: Record<string, string> = {
  aptitude: "/interview/aptitude",
  coding: "/interview/coding",
  technical: "/interview/technical",
  hr: "/interview/hr",
};
const CODING_LANGUAGES = ["python", "javascript", "java", "cpp", "c", "typescript", "go"];

const ROUNDS = [
  { id: "aptitude", label: "Aptitude", icon: Brain, desc: "MCQ — Quant, Logical, Verbal, CS", duration: "30 min", href: "/interview/aptitude" },
  { id: "coding", label: "Coding", icon: Code2, desc: "Algorithm challenge in Monaco IDE", duration: "45 min", href: "/interview/coding" },
  { id: "technical", label: "Technical", icon: Cpu, desc: "System design & domain Q&A with AI", duration: "30 min", href: "/interview/technical" },
  { id: "hr", label: "HR / Behavioral", icon: Mic2, desc: "Voice-first with adaptive follow-ups", duration: "20 min", href: "/interview/hr" },
];

const JD_TABS = ["Link", "Text", "Upload"] as const;
type JDTab = typeof JD_TABS[number];

export default function SingleRoundPracticePage() {
  const router = useRouter();
  const [selectedRound, setSelectedRound] = useState<string | null>(null);
  const [jdTab, setJdTab] = useState<JDTab>("Text");
  const [jdText, setJdText] = useState("");
  const [jdLink, setJdLink] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [codingLanguage, setCodingLanguage] = useState("python");
  const [starting, setStarting] = useState(false);

  const selectedRoundData = ROUNDS.find((r) => r.id === selectedRound);

  const startPractice = async () => {
    if (!selectedRound) return;
    if (!targetRole.trim()) return toast.error("Enter a target role");
    const description = jdText.trim() || (jdLink.trim() ? `Job posting: ${jdLink.trim()}` : "");
    if (!description) return toast.error("Add a job description (text or link)");

    setStarting(true);
    try {
      const fd = new FormData();
      fd.append("jobDescription", JSON.stringify({ title: targetRole.trim(), description }));
      fd.append("targetRole", targetRole.trim());
      fd.append("preferredCodingLanguage", codingLanguage);
      fd.append("selectedRounds", JSON.stringify([selectedRound]));

      const res = (await interviewService.initialize(fd)) as { sessionId?: string; _id?: string };
      const sessionId = res.sessionId ?? res._id;
      if (!sessionId) throw new Error("Session was not created");

      try {
        sessionStorage.setItem("interview:sessionId", sessionId);
        sessionStorage.setItem("interview:rounds", JSON.stringify([selectedRound]));
        sessionStorage.setItem("interview:codingLanguage", codingLanguage);
      } catch { /* private mode */ }

      router.push(ROUND_ROUTE[selectedRound] ?? "/dashboard");
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--th-bg)", color: "var(--th-text-primary)", fontFamily: "var(--font-inter), sans-serif" }}>

      <div className="mx-auto max-w-3xl space-y-8">
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

        {/* Target role + language */}
        {selectedRound && (
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="Target role (e.g. Backend Engineer)"
              className="px-3 py-2 rounded-lg border text-sm"
              style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)", color: "var(--th-text-primary)" }}
            />
            {selectedRound === "coding" && (
              <select
                value={codingLanguage}
                onChange={(e) => setCodingLanguage(e.target.value)}
                className="px-3 py-2 rounded-lg border text-sm"
                style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)", color: "var(--th-text-primary)" }}
              >
                {CODING_LANGUAGES.map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
              </select>
            )}
          </div>
        )}

        {/* Start button */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm" style={{ color: "var(--th-text-faint)" }}>
            {selectedRound ? (
              <>Practising <span className="font-medium" style={{ color: "var(--th-text-faint)" }}>{selectedRoundData?.label}</span></>
            ) : (
              "Select a round to continue"
            )}
          </p>
          <Button
            size="lg"
            disabled={!selectedRound}
            loading={starting}
            iconRight={<ChevronRight size={16} />}
            onClick={startPractice}
            data-testid="start-practice-btn"
          >
            {starting ? "Creating session…" : "Start practice"}
          </Button>
        </div>
      </div>
    </div>
  );
}
