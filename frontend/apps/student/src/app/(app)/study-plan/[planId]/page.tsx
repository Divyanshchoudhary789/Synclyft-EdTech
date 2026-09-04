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
  ExternalLink, Sparkles, AlertCircle, Flag, TrendingUp, Trophy, ListChecks, CalendarRange,
} from "lucide-react";
import { readPlanProgress, togglePlanTopic } from "../progressStore";

const PRIORITY: Record<string, "coral" | "amber" | "neutral"> = { high: "coral", medium: "amber", low: "neutral" };
const OK = "#3DDC84";

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

/* ── Competency gauge — before → target on a half-ring ─────────────────────── */
function CompetencyArc({ before, target }: { before: number; target: number }) {
  const CIRC = Math.PI * 52;
  const bp = Math.max(0, Math.min(100, before)) / 100;
  const tp = Math.max(0, Math.min(100, target)) / 100;
  return (
    <div className="relative mx-auto w-[168px] h-[96px]">
      <svg viewBox="0 0 168 96" className="w-full h-full">
        <path d="M 16 88 A 60 60 0 0 1 152 88" fill="none" stroke="var(--th-border)" strokeWidth="10" strokeLinecap="round" />
        <path d="M 16 88 A 60 60 0 0 1 152 88" fill="none" stroke="var(--th-primary)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${tp * (CIRC * 60 / 52)} ${CIRC * 60 / 52}`} opacity={0.28} />
        <path d="M 16 88 A 60 60 0 0 1 152 88" fill="none" stroke="var(--th-primary)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${bp * (CIRC * 60 / 52)} ${CIRC * 60 / 52}`} className="transition-[stroke-dasharray] duration-700" />
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center leading-none">
        <span className="text-[1.75rem] font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>{Math.round(before)}</span>
        <span className="text-sm ml-1" style={{ color: "var(--th-text-faint)" }}>→ {Math.round(target)}</span>
        <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: "var(--th-text-faint)" }}>Readiness target</p>
      </div>
    </div>
  );
}

