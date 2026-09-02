"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { insightsService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { useStudyPlan } from "@synclyft/lib/api/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@synclyft/ui/components/Button";
import { Badge } from "@synclyft/ui/components/Badge";
import { SkeletonBlock } from "@synclyft/ui/components/SkeletonBlock";
import toast from "react-hot-toast";
import {
  ArrowLeft, Clock, Target, CheckCircle2, Circle, PlayCircle, PauseCircle, Archive, ChevronDown,
  ExternalLink, Sparkles, AlertCircle, Flag, TrendingUp, PartyPopper,
} from "lucide-react";
import { readPlanProgress, togglePlanTopic } from "../progressStore";

const PRIORITY: Record<string, "coral" | "amber" | "neutral"> = { high: "coral", medium: "amber", low: "neutral" };

interface Topic {
  topicName: string;
  subtopics?: string[];
  estimatedHours?: number;
  priority?: string;
  competencyBefore?: number;
  resources?: { title?: string; url?: string }[];
}
interface MilestoneT { week: number; title: string; topics?: string[]; targetCompetency?: number }
interface Plan {
  planTitle?: string;
  targetRole?: string;
  status?: string;
  narrativeSummary?: string;
  keyImprovementAreas?: string[];
  estimatedTotalHours?: number;
  overallCompetencyBefore?: number;
  topics?: Topic[];
  milestones?: MilestoneT[];
  generatedAt?: string;
}

const norm = (s: string) => s.trim().toLowerCase();

// ── Competency arc ──────────────────────────────────────────────────────────
function CompetencyArc({ before, target }: { before: number; target: number }) {
  const R = 52;
  const CIRC = Math.PI * R; // half circle
  const beforePct = Math.max(0, Math.min(100, before)) / 100;
  const targetPct = Math.max(0, Math.min(100, target)) / 100;
  return (
    <div className="relative w-[140px] h-[80px] shrink-0">
      <svg viewBox="0 0 140 80" className="w-full h-full">
        <path d="M 14 74 A 52 52 0 0 1 126 74" fill="none" stroke="var(--th-border)" strokeWidth="9" strokeLinecap="round" />
        <path d="M 14 74 A 52 52 0 0 1 126 74" fill="none" stroke="var(--th-primary)" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${targetPct * CIRC} ${CIRC}`} opacity={0.35} />
        <path d="M 14 74 A 52 52 0 0 1 126 74" fill="none" stroke="var(--th-primary)" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${beforePct * CIRC} ${CIRC}`} />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <span className="text-2xl font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>{Math.round(before)}</span>
        <span className="text-xs" style={{ color: "var(--th-text-faint)" }}> → {Math.round(target)}</span>
      </div>
    </div>
  );
}

