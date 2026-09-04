"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStudentCampaigns } from "@synclyft/lib/api/hooks";
import { Badge } from "@synclyft/ui/components/Badge";
import { Button } from "@synclyft/ui/components/Button";
import { SkeletonCard } from "@synclyft/ui/components/SkeletonBlock";
import { Modal } from "@synclyft/ui/components/Modal";
import {
  Megaphone, Calendar, Clock, Building2, Brain, Code2, Cpu, Mic2, ChevronRight, AlertCircle, GraduationCap,
} from "lucide-react";

interface Campaign {
  _id: string;
  title: string;
  description?: string;
  deadline?: string;
  createdAt?: string;
  config?: { hasAptitude?: boolean; hasCoding?: boolean; hasTechnical?: boolean; hasHr?: boolean; hasBehavioral?: boolean; companyTemplate?: string };
  companyTemplateDetails?: { companyName?: string; role?: string; eligibility?: string; instructions?: string; evaluationCriteria?: string; testDuration?: number };
  assessmentTypes?: { type: string; roundName?: string; durationMinutes?: number; totalQuestions?: number; passingScore?: number; instructions?: string }[];
  targetDepartment?: string[];
  targetBatch?: number[];
}

const ROUND_META: Record<string, { label: string; icon: typeof Brain }> = {
  aptitude: { label: "Aptitude", icon: Brain },
  coding: { label: "Coding", icon: Code2 },
  technical: { label: "Technical", icon: Cpu },
  hr: { label: "HR", icon: Mic2 },
  behavioral: { label: "Behavioral", icon: Mic2 },
};

function roundsFromConfig(c?: Campaign["config"]): string[] {
  if (!c) return [];
  const out: string[] = [];
  if (c.hasAptitude) out.push("aptitude");
  if (c.hasCoding) out.push("coding");
  if (c.hasTechnical) out.push("technical");
  if (c.hasHr) out.push("hr");
  if (c.hasBehavioral) out.push("behavioral");
  return out;
}

function daysLeft(deadline?: string): { text: string; urgent: boolean } | null {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  const d = Math.ceil(ms / 86_400_000);
  if (d < 0) return { text: "Closed", urgent: true };
  if (d === 0) return { text: "Due today", urgent: true };
  if (d === 1) return { text: "1 day left", urgent: true };
  return { text: `${d} days left`, urgent: d <= 3 };
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={null}>
      <CampaignsView />
    </Suspense>
  );
}