export default function StudyPlanTimelinePage() {
  const params = useParams<{ planId: string }>();
  const planId = params.planId;
  const qc = useQueryClient();
  const { data, isLoading, error } = useStudyPlan(planId);
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

  // "Current week" = first week that isn't fully done.
  const currentWeekIndex = useMemo(() => {
    const i = weekBuckets.findIndex(({ items }) => items.length > 0 && items.some(({ index }) => !done.includes(index)));
    return i === -1 ? weekBuckets.length - 1 : i;
  }, [weekBuckets, done]);

  useEffect(() => { if (expanded === 0 && currentWeekIndex > 0) setExpanded(currentWeekIndex); }, [currentWeekIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (i: number) => setDone(togglePlanTopic(planId, i));

  const setStatus = async (status: string) => {
    setBusy(true);
    try {
      await insightsService.setStudyPlanStatus(planId, status);
      toast.success(`Plan marked ${status}`);
      qc.invalidateQueries({ queryKey: ["insights", "study-plan", planId] });
      qc.invalidateQueries({ queryKey: ["insights", "study-plans"] });
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <SkeletonBlock height="h-6" width="w-40" />
        <SkeletonBlock height="h-40" width="w-full" />
        <SkeletonBlock height="h-72" width="w-full" />
      </div>
    );
  }
  if (error || !plan) {
    return (
      <div className="mx-auto max-w-lg">
        <Link href="/study-plan" className="mb-4 flex items-center gap-1 text-xs" style={{ color: "var(--th-text-faint)" }}><ArrowLeft size={12} /> All plans</Link>
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
    <div className="mx-auto max-w-5xl space-y-6 pb-28 lg:pb-6">
      <Link href="/study-plan" className="flex items-center gap-1 text-xs" style={{ color: "var(--th-text-faint)" }}>
        <ArrowLeft size={12} /> All plans
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ── Main column ── */}
        <div className="min-w-0 space-y-6">
          {/* Title + narrative */}
          <div>
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <Badge variant={plan.status === "completed" ? "verdant" : plan.status === "archived" ? "neutral" : "amber"}>{plan.status}</Badge>
              {plan.targetRole && <span className="text-xs" style={{ color: "var(--th-text-faint)" }}>{plan.targetRole}</span>}
            </div>
            <h1 className="text-[1.5rem] sm:text-[1.9rem] font-bold leading-tight tracking-tight"
              style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
              {plan.planTitle}
            </h1>
          </div>

          {plan.narrativeSummary && (
            <div className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--th-primary)" }}>
                <Sparkles size={12} /> Why this plan
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>{plan.narrativeSummary}</p>
              {(plan.keyImprovementAreas ?? []).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {plan.keyImprovementAreas!.map((a) => (
                    <span key={a} className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">{a}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {donePct >= 100 && plan.status !== "completed" && (
            <div className="flex items-center gap-3 rounded-xl border p-4" style={{ borderColor: OK, backgroundColor: "rgba(61,220,132,0.08)" }}>
              <Trophy size={18} className="shrink-0 text-emerald-500" />
              <p className="flex-1 text-sm" style={{ color: "var(--th-text-primary)" }}>Every topic ticked off. Lock it in.</p>
              <Button size="sm" disabled={busy} onClick={() => setStatus("completed")}>Mark complete</Button>
            </div>
          )}

          {/* ── Timeline ── */}
          <div>
            <h2 className="mb-4 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--th-text-faint)" }}>
              <CalendarRange size={13} /> Weekly timeline
            </h2>
            <div className="relative pl-12">
              <div className="absolute left-[19px] top-3 bottom-3 w-0.5 rounded-full" style={{ backgroundColor: "var(--th-border)" }} />

              {weekBuckets.map(({ milestone: m, items }, wi) => {
                const weekDone = items.length ? items.filter(({ index }) => done.includes(index)).length : 0;
                const complete = items.length > 0 && weekDone === items.length;
                const isCurrent = wi === currentWeekIndex && !complete;
                const isOpen = expanded === wi;
                return (
                  <div key={wi} className="relative pb-5 last:pb-0">
                    <div
                      className="absolute -left-12 top-0 grid h-10 w-10 place-items-center rounded-full border-2 text-[11px] font-bold transition-colors"
                      style={{
                        borderColor: complete ? OK : isCurrent ? "var(--th-primary)" : "var(--th-border-strong)",
                        backgroundColor: complete ? OK : isCurrent ? "var(--th-primary)" : "var(--th-card-bg)",
                        color: complete ? "#06240F" : isCurrent ? "#fff" : "var(--th-text-faint)",
                        boxShadow: isCurrent ? "0 0 0 4px color-mix(in srgb, var(--th-primary) 18%, transparent)" : "none",
                      }}
                    >
                      {complete ? <CheckCircle2 size={17} /> : `W${m.week}`}
                    </div>

                    <div className="overflow-hidden rounded-2xl border transition-colors"
                      style={{ borderColor: isCurrent ? "var(--th-primary)" : "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                      <button onClick={() => setExpanded(isOpen ? null : wi)} className="flex w-full items-start gap-3 p-4 text-left">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold" style={{ color: "var(--th-text-primary)" }}>{m.title}</p>
                            {isCurrent && <span className="rounded bg-[color:var(--th-primary)]/12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--th-primary)" }}>Now</span>}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 w-full max-w-[160px] overflow-hidden rounded-full" style={{ backgroundColor: "var(--th-bg-secondary)" }}>
                              <div className="h-full rounded-full transition-all" style={{ width: `${items.length ? (weekDone / items.length) * 100 : 0}%`, backgroundColor: complete ? OK : "var(--th-primary)" }} />
                            </div>
                            <span className="shrink-0 text-[10px]" style={{ color: "var(--th-text-faint)" }}>
                              {weekDone}/{items.length}{m.targetCompetency ? ` · aim ${m.targetCompetency}` : ""}
                            </span>
                          </div>
                        </div>
                        <ChevronDown size={15} className={`mt-0.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} style={{ color: "var(--th-text-faint)" }} />
                      </button>

                      {isOpen && (
                        <div className="divide-y border-t" style={{ borderColor: "var(--th-border)" }}>
                          {items.length === 0 && (
                            <p className="p-4 text-xs" style={{ color: "var(--th-text-faint)" }}>Consolidate and review the earlier weeks&apos; topics.</p>
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
                <div className="relative">
                  <div className="absolute -left-12 top-0 grid h-10 w-10 place-items-center rounded-full border-2"
                    style={{ borderColor: "var(--th-border-strong)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-faint)" }}>
                    <Target size={16} />
                  </div>
                  <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                    <div className="border-b p-4" style={{ borderColor: "var(--th-border)" }}>
                      <p className="text-sm font-semibold" style={{ color: "var(--th-text-primary)" }}>Ongoing focus areas</p>
                      <p className="mt-0.5 text-[10px]" style={{ color: "var(--th-text-faint)" }}>Work these in alongside the weekly plan</p>
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
        </div>

        {/* ── Sidebar (desktop) / hero card (mobile) ── */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-4 rounded-2xl border p-5" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
            <CompetencyArc before={before} target={targetComp} />

            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: ListChecks, label: "Topics done", value: `${done.length}/${totalTopics}` },
                { icon: Flag, label: "Weeks", value: milestones.length },
                { icon: Clock, label: "Hours left", value: `~${Math.round(hoursLeft)}` },
                { icon: TrendingUp, label: "Progress", value: `${donePct}%` },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-2.5 text-center" style={{ backgroundColor: "var(--th-bg-secondary)" }}>
                  <s.icon size={13} className="mx-auto mb-1" style={{ color: "var(--th-text-faint)" }} />
                  <p className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>{s.value}</p>
                  <p className="text-[9px] uppercase tracking-wide" style={{ color: "var(--th-text-faint)" }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px]" style={{ color: "var(--th-text-faint)" }}>
                <span>Overall progress</span><span>{donePct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: "var(--th-bg-secondary)" }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${donePct}%`, backgroundColor: donePct >= 100 ? OK : "var(--th-primary)" }} />
              </div>
            </div>

            {/* status actions — desktop */}
            <div className="hidden flex-col gap-2 lg:flex">
              {plan.status !== "active" && plan.status !== "completed" && (
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => setStatus("active")}><PlayCircle size={13} /> Resume plan</Button>
              )}
              {plan.status === "active" && (
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => setStatus("paused")}><PauseCircle size={13} /> Pause plan</Button>
              )}
              {plan.status !== "completed" && (
                <Button size="sm" disabled={busy} onClick={() => setStatus("completed")}><CheckCircle2 size={13} /> Mark complete</Button>
              )}
              {plan.status !== "archived" && (
                <Button variant="danger" size="sm" disabled={busy} onClick={() => setStatus("archived")}><Archive size={13} /> Archive</Button>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* ── Sticky action bar (mobile only) ── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t px-4 py-3 backdrop-blur lg:hidden"
        style={{ borderColor: "var(--th-border)", backgroundColor: "color-mix(in srgb, var(--th-card-bg) 92%, transparent)" }}>
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          <span className="text-xs" style={{ color: "var(--th-text-muted)" }}>{done.length}/{totalTopics} · {donePct}%</span>
          <div className="ml-auto flex gap-2">
            {plan.status === "active" && (
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => setStatus("paused")}><PauseCircle size={13} /> Pause</Button>
            )}
            {plan.status !== "active" && plan.status !== "completed" && (
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => setStatus("active")}><PlayCircle size={13} /> Resume</Button>
            )}
            {plan.status !== "completed" && (
              <Button size="sm" disabled={busy} onClick={() => setStatus("completed")}><CheckCircle2 size={13} /> Complete</Button>
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
    <div className="p-4 transition-colors" style={checked ? { backgroundColor: "color-mix(in srgb, #3DDC84 5%, transparent)" } : undefined}>
      <div className="flex items-start gap-3">
        <button onClick={onToggle} className="mt-0.5 shrink-0 transition-transform active:scale-90" aria-label={checked ? "Mark not done" : "Mark done"}>
          {checked
            ? <CheckCircle2 size={19} className="text-emerald-500" />
            : <Circle size={19} style={{ color: "var(--th-text-faint)" }} />}
        </button>
        <div className="min-w-0 flex-1">
          <button onClick={() => hasDetail && setOpen(!open)} className="w-full text-left">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-sm font-medium ${checked ? "line-through opacity-55" : ""}`} style={{ color: "var(--th-text-primary)" }}>
                {t.topicName}
              </span>
              <span className="flex shrink-0 items-center gap-2 text-[11px]" style={{ color: "var(--th-text-faint)" }}>
                {t.estimatedHours ? `~${t.estimatedHours}h` : ""}
                {t.priority && <Badge variant={PRIORITY[t.priority] ?? "neutral"}>{t.priority}</Badge>}
                {hasDetail && <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />}
              </span>
            </div>
          </button>
          {open && (
            <div className="mt-2.5 space-y-2">
              {(t.subtopics ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {t.subtopics!.map((s) => (
                    <span key={s} className="rounded-md px-2 py-0.5 text-[10px]" style={{ backgroundColor: "var(--th-bg-secondary)", color: "var(--th-text-muted)" }}>{s}</span>
                  ))}
                </div>
              )}
              {(t.resources ?? []).length > 0 && (
                <div className="flex flex-col gap-1">
                  {t.resources!.map((r, j) => r.url ? (
                    <a key={j} href={r.url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline dark:text-blue-400">
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
