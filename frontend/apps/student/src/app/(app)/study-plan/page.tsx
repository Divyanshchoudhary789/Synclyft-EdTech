"use client";

import { useState } from "react";
import Link from "next/link";
import { insightsService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { useStudyPlanList, useInterviewHistory } from "@synclyft/lib/api/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@synclyft/ui/components/Button";
import { Badge } from "@synclyft/ui/components/Badge";
import { SkeletonCard } from "@synclyft/ui/components/SkeletonBlock";
import toast from "react-hot-toast";
import {
  BookOpen, Sparkles, Clock, X, Target, Milestone, CheckCircle2, PlayCircle, PauseCircle, Archive, ChevronRight, AlertCircle,
} from "lucide-react";
import { readPlanProgress } from "./progressStore";

const PRIORITY: Record<string, "coral" | "amber" | "neutral"> = { high: "coral", medium: "amber", low: "neutral" };
const STATUS_ICON: Record<string, typeof PlayCircle> = { active: PlayCircle, paused: PauseCircle, completed: CheckCircle2, archived: Archive };

interface PlanRow {
  id: string; planTitle: string; status: string; priority?: string;
  estimatedTotalHours?: number; overallCompetencyBefore?: number;
  topicCount?: number; milestoneCount?: number; generatedAt?: string; completedAt?: string;
}
interface Group { targetRole: string; plans: PlanRow[] }

function ProgressRing({ pct }: { pct: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90 shrink-0">
      <circle cx="18" cy="18" r={r} fill="none" stroke="var(--th-border)" strokeWidth="3" />
      <circle cx="18" cy="18" r={r} fill="none" stroke={pct >= 100 ? "#3DDC84" : "var(--th-primary)"} strokeWidth="3"
        strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`} />
    </svg>
  );
}

export default function StudyPlanPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useStudyPlanList();
  const { data: history } = useInterviewHistory(10);
  const [genOpen, setGenOpen] = useState(false);

  const groups = ((data as { groupedByRole?: Group[] })?.groupedByRole ?? []) as Group[];
  const summary = (data as { summary?: { totalPlans: number; activePlans: number; completedPlans: number } })?.summary;
  const sessions = ((history as { analytics?: { sessionId: string; overallScore?: number; finalGrade?: string; campaign?: { title?: string } | null; completedAt?: string }[] })?.analytics ?? []);

  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="label-caption mb-1" style={{ color: "var(--th-text-faint)" }}>Learning</p>
          <h1 className="text-[1.65rem] sm:text-[2rem] font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>AI study plan</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--th-text-faint)" }}>Personalised topics &amp; a week-by-week timeline built from your interview performance</p>
        </div>
        <Button icon={<Sparkles size={14} />} onClick={() => setGenOpen(true)}>Generate a plan</Button>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total plans", value: summary.totalPlans },
            { label: "Active", value: summary.activePlans },
            { label: "Completed", value: summary.completedPlans },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border p-5" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--th-text-faint)" }}>{k.label}</p>
              <p className="mt-2 text-2xl font-bold" style={{ color: "var(--th-text-primary)" }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
          <AlertCircle size={16} className="text-amber-500" /> Couldn&apos;t load your study plans.
          <button onClick={() => refetch()} className="ml-auto text-blue-600 dark:text-blue-400 text-xs">Retry</button>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2"><SkeletonCard className="h-40" /><SkeletonCard className="h-40" /></div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border p-8 sm:p-12 text-center" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
          <BookOpen size={28} className="mx-auto mb-3" style={{ color: "var(--th-text-faint)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--th-text-primary)" }}>No study plans yet</p>
          <p className="text-xs mt-1 mb-4" style={{ color: "var(--th-text-faint)" }}>Generate a plan from a completed mock interview or a target role — the AI turns your weak spots into a week-by-week schedule.</p>
          <Button variant="secondary" onClick={() => setGenOpen(true)} icon={<Sparkles size={13} />}>Generate your first plan</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.targetRole}>
              <h2 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--th-text-faint)" }}>{g.targetRole}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {g.plans.map((p) => {
                  const Icon = STATUS_ICON[p.status] ?? PlayCircle;
                  const prog = readPlanProgress(p.id);
                  const pct = p.topicCount ? Math.round((prog.length / p.topicCount) * 100) : (p.status === "completed" ? 100 : 0);
                  return (
                    <Link key={p.id} href={`/study-plan/${p.id}`}
                      className="rounded-2xl border p-5 text-left transition-colors hover:border-[color:var(--th-primary)] block"
                      style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold" style={{ color: "var(--th-text-primary)" }}>{p.planTitle}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: "var(--th-text-muted)" }}>
                            <span className="flex items-center gap-1"><Target size={11} /> {p.topicCount ?? 0} topics</span>
                            <span className="flex items-center gap-1"><Milestone size={11} /> {p.milestoneCount ?? 0} weeks</span>
                            {p.estimatedTotalHours ? <span className="flex items-center gap-1"><Clock size={11} /> ~{p.estimatedTotalHours}h</span> : null}
                          </div>
                        </div>
                        <ProgressRing pct={pct} />
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Icon size={13} style={{ color: p.status === "completed" ? "#3DDC84" : "var(--th-text-faint)" }} />
                          <span className="text-[11px] capitalize" style={{ color: "var(--th-text-faint)" }}>{p.status}</span>
                          {p.priority && <Badge variant={PRIORITY[p.priority] ?? "neutral"}>{p.priority}</Badge>}
                        </div>
                        <span className="text-[11px] font-semibold flex items-center gap-0.5" style={{ color: "var(--th-primary)" }}>
                          Open timeline <ChevronRight size={12} />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {genOpen && (
        <GenerateModal
          sessions={sessions}
          onClose={() => setGenOpen(false)}
          onDone={() => { setGenOpen(false); qc.invalidateQueries({ queryKey: ["insights", "study-plans"] }); }}
        />
      )}
    </div>
  );
}

function GenerateModal({
  sessions, onClose, onDone,
}: {
  sessions: { sessionId: string; overallScore?: number; finalGrade?: string; campaign?: { title?: string } | null; completedAt?: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const JD_MAX = 20000;
  const [mode, setMode] = useState<"session" | "role">(sessions.length > 0 ? "session" : "role");
  const [sourceSessionId, setSourceSessionId] = useState(sessions[0]?.sessionId ?? "");
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    if (mode === "session" && !sourceSessionId) return toast.error("Pick an interview");
    if (mode === "role" && !targetRole.trim()) return toast.error("Enter a target role");
    setBusy(true);
    try {
      await insightsService.generateStudyPlan(
        mode === "session"
          ? { sourceSessionId }
          : { targetRole: targetRole.trim(), jobDescription: jobDescription.trim().slice(0, JD_MAX) || undefined }
      );
      toast.success("Study plan generated");
      onDone();
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border flex flex-col max-h-[88vh]" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b" style={{ borderColor: "var(--th-border)" }}>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>Generate a study plan</h3>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--th-text-faint)" }}>Uses one AI evaluation credit · ~20 seconds</p>
          </div>
          <button onClick={onClose} style={{ color: "var(--th-text-faint)" }}><X size={18} /></button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 rounded-lg border p-1" style={{ borderColor: "var(--th-border)" }}>
            {([["session", "From an interview"], ["role", "For a target role"]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setMode(k)} disabled={k === "session" && sessions.length === 0}
                className="px-3 py-2 rounded-md text-xs font-semibold transition-colors disabled:opacity-40"
                style={{ backgroundColor: mode === k ? "var(--th-primary)" : "transparent", color: mode === k ? "#fff" : "var(--th-text-secondary)" }}>
                {label}
              </button>
            ))}
          </div>

          {mode === "session" ? (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--th-text-faint)" }}>Source interview</label>
              {sessions.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--th-text-muted)" }}>You haven&apos;t completed a mock interview yet — use &ldquo;For a target role&rdquo; instead.</p>
              ) : (
                <select value={sourceSessionId} onChange={(e) => setSourceSessionId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border text-xs" style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }}>
                  {sessions.map((s) => (
                    <option key={s.sessionId} value={s.sessionId}>
                      {(s.campaign?.title || "Mock interview")} · {Math.round(s.overallScore ?? 0)}% · {s.completedAt ? new Date(s.completedAt).toLocaleDateString("en-IN") : ""}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[11px]" style={{ color: "var(--th-text-faint)" }}>The plan targets exactly the weak spots from that interview.</p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--th-text-faint)" }}>Target role</label>
                <input value={targetRole} onChange={(e) => setTargetRole(e.target.value.slice(0, 200))} placeholder="e.g. Backend Engineer, SDE-1"
                  className="w-full px-3 py-2.5 rounded-lg border text-sm" style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--th-text-faint)" }}>Job description <span className="normal-case font-normal">(optional)</span></label>
                <textarea rows={6} value={jobDescription} onChange={(e) => setJobDescription(e.target.value.slice(0, JD_MAX))}
                  placeholder="Paste the JD — responsibilities, required skills, tech stack…"
                  className="w-full px-3 py-2.5 rounded-lg border text-sm resize-y" style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
                <p className="text-[11px] text-right" style={{ color: "var(--th-text-faint)" }}>{jobDescription.length.toLocaleString()} / {JD_MAX.toLocaleString()}</p>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 sm:px-6 py-4 border-t" style={{ borderColor: "var(--th-border)" }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={busy} onClick={generate} icon={<Sparkles size={14} />} disabled={mode === "session" && sessions.length === 0}>Generate</Button>
        </div>
      </div>
    </div>
  );
}