function CampaignsView() {
  const { data, isLoading, isError, refetch } = useStudentCampaigns();
  const [active, setActive] = useState<Campaign | null>(null);
  const searchParams = useSearchParams();

  const campaigns = ((data?.campaigns ?? []) as unknown as Campaign[]);
  const batch = (data?.batch ?? null) as { name?: string; department?: string; graduationYear?: number } | null;

  // Deep link from a notification: /campaigns?c=<id> opens that campaign.
  const focusId = searchParams.get("c");
  useEffect(() => {
    if (!focusId || active) return;
    const match = campaigns.find((c) => c._id === focusId);
    if (match) setActive(match);
  }, [focusId, campaigns, active]);

  return (
    <div className="space-y-7">
      <div>
        <p className="label-caption mb-1" style={{ color: "var(--th-text-faint)" }}>Placement</p>
        <h1 className="text-[1.65rem] sm:text-[2rem] font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>Campaigns</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--th-text-faint)" }}>
          Placement drives assigned to you {batch?.name ? <>· batch <strong style={{ color: "var(--th-text-secondary)" }}>{batch.name}</strong></> : null}
        </p>
      </div>

      {isError && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
          <span className="flex items-start gap-2"><GraduationCap size={16} className="text-amber-500 shrink-0 mt-0.5" />
            You&apos;re not part of an active placement batch yet — your college adds you when a drive starts.</span>
          <button onClick={() => refetch()} className="sm:ml-auto self-start text-blue-600 dark:text-blue-400 text-xs shrink-0">Retry</button>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2"><SkeletonCard className="h-44" /><SkeletonCard className="h-44" /></div>
      ) : !isError && campaigns.length === 0 ? (
        <div className="rounded-2xl border p-8 sm:p-12 text-center" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
          <Megaphone size={28} className="mx-auto mb-3" style={{ color: "var(--th-text-faint)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--th-text-primary)" }}>No active campaigns</p>
          <p className="text-xs mt-1" style={{ color: "var(--th-text-faint)" }}>When your placement cell schedules a drive for your batch, it shows up here with the rounds and deadline.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((c) => {
            const rounds = roundsFromConfig(c.config);
            const dl = daysLeft(c.deadline);
            return (
              <button key={c._id} onClick={() => setActive(c)}
                className="rounded-2xl border p-5 text-left transition-colors hover:border-[color:var(--th-primary)]"
                style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "var(--th-text-primary)" }}>{c.title}</p>
                    {(c.companyTemplateDetails?.companyName || c.config?.companyTemplate) && (
                      <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: "var(--th-text-muted)" }}>
                        <Building2 size={11} /> {c.companyTemplateDetails?.companyName || c.config?.companyTemplate}
                        {c.companyTemplateDetails?.role ? ` · ${c.companyTemplateDetails.role}` : ""}
                      </p>
                    )}
                  </div>
                  {dl && <Badge variant={dl.urgent ? "coral" : "neutral"}>{dl.text}</Badge>}
                </div>

                {c.description && (
                  <p className="text-xs mt-2 line-clamp-2" style={{ color: "var(--th-text-muted)" }}>{c.description}</p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {rounds.map((r) => {
                    const M = ROUND_META[r];
                    if (!M) return null;
                    const Icon = M.icon;
                    return (
                      <span key={r} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                        style={{ backgroundColor: "var(--th-bg-secondary)", color: "var(--th-text-secondary)" }}>
                        <Icon size={10} /> {M.label}
                      </span>
                    );
                  })}
                </div>

                {c.deadline && (
                  <p className="mt-3 text-[11px] flex items-center gap-1" style={{ color: "var(--th-text-faint)" }}>
                    <Calendar size={11} /> Closes {new Date(c.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      <CampaignDetail campaign={active} onClose={() => setActive(null)} />
    </div>
  );
}

function CampaignDetail({ campaign: c, onClose }: { campaign: Campaign | null; onClose: () => void }) {
  const rounds = roundsFromConfig(c?.config);
  const dl = daysLeft(c?.deadline);
  const ctd = c?.companyTemplateDetails;

  return (
    <Modal
      open={!!c}
      onClose={onClose}
      size="lg"
      icon={<div className="grid h-8 w-8 place-items-center rounded-lg" style={{ backgroundColor: "color-mix(in srgb, var(--th-primary) 12%, transparent)" }}><Megaphone size={15} style={{ color: "var(--th-primary)" }} /></div>}
      title={c?.title ?? ""}
      subtitle={ctd?.companyName || c?.config?.companyTemplate || (c?.deadline ? `Closes ${new Date(c.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "Placement drive")}
      footer={
        <>
          <Link href="/study-plan" onClick={onClose}>
            <Button variant="secondary" iconRight={<ChevronRight size={13} />}>Build a study plan</Button>
          </Link>
          <Link href="/interview/setup" onClick={onClose}>
            <Button icon={<Clock size={13} />}>Practice these rounds</Button>
          </Link>
        </>
      }
    >
      {c && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            {dl && <Badge variant={dl.urgent ? "coral" : "neutral"}>{dl.text}</Badge>}
            {c.deadline && (
              <span className="text-xs flex items-center gap-1" style={{ color: "var(--th-text-muted)" }}>
                <Calendar size={12} /> {new Date(c.deadline).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>

          {(ctd?.companyName || ctd?.role) && (
            <div className="rounded-xl border p-4 space-y-1" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
              {ctd?.companyName && <p className="text-sm font-semibold" style={{ color: "var(--th-text-primary)" }}>{ctd.companyName}</p>}
              {ctd?.role && <p className="text-xs" style={{ color: "var(--th-text-secondary)" }}>{ctd.role}</p>}
              {ctd?.eligibility && <p className="text-[11px] pt-1" style={{ color: "var(--th-text-muted)" }}><strong>Eligibility:</strong> {ctd.eligibility}</p>}
              {ctd?.testDuration ? <p className="text-[11px]" style={{ color: "var(--th-text-muted)" }}><strong>Duration:</strong> {ctd.testDuration} min</p> : null}
            </div>
          )}

          {c.description && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--th-text-faint)" }}>About</h3>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--th-text-secondary)" }}>{c.description}</p>
            </div>
          )}

          {(c.assessmentTypes ?? []).length > 0 ? (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--th-text-faint)" }}>Rounds</h3>
              <div className="space-y-2">
                {c.assessmentTypes!.map((a, i) => {
                  const M = ROUND_META[a.type];
                  const Icon = M?.icon ?? Brain;
                  return (
                    <div key={i} className="rounded-xl border p-4" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--th-text-primary)" }}>
                          <Icon size={13} /> {a.roundName || M?.label || a.type}
                        </p>
                        <span className="text-[11px]" style={{ color: "var(--th-text-faint)" }}>
                          {a.durationMinutes ? `${a.durationMinutes}m` : ""} {a.totalQuestions ? `· ${a.totalQuestions}q` : ""}
                        </span>
                      </div>
                      {a.passingScore ? <p className="text-[11px] mt-1" style={{ color: "var(--th-text-muted)" }}>Passing score: {a.passingScore}%</p> : null}
                      {a.instructions && <p className="text-[11px] mt-1" style={{ color: "var(--th-text-muted)" }}>{a.instructions}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : rounds.length > 0 ? (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--th-text-faint)" }}>Rounds</h3>
              <div className="flex flex-wrap gap-2">
                {rounds.map((r) => {
                  const M = ROUND_META[r];
                  if (!M) return null;
                  const Icon = M.icon;
                  return (
                    <span key={r} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ backgroundColor: "var(--th-bg-secondary)", color: "var(--th-text-secondary)" }}>
                      <Icon size={12} /> {M.label}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}

          {ctd?.instructions && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--th-text-faint)" }}>Instructions</h3>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--th-text-secondary)" }}>{ctd.instructions}</p>
            </div>
          )}

          {ctd?.evaluationCriteria && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--th-text-faint)" }}>Evaluation criteria</h3>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--th-text-secondary)" }}>{ctd.evaluationCriteria}</p>
            </div>
          )}

          <div className="rounded-xl border p-4 flex items-start gap-2" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
            <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: "var(--th-primary)" }} />
            <p className="text-[11px]" style={{ color: "var(--th-text-muted)" }}>
              Your college runs the official assessment for this campaign. Use a self-serve mock now to prepare for the same round mix.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