export default function StudyPlanTimelinePage() {
  const params = useParams<{ planId: string }>();
  const planId = params.planId;
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useStudyPlan(planId);
  const plan = data as Plan | undefined;

  const [done, setDone] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(0);

  useEffect(() => { setDone(readPlanProgress(planId)); }, [planId]);

  const topics = plan?.topics ?? [];
  const milestones = useMemo(
    () => [...(plan?.milestones ?? [])].sort((a, b) => (a.week || 0) - (b.week || 0)),
    [plan]
  );

  // Map every topic to a week (or "general"). A topic is claimed by the first
  // milestone whose `topics` names it.
  const { weekBuckets, generalTopics } = useMemo(() => {
    const claimed = new Set<number>();
    const buckets = milestones.map((m) => {
      const names = new Set((m.topics ?? []).map(norm));
      const items: { topic: Topic; index: number }[] = [];
      topics.forEach((t, i) => {
        if (!claimed.has(i) && names.has(norm(t.topicName))) {
          claimed.add(i);
          items.push({ topic: t, index: i });
        }
      });
      return { milestone: m, items };
    });
    const general = topics.map((t, i) => ({ topic: t, index: i })).filter(({ index }) => !claimed.has(index));
    return { weekBuckets: buckets, generalTopics: general };
  }, [milestones, topics]);

  const totalTopics = topics.length;
  const donePct = totalTopics ? Math.round((done.length / totalTopics) * 100) : 0;
  const hoursLeft = topics.reduce((acc, t, i) => acc + (done.includes(i) ? 0 : (t.estimatedHours || 0)), 0);

  const toggle = (i: number) => setDone(togglePlanTopic(planId, i));

  const setStatus = async (status: string) => {
    setBusy(true);
    try {
      await insightsService.setStudyPlanStatus(planId, status);
      toast.success(`Marked ${status}`);
      qc.invalidateQueries({ queryKey: ["insights", "study-plan", planId] });
      qc.invalidateQueries({ queryKey: ["insights", "study-plans"] });
      refetch();
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <SkeletonBlock height="h-6" width="w-40" />
        <SkeletonBlock height="h-32" width="w-full" />
        <SkeletonBlock height="h-64" width="w-full" />
      </div>
    );
  }
  if (error || !plan) {
    return (
      <div className="max-w-lg">
        <Link href="/study-plan" className="text-xs flex items-center gap-1 mb-4" style={{ color: "var(--th-text-faint)" }}><ArrowLeft size={12} /> All plans</Link>
        <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
          <AlertCircle size={22} className="mx-auto mb-2 text-amber-500" />
          <p className="text-sm" style={{ color: "var(--th-text-primary)" }}>{error ? toApiError(error).message : "Plan not found."}</p>
        </div>
      </div>
    );
  }

  const before = plan.overallCompetencyBefore ?? topics.reduce((a, t) => a + (t.competencyBefore || 0), 0) / (topics.length || 1);
  const targetComp = milestones.length ? (milestones[milestones.length - 1].targetCompetency ?? 85) : 85;

  return (
    <div className="max-w-3xl space-y-6 sm:space-y-7 pb-6">
      <Link href="/study-plan" className="text-xs flex items-center gap-1" style={{ color: "var(--th-text-faint)" }}>
        <ArrowLeft size={12} /> All plans
      </Link>

      {/* ── Hero ── */}
      <div className="rounded-2xl border p-6" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <CompetencyArc before={before} target={targetComp} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge variant={plan.status === "completed" ? "verdant" : "neutral"}>{plan.status}</Badge>
              {plan.targetRole && <span className="text-[11px]" style={{ color: "var(--th-text-faint)" }}>{plan.targetRole}</span>}
            </div>
            <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
              {plan.planTitle}
            </h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: "var(--th-text-muted)" }}>
              <span className="flex items-center gap-1"><Target size={11} /> {done.length}/{totalTopics} topics done</span>
              <span className="flex items-center gap-1"><Flag size={11} /> {milestones.length} weeks</span>
              <span className="flex items-center gap-1"><Clock size={11} /> ~{Math.round(hoursLeft)}h left</span>
              <span className="flex items-center gap-1"><TrendingUp size={11} /> readiness {Math.round(before)} → {Math.round(targetComp)}</span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-[11px] mb-1.5" style={{ color: "var(--th-text-faint)" }}>
            <span>Progress</span><span>{donePct}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--th-bg-secondary)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${donePct}%`, backgroundColor: donePct >= 100 ? "#3DDC84" : "var(--th-primary)" }} />
          </div>
        </div>
      </div>

      {donePct >= 100 && plan.status !== "completed" && (
        <div className="rounded-xl border p-4 flex items-center gap-3" style={{ borderColor: "#3DDC84", backgroundColor: "rgba(61,220,132,0.08)" }}>
          <PartyPopper size={18} className="text-emerald-500 shrink-0" />
          <p className="text-sm flex-1" style={{ color: "var(--th-text-primary)" }}>Every topic ticked off. Nice work.</p>
          <Button size="sm" disabled={busy} onClick={() => setStatus("completed")}>Mark plan complete</Button>
        </div>
      )}

      {plan.narrativeSummary && (
        <div className="rounded-2xl border-l-2 p-4" style={{ borderColor: "var(--th-primary)", backgroundColor: "var(--th-card-bg)" }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: "var(--th-primary)" }}>
            <Sparkles size={12} /> Why this plan
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>{plan.narrativeSummary}</p>
        </div>
      )}

      {(plan.keyImprovementAreas ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {plan.keyImprovementAreas!.map((a) => (
            <span key={a} className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">{a}</span>
          ))}
        </div>
      )}

      {/* ── Timeline ── */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--th-text-faint)" }}>Your weekly timeline</h2>
        <div className="relative pl-11">
          {/* spine */}
          <div className="absolute left-[18px] top-2 bottom-2 w-0.5" style={{ backgroundColor: "var(--th-border)" }} />

          {weekBuckets.map(({ milestone: m, items }, wi) => {
            const weekDone = items.length ? items.filter(({ index }) => done.includes(index)).length : 0;
            const complete = items.length > 0 && weekDone === items.length;
            const isOpen = expanded === wi;
            return (
              <div key={wi} className="relative pb-6 last:pb-0">
                {/* node */}
                <div className="absolute -left-11 top-0 w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold border-2"
                  style={{
                    borderColor: complete ? "#3DDC84" : "var(--th-primary)",
                    backgroundColor: complete ? "#3DDC84" : "var(--th-bg)",
                    color: complete ? "#0B0D10" : "var(--th-primary)",
                  }}>
                  {complete ? <CheckCircle2 size={16} /> : `W${m.week}`}
                </div>

                <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                  <button onClick={() => setExpanded(isOpen ? null : wi)} className="w-full text-left p-4 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold" style={{ color: "var(--th-text-primary)" }}>{m.title}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 max-w-[140px] rounded-full overflow-hidden" style={{ backgroundColor: "var(--th-bg-secondary)" }}>
                          <div className="h-full rounded-full" style={{ width: `${items.length ? (weekDone / items.length) * 100 : 0}%`, backgroundColor: complete ? "#3DDC84" : "var(--th-primary)" }} />
                        </div>
                        <span className="text-[10px]" style={{ color: "var(--th-text-faint)" }}>
                          {weekDone}/{items.length} · target {m.targetCompetency ?? "—"}
                        </span>
                      </div>
                    </div>
                    <ChevronDown size={15} className={`shrink-0 mt-0.5 transition-transform ${isOpen ? "rotate-180" : ""}`} style={{ color: "var(--th-text-faint)" }} />
                  </button>

                  {isOpen && (
                    <div className="border-t divide-y" style={{ borderColor: "var(--th-border)" }}>
                      {items.length === 0 && (
                        <p className="p-4 text-xs" style={{ color: "var(--th-text-faint)" }}>Review and consolidate the previous weeks&apos; topics.</p>
                      )}
                      {items.map(({ topic: t, index }) => (
                        <TopicRow key={index} topic={t} checked={done.includes(index)} onToggle={() => toggle(index)} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {generalTopics.length > 0 && (
            <div className="relative pb-0">
              <div className="absolute -left-11 top-0 w-9 h-9 rounded-full flex items-center justify-center border-2"
                style={{ borderColor: "var(--th-border-strong)", backgroundColor: "var(--th-bg)", color: "var(--th-text-faint)" }}>
                <Target size={15} />
              </div>
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                <div className="p-4 border-b" style={{ borderColor: "var(--th-border)" }}>
                  <p className="text-sm font-semibold" style={{ color: "var(--th-text-primary)" }}>Ongoing focus areas</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--th-text-faint)" }}>Work these in alongside the weekly plan</p>
                </div>
                <div className="divide-y" style={{ borderColor: "var(--th-border)" }}>
                  {generalTopics.map(({ topic: t, index }) => (
                    <TopicRow key={index} topic={t} checked={done.includes(index)} onToggle={() => toggle(index)} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky actions ── */}
      <div className="sticky bottom-3 z-30 rounded-2xl border shadow-lg backdrop-blur"
        style={{ borderColor: "var(--th-border)", backgroundColor: "color-mix(in srgb, var(--th-card-bg) 92%, transparent)" }}>
        <div className="px-3 sm:px-5 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-xs" style={{ color: "var(--th-text-muted)" }}>{done.length}/{totalTopics} topics · {donePct}%</span>
          <div className="flex flex-wrap gap-2 ml-auto">
            {plan.status !== "active" && plan.status !== "completed" && (
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => setStatus("active")}><PlayCircle size={13} /> Resume</Button>
            )}
            {plan.status === "active" && (
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => setStatus("paused")}><PauseCircle size={13} /> Pause</Button>
            )}
            {plan.status !== "completed" && (
              <Button size="sm" disabled={busy} onClick={() => setStatus("completed")}><CheckCircle2 size={13} /> Complete</Button>
            )}
            {plan.status !== "archived" && (
              <Button variant="danger" size="sm" disabled={busy} onClick={() => setStatus("archived")}><Archive size={13} /> Archive</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TopicRow({ topic: t, checked, onToggle }: { topic: Topic; checked: boolean; onToggle: () => void }) {
  const [open, setOpen] = useState(false);
  const hasDetail = (t.subtopics ?? []).length > 0 || (t.resources ?? []).length > 0;
  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <button onClick={onToggle} className="mt-0.5 shrink-0" aria-label={checked ? "Mark not done" : "Mark done"}>
          {checked
            ? <CheckCircle2 size={18} className="text-emerald-500" />
            : <Circle size={18} style={{ color: "var(--th-text-faint)" }} />}
        </button>
        <div className="min-w-0 flex-1">
          <button onClick={() => hasDetail && setOpen(!open)} className="text-left w-full">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-sm font-medium ${checked ? "line-through opacity-60" : ""}`} style={{ color: "var(--th-text-primary)" }}>
                {t.topicName}
              </span>
              <span className="flex items-center gap-2 shrink-0 text-[11px]" style={{ color: "var(--th-text-faint)" }}>
                {t.estimatedHours ? `~${t.estimatedHours}h` : ""}
                {t.priority && <Badge variant={PRIORITY[t.priority] ?? "neutral"}>{t.priority}</Badge>}
                {hasDetail && <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />}
              </span>
            </div>
          </button>
          {open && (
            <div className="mt-2 space-y-2">
              {(t.subtopics ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {t.subtopics!.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded-md text-[10px]" style={{ backgroundColor: "var(--th-bg-secondary)", color: "var(--th-text-muted)" }}>{s}</span>
                  ))}
                </div>
              )}
              {(t.resources ?? []).length > 0 && (
                <div className="flex flex-col gap-1">
                  {t.resources!.map((r, j) => r.url ? (
                    <a key={j} href={r.url} target="_blank" rel="noreferrer"
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                      {r.title || "Resource"} <ExternalLink size={9} />
                    </a>
                  ) : (
                    <span key={j} className="text-[11px]" style={{ color: "var(--th-text-faint)" }}>{r.title}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
