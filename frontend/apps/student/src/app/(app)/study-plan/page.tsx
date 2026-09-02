"use client";

import { useState } from "react";
import { insightsService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { useStudyPlanList, useStudyPlan, useInterviewHistory } from "@synclyft/lib/api/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@synclyft/ui/components/Button";
import { Badge } from "@synclyft/ui/components/Badge";
import { SkeletonCard } from "@synclyft/ui/components/SkeletonBlock";
import toast from "react-hot-toast";
import {
  BookOpen, Sparkles, Clock, X, Loader2, Target, Milestone, CheckCircle2, PlayCircle, PauseCircle, Archive, ChevronRight, AlertCircle,
} from "lucide-react";

const PRIORITY: Record<string, "coral" | "amber" | "neutral"> = { high: "coral", medium: "amber", low: "neutral" };
const STATUS_ICON: Record<string, typeof PlayCircle> = { active: PlayCircle, paused: PauseCircle, completed: CheckCircle2, archived: Archive };

interface PlanRow {
  id: string; planTitle: string; status: string; priority?: string;
  estimatedTotalHours?: number; overallCompetencyBefore?: number;
  topicCount?: number; milestoneCount?: number; generatedAt?: string; completedAt?: string;
}
interface Group { targetRole: string; plans: PlanRow[] }

export default function StudyPlanPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useStudyPlanList();
  const { data: history } = useInterviewHistory(10);
  const [genOpen, setGenOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const groups = ((data as { groupedByRole?: Group[] })?.groupedByRole ?? []) as Group[];
  const summary = (data as { summary?: { totalPlans: number; activePlans: number; completedPlans: number } })?.summary;
  const sessions = ((history as { analytics?: { sessionId: string; overallScore?: number; finalGrade?: string; campaign?: { title?: string } | null; completedAt?: string }[] })?.analytics ?? []);

  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="label-caption mb-1" style={{ color: "var(--th-text-faint)" }}>Learning</p>
          <h1 className="text-[2rem] font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>AI study plan</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--th-text-faint)" }}>Personalised topics &amp; weekly milestones based on your interview performance</p>
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
        <div className="rounded-2xl border p-12 text-center" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
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
                  return (
                    <button key={p.id} onClick={() => setDetailId(p.id)}
                      className="rounded-2xl border p-5 text-left transition-colors hover:border-[color:var(--th-primary)]"
                      style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold" style={{ color: "var(--th-text-primary)" }}>{p.planTitle}</p>
                        <Icon size={15} style={{ color: p.status === "completed" ? "#3DDC84" : "var(--th-text-faint)" }} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: "var(--th-text-muted)" }}>
                        <span className="flex items-center gap-1"><Target size={11} /> {p.topicCount ?? 0} topics</span>
                        <span className="flex items-center gap-1"><Milestone size={11} /> {p.milestoneCount ?? 0} milestones</span>
                        {p.estimatedTotalHours ? <span className="flex items-center gap-1"><Clock size={11} /> ~{p.estimatedTotalHours}h</span> : null}
                        {p.priority && <Badge variant={PRIORITY[p.priority] ?? "neutral"}>{p.priority}</Badge>}
                      </div>
                    </button>
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
      {detailId && (
        <PlanDetail
          planId={detailId}
          onClose={() => setDetailId(null)}
          onStatus={() => qc.invalidateQueries({ queryKey: ["insights", "study-plans"] })}
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
          : { targetRole: targetRole.trim(), jobDescription: jobDescription.trim() || undefined }
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
      <div className="w-full max-w-md rounded-2xl border p-6 space-y-4 relative" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
        <button onClick={onClose} className="absolute right-4 top-4" style={{ color: "var(--th-text-faint)" }}><X size={18} /></button>
        <h3 className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>Generate a study plan</h3>

        <div className="inline-flex rounded-lg border p-0.5 w-full" style={{ borderColor: "var(--th-border)" }}>
          {([["session", "From an interview"], ["role", "For a target role"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setMode(k)} disabled={k === "session" && sessions.length === 0}
              className="flex-1 px-3 py-1.5 rounded text-xs font-semibold transition-colors disabled:opacity-40"
              style={{ backgroundColor: mode === k ? "var(--th-primary)" : "transparent", color: mode === k ? "#fff" : "var(--th-text-secondary)" }}>
              {label}
            </button>
          ))}
        </div>

        {mode === "session" ? (
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Interview</label>
            <select value={sourceSessionId} onChange={(e) => setSourceSessionId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-xs" style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }}>
              {sessions.map((s) => (
                <option key={s.sessionId} value={s.sessionId}>
                  {(s.campaign?.title || "Mock interview")} · {Math.round(s.overallScore ?? 0)}% · {s.completedAt ? new Date(s.completedAt).toLocaleDateString("en-IN") : ""}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Target role</label>
              <input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Backend Engineer"
                className="w-full px-3 py-2 rounded-lg border text-xs" style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Job description (optional)</label>
              <textarea rows={3} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-xs resize-none" style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
            </div>
          </>
        )}

        <p className="text-[11px]" style={{ color: "var(--th-text-faint)" }}>Uses one AI evaluation credit. Takes ~20 seconds.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={busy} onClick={generate} icon={<Sparkles size={14} />}>Generate</Button>
        </div>
      </div>
    </div>
  );
}

function PlanDetail({ planId, onClose, onStatus }: { planId: string; onClose: () => void; onStatus: () => void }) {
  const { data, isLoading, error } = useStudyPlan(planId);
  const [busy, setBusy] = useState(false);
  const plan = data as {
    planTitle?: string; status?: string; narrativeSummary?: string; keyImprovementAreas?: string[];
    estimatedTotalHours?: number; overallCompetencyBefore?: number;
    topics?: { topicName: string; subtopics?: string[]; estimatedHours?: number; priority?: string; competencyBefore?: number; resources?: { title?: string; url?: string }[] }[];
    milestones?: { week: number; title: string; topics?: string[]; targetCompetency?: number }[];
  } | undefined;

  const setStatus = async (status: string) => {
    setBusy(true);
    try {
      await insightsService.setStudyPlanStatus(planId, status);
      toast.success(`Marked ${status}`);
      onStatus();
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full overflow-y-auto shadow-2xl" style={{ backgroundColor: "var(--th-bg)" }}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-bg)" }}>
          <h2 className="text-sm font-bold truncate" style={{ color: "var(--th-text-primary)" }}>{plan?.planTitle ?? "Study plan"}</h2>
          <button onClick={onClose} style={{ color: "var(--th-text-faint)" }}><X size={18} /></button>
        </div>

        {isLoading ? (
          <div className="p-6"><Loader2 size={20} className="animate-spin" style={{ color: "var(--th-primary)" }} /></div>
        ) : error ? (
          <p className="p-6 text-sm" style={{ color: "var(--th-text-secondary)" }}><AlertCircle size={16} className="inline mr-2 text-amber-500" />{toApiError(error).message}</p>
        ) : plan ? (
          <div className="p-6 space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={plan.status === "completed" ? "verdant" : "neutral"}>{plan.status}</Badge>
              {plan.estimatedTotalHours ? <span className="text-xs flex items-center gap-1" style={{ color: "var(--th-text-muted)" }}><Clock size={12} /> ~{plan.estimatedTotalHours}h total</span> : null}
            </div>

            {plan.narrativeSummary && (
              <p className="text-sm leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>{plan.narrativeSummary}</p>
            )}

            {(plan.keyImprovementAreas ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {plan.keyImprovementAreas!.map((a) => (
                  <span key={a} className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">{a}</span>
                ))}
              </div>
            )}

            {(plan.topics ?? []).length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--th-text-faint)" }}>Topics</h3>
                <div className="space-y-2">
                  {plan.topics!.map((t, i) => (
                    <div key={i} className="rounded-xl border p-4" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold" style={{ color: "var(--th-text-primary)" }}>{t.topicName}</p>
                        <span className="text-[11px] flex items-center gap-2" style={{ color: "var(--th-text-faint)" }}>
                          {t.estimatedHours ? `~${t.estimatedHours}h` : ""} {t.priority && <Badge variant={PRIORITY[t.priority] ?? "neutral"}>{t.priority}</Badge>}
                        </span>
                      </div>
                      {(t.subtopics ?? []).length > 0 && (
                        <p className="text-[11px] mt-1" style={{ color: "var(--th-text-muted)" }}>{t.subtopics!.join(" · ")}</p>
                      )}
                      {(t.resources ?? []).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {t.resources!.map((r, j) => r.url ? (
                            <a key={j} href={r.url} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5">
                              {r.title || "Resource"} <ChevronRight size={10} />
                            </a>
                          ) : <span key={j} className="text-[11px]" style={{ color: "var(--th-text-faint)" }}>{r.title}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(plan.milestones ?? []).length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--th-text-faint)" }}>Weekly milestones</h3>
                <div className="space-y-2">
                  {plan.milestones!.map((m, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl border p-3" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                      <span className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold" style={{ backgroundColor: "var(--th-bg-secondary)", color: "var(--th-text-primary)" }}>W{m.week}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold" style={{ color: "var(--th-text-primary)" }}>{m.title}</p>
                        {(m.topics ?? []).length > 0 && <p className="text-[11px] mt-0.5" style={{ color: "var(--th-text-faint)" }}>{m.topics!.join(", ")}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: "var(--th-border)" }}>
              {plan.status !== "active" && <Button variant="secondary" size="sm" disabled={busy} onClick={() => setStatus("active")}><PlayCircle size={13} /> Resume</Button>}
              {plan.status === "active" && <Button variant="secondary" size="sm" disabled={busy} onClick={() => setStatus("paused")}><PauseCircle size={13} /> Pause</Button>}
              {plan.status !== "completed" && <Button size="sm" disabled={busy} onClick={() => setStatus("completed")}><CheckCircle2 size={13} /> Mark done</Button>}
              <Button variant="danger" size="sm" disabled={busy} onClick={() => setStatus("archived")}><Archive size={13} /> Archive</Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
