"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@synclyft/ui/components/Button";
import {
  Brain, Code2, Mic2, Users, Check, Link as LinkIcon,
  FileText, Upload, ChevronRight, AlertCircle, Wifi, Camera, Cpu,
} from "lucide-react";
import { cn } from "@synclyft/lib/utils";
import { useRouter } from "next/navigation";
import { interviewService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import toast from "react-hot-toast";

const CODING_LANGUAGES = ["python", "javascript", "java", "cpp", "c", "typescript", "go"];

const ROUNDS = [
  { id: "aptitude", label: "Aptitude", icon: Brain, desc: "MCQ: Quantitative, Logical, Verbal, CS Fundamentals", duration: "30 min" },
  { id: "coding", label: "Coding", icon: Code2, desc: "Algorithm challenges in Monaco IDE with real test execution", duration: "45 min" },
  { id: "technical", label: "Technical", icon: Cpu, desc: "System design and domain Q&A with AI interviewer", duration: "30 min" },
  { id: "hr", label: "HR / Behavioral", icon: Mic2, desc: "Voice-first conversation with AI persona", duration: "20 min" },
];

type CheckStatus = "pending" | "checking" | "pass" | "fail";

interface PreflightItem {
  id: string;
  label: string;
  icon: React.ElementType;
  status: CheckStatus;
}

const JD_TABS = ["Link", "Text", "Upload"] as const;
type JDTab = typeof JD_TABS[number];

export default function InterviewSetupPage() {
  const [selectedRounds, setSelectedRounds] = useState<string[]>(["aptitude", "coding", "technical", "hr"]);
  const [jdTab, setJdTab] = useState<JDTab>("Text");
  const [jdText, setJdText] = useState("");
  const [jdLink, setJdLink] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [codingLanguage, setCodingLanguage] = useState("python");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [preflightDone, setPreflightDone] = useState(false);
  const [preflight, setPreflight] = useState<PreflightItem[]>([
    { id: "camera", label: "Camera access", icon: Camera, status: "pending" },
    { id: "mic", label: "Microphone access", icon: Mic2, status: "pending" },
    { id: "network", label: "Network quality", icon: Wifi, status: "pending" },
    { id: "browser", label: "Browser compatibility", icon: Cpu, status: "pending" },
  ]);

  const toggleRound = (id: string) => {
    setSelectedRounds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  // checking camera access
  const cameraCheck = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (stream.active) {
        setPreflight((prev) =>
          prev.map((item) => {
            return item.id === "camera" ? { ...item, status: "pass" } : item
          })
        );
        stream.getTracks().forEach((track) => track.stop());
        return true
      } else {
        setPreflight((prev) =>
          prev.map((item) => {
            return item.id === "camera" ? { ...item, status: "fail" } : item
          })
        );
        stream.getTracks().forEach((track) => track.stop());
        return false
      }

    } catch (error) {
      console.log(`something went wrong: ${error}`)
      return false
    }
  };

  // checking mic access
  const micCheck = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setPreflight((prev) =>
        prev.map((item) => {
          return item.id === "mic" ? { ...item, status: "pass" } : item
        })
      );
      return stream;
    } catch (error) {
      setPreflight((prev) =>
        prev.map((item) =>
          item.id === "mic" ? { ...item, status: "fail" } : item
        )
      );
    }
  };

  // checking network quality
  const networkCheck = async () => {
    try {
      const start = performance.now();

      await fetch("https://jsonplaceholder.typicode.com/posts", {
        cache: "no-store",
      });

      const end = performance.now();

      const latency = end - start;

      setPreflight((prev) =>
        prev.map((item) =>
          item.id === "network"
            ? { ...item, status: "pass" }
            : item
        )
      );

      return latency;
    } catch {
      setPreflight((prev) =>
        prev.map((item) =>
          item.id === "network"
            ? { ...item, status: "fail" }
            : item
        )
      );

      return null;
    }
  };

  const browserCheck = async () => {
    try {
      const supported =
        !!navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function" &&
        "MediaRecorder" in window &&
        "RTCPeerConnection" in window;

      setPreflight((prev) =>
        prev.map((item) =>
          item.id === "browser"
            ? {
              ...item,
              status: supported ? "pass" : "fail",
            }
            : item
        )
      );

      return supported;
    } catch (error) {
      setPreflight((prev) =>
        prev.map((item) =>
          item.id === "browser"
            ? { ...item, status: "fail" }
            : item
        )
      );

      return false;
    }
  };

  const runPreflight = async () => {
    const checks = [cameraCheck, micCheck, networkCheck, browserCheck];

    let allPassed = true;

    for (let i = 0; i < preflight.length; i++) {
      // Show "checking"
      setPreflight((prev) =>
        prev.map((item, idx) =>
          idx === i
            ? { ...item, status: "checking" }
            : item
        )
      );

      // Run actual check
      const passed = await checks[i]();

      if (!passed) {
        allPassed = false;
      }

      // Update UI
      setPreflight((prev) =>
        prev.map((item, idx) =>
          idx === i
            ? {
              ...item,
              status: passed ? "pass" : "fail",
            }
            : item
        )
      );
    }

    setPreflightDone(true);

    return allPassed;
  };

  const statusColor: Record<CheckStatus, string> = {
    pending: "#4A5260",
    checking: "#0062FF",
    pass: "#3DDC84",
    fail: "#FF5C5C",
  };

  const statusLabel: Record<CheckStatus, string> = {
    pending: "Pending",
    checking: "Checking...",
    pass: "Pass",
    fail: "Fail",
  };

  const failedPermissions = preflight
    .filter((p) => p.status === "fail")
    .map((p) => p.label)
    .join(", ");

  const allPassed = preflight.every((item) => item.status === "pass");
  const router = useRouter();

  const FIRST_ROUND_ROUTE: Record<string, string> = {
    aptitude: "/interview/aptitude",
    coding: "/interview/coding",
    technical: "/interview/technical",
    hr: "/interview/hr",
  };

  const handleStartInterview = async () => {
    if (selectedRounds.length === 0) return toast.error("Select at least one round");
    if (!targetRole.trim()) return toast.error("Enter the target role");

    const description = jdText.trim() || (jdLink.trim() ? `Job posting: ${jdLink.trim()}` : "");
    if (!description) return toast.error("Add a job description (text or link)");

    const passed = await runPreflight();
    if (!passed) {
      toast.error("Please allow the required permissions before starting.");
      return;
    }

    setCreating(true);
    try {
      const fd = new FormData();
      fd.append(
        "jobDescription",
        JSON.stringify({
          title: targetRole.trim(),
          description: description || "See attached job description.",
        })
      );
      fd.append("targetRole", targetRole.trim());
      fd.append("preferredCodingLanguage", codingLanguage);
      // Backend validates this as a JSON string (or array) — send JSON.
      const order = ["aptitude", "coding", "technical", "hr"].filter((r) => selectedRounds.includes(r));
      fd.append("selectedRounds", JSON.stringify(order));
      if (jdFile) fd.append("resume", jdFile);

      const res = (await interviewService.initialize(fd)) as { sessionId?: string; _id?: string };
      const sessionId = res.sessionId ?? res._id;
      if (!sessionId) throw new Error("Session was not created");

      // Persist for the round pages.
      try {
        sessionStorage.setItem("interview:sessionId", sessionId);
        sessionStorage.setItem("interview:rounds", JSON.stringify(order));
        sessionStorage.setItem("interview:codingLanguage", codingLanguage);
      } catch { /* private mode */ }

      router.push(FIRST_ROUND_ROUTE[order[0]] ?? "/interview/aptitude");
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-(--th-bg)" style={{ fontFamily: "var(--font-inter), sans-serif" }}>

      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <p className="label-caption mb-1" style={{ color: "var(--th-text-secondary)" }}>Mock Interview</p>
          <h1 className="text-[2rem] font-medium tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
            Configure your session
          </h1>
          <p className="text-(--th-text-faint) text-sm mt-0.5">Set your target role, select rounds, and run the pre-flight check before entering.</p>
        </div>

        {/* Role & language */}
        <div className="card-light p-6 space-y-4" style={{
          backgroundColor: "var(--th-card-bg)", border: "1px solid var(--th-card-border)", color: "var(--th-text-secondary)"
        }}>
          <h2 className="font-semibold text-sm" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>Target role</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Backend Engineer, SDE-1"
              data-testid="target-role-input"
              className="px-3 py-2 rounded-lg border text-sm"
              style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)", color: "var(--th-text-primary)" }}
            />
            <select
              value={codingLanguage}
              onChange={(e) => setCodingLanguage(e.target.value)}
              data-testid="coding-language-select"
              className="px-3 py-2 rounded-lg border text-sm"
              style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)", color: "var(--th-text-primary)" }}
            >
              {CODING_LANGUAGES.map((l) => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {/* Job Description */}
        <div className="card-light p-6 space-y-4" style={{
          backgroundColor: "var(--th-card-bg)",
          border: "1px solid var(--th-card-border)", color: "var(--th-text-secondary)"
        }}>
          <h2 className="font-semibold text-sm" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
            Job description
          </h2>

          {/* JD Tabs */}
          <div className="flex gap-1 p-0.5 rounded-sm w-fit">
            {JD_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setJdTab(tab)}
                className={cn(
                  "px-4 py-1.5 rounded text-xs font-medium transition-all",
                  jdTab === tab
                    ? "bg-(--th-bg) text-(--th-text-secondary) shadow-sm"
                    : "text-(--th-text-secondary) hover:text-(--th-text-primary)"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {jdTab === "Text" && (
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              className="input-light h-32 resize-none"
              placeholder="Paste the job description here..."
              data-testid="jd-text-input"
              style={{
                backgroundColor: "var(--th-card-bg)",
                border: "1px solid var(--th-card-border)", color: "var(--th-text-secondary)"
              }}
            />
          )}
          {jdTab === "Link" && (
            <div className="flex gap-2">
              <input
                value={jdLink}
                onChange={(e) => setJdLink(e.target.value)}
                className="input-light flex-1 "
                placeholder="https://jobs.example.com/sde-2"
                data-testid="jd-link-input"
                style={{
                  backgroundColor: "var(--th-card-bg)",
                  border: "1px solid var(--th-card-border)", color: "var(--th-text-secondary)"
                }}
              />
              <Button variant="secondary" size="sm" icon={<LinkIcon size={12} />}>Fetch</Button>
            </div>
          )}
          {jdTab === "Upload" && (
            <label className="block border-2 border-dashed border-[#D4D0C5] rounded-[8px] p-8 text-center cursor-pointer hover:border-[#0062FF] transition-colors">
              <input type="file" accept="application/pdf" className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && f.type !== "application/pdf") return;
                  setJdFile(f ?? null);
                }} />
              <Upload size={20} className="text-[#9CA3AF] mx-auto mb-2" />
              <p className="text-sm text-[#6B7280]">{jdFile ? jdFile.name : "Attach an updated resume PDF (optional)"}</p>
              <p className="text-xs text-[#9CA3AF] mt-1">We&apos;ll use your profile resume otherwise · PDF only</p>
            </label>
          )}
        </div>

        {/* Round selection */}
        <div className="card-light p-6 space-y-4" style={{
          backgroundColor: "var(--th-card-bg)",
          color: "var(--th-text-secondary)"
        }}>
          <h2 className="font-semibold text-sm" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
            Select rounds
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {ROUNDS.map((round) => {
              const selected = selectedRounds.includes(round.id);
              return (
                <button
                  key={round.id}
                  onClick={() => toggleRound(round.id)}
                  className={cn(
                    "p-4 rounded-[8px] border text-left transition-all",
                    selected
                      ? "border-(--th-border-strong) bg-[rgba(0, 98, 255, 0.04)]"
                      : "border-(--th-border) hover:border-(--th-border-strong)"
                  )}
                  style={{ backgroundColor: selected ? "var(--th-bg-tertiary)" : "var(--th-bg-secondary)", color: "var(--th-text-primary)" }}
                  data-testid={`round-select-${round.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className={cn(
                      "w-8 h-8 rounded flex items-center justify-center",
                      selected ? "bg-[rgba(0, 98, 255, 0.12)]" : "bg-[#EFEDE7]"
                    )}>
                      <round.icon size={16} className={selected ? "text-[#0062FF]" : "text-[#9CA3AF]"} />
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                      selected ? "bg-[#0062FF] border-[#0062FF]" : "border-[#D4D0C5]"
                    )}>
                      {selected && <Check size={10} className="text-[#0B0D10]" />}
                    </div>
                  </div>
                  <div className="font-medium text-sm mb-0.5" style={{ color: selected ? "#15171C" : "#4A5260" }}>
                    {round.label}
                  </div>
                  <div className="text-xs text-[#9CA3AF] leading-relaxed">{round.desc}</div>
                  <div className="text-xs font-mono text-[#6B7280] mt-2">{round.duration}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pre-flight checklist */}
        <div className="card-light p-6 space-y-4" style={{
          backgroundColor: "var(--th-card-bg)",
          color: "var(--th-text-secondary)"
        }}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
              Pre-flight check
            </h2>
            {!preflightDone && (
              <Button variant="secondary" size="sm" onClick={runPreflight} data-testid="run-preflight">
                Run checks
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {preflight.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded">
                <div className="flex items-center gap-3 text-(--th-text-muted)">
                  <item.icon size={14} />
                  <span className="text-sm">{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.status === "checking" && (
                    <div className="w-3 h-3 border-2 border-[#0062FF] border-t-transparent rounded-full animate-spin" />
                  )}
                  {item.status !== "pending" && item.status !== "checking" && (
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: statusColor[item.status] }}
                    />
                  )}
                  <span
                    className="text-xs font-mono"
                    style={{ color: statusColor[item.status] }}
                    data-testid={`preflight-${item.id}`}
                  >
                    {statusLabel[item.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {preflightDone && preflight.some((p) => p.status === "fail") && (
            <div className="flex items-start gap-2 p-3 bg-[rgba(255,92,92,0.08)] border border-[rgba(255,92,92,0.15)] rounded">
              <AlertCircle size={14} className="text-[#FF5C5C] shrink-0 mt-0.5" />
              <p className="text-xs text-[#FF5C5C]">
                {failedPermissions} {failedPermissions.split(",").length > 1 ? "are" : "is"} unavailable.
                Please allow the required permission{failedPermissions.split(",").length > 1 ? "s" : ""} and try again.
              </p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between pt-2">
          <div
            className="text-sm"
            style={{ color: "var(--th-text-secondary)" }}
          >
            <span
              className="font-mono"
              style={{ color: "var(--th-primary)" }}
            >
              {selectedRounds.length}
            </span>{" "}
            rounds selected · ~{selectedRounds.length * 30} min total
          </div>

          <Button
            size="lg"
            iconRight={<ChevronRight size={16} />}
            onClick={handleStartInterview}
            loading={creating}
            data-testid="start-session-btn"
          >
            {creating ? "Creating session…" : "Enter interview"}
          </Button>
        </div>
      </div>
    </div>
  );
}