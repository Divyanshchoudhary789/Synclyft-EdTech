"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis,
} from "recharts";
import { CountUp } from "@synclyft/ui/components/CountUp";
import { Badge } from "@synclyft/ui/components/Badge";
import { Button } from "@synclyft/ui/components/Button";
import { SkeletonCard } from "@synclyft/ui/components/SkeletonBlock";
import { getGradeColor, getGradeBand } from "@synclyft/lib/utils";
import { interviewService, analyticsService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, BookOpen, ShieldAlert } from "lucide-react";

interface RoundAnalytic {
  roundType: string;
  totalScore?: number;
  timeSpentSeconds?: number;
  questionsAttempted?: number;
}
interface InsightsData {
  analytics: {
    overallScore: number;
    finalGrade: string;
    proctoringRiskScore: number;
    isDisqualified: boolean;
    skillScores?: Record<string, number>;
    roundAnalytics?: RoundAnalytic[];
  };
  session: { targetRole: string; status: string };
}
interface ReportCard {
  narrativeSummary?: string;
  strengths?: string[];
  weaknesses?: string[];
  skillGapsVsJd?: string[];
  actionableStudyPlan?: (string | { title?: string; description?: string; topic?: string; focusArea?: string; recommendedAction?: string; priority?: string })[];
  overallGrade?: string;
}

const ROUND_LABEL: Record<string, string> = { aptitude: "Aptitude", coding: "Coding", technical: "Technical", hr: "HR" };

function InterviewReportInner() {
  const params = useSearchParams();
  const urlSession = params.get("session");
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [report, setReport] = useState<ReportCard | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const load = useCallback(async () => {
    setPhase("loading");
    // A ?session= id means "show me this past report" — don't finalise or clear.
    let sessionId = urlSession ?? "";
    if (!sessionId) {
      try {
        sessionId = sessionStorage.getItem("interview:completedSessionId") ?? sessionStorage.getItem("interview:sessionId") ?? "";
      } catch { /* ignore */ }
    }

    if (!sessionId) {
      setErrorMsg("No recent interview session found.");
      setPhase("error");
      return;
    }

    try {
      if (!urlSession) {
        // Fresh completion: finalize (idempotent) then fetch analytics.
        const fin = await interviewService.terminate(sessionId).catch(() => null);
        if (fin?.summary) setReport(fin.summary as ReportCard);
        try { sessionStorage.removeItem("interview:sessionId"); sessionStorage.removeItem("interview:rounds"); } catch { /* ignore */ }
      }

      const data = (await analyticsService.sessionInsights(sessionId)) as InsightsData;
      setInsights(data);
      setPhase("ready");
    } catch (err) {
      setErrorMsg(toApiError(err).message);
      setPhase("error");
    }
  }, [urlSession]);

  useEffect(() => { load(); }, [load]);

  const a = insights?.analytics;
  const score = Math.round(a?.overallScore ?? 0);
  const grade = a?.finalGrade || report?.overallGrade || "—";
  const band = getGradeBand(score);
  const color = getGradeColor(band);

  const radar = a?.skillScores
    ? Object.entries(a.skillScores).map(([k, v]) => ({ subject: k, score: Math.round(Number(v)), fullMark: 100 }))
    : (a?.roundAnalytics ?? []).map((r) => ({ subject: ROUND_LABEL[r.roundType] ?? r.roundType, score: Math.round(r.totalScore ?? 0), fullMark: 100 }));

  return (
    <div style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="label-caption mb-1" style={{ color: "var(--th-text-faint)" }}>Interview report</p>
            <h1 className="text-[1.65rem] sm:text-[2rem] font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
              {insights?.session?.targetRole || "Your results"}
            </h1>
          </div>
          <Link href="/dashboard"><Button variant="secondary" iconRight={<ArrowRight size={14} />}>Back to dashboard</Button></Link>
        </div>

        {phase === "loading" && (
          <div className="grid gap-6 md:grid-cols-3">
            <SkeletonCard className="h-64" /><SkeletonCard className="h-64" /><SkeletonCard className="h-64" />
          </div>
        )}

        {phase === "error" && (
          <div className="rounded-2xl border p-10 text-center" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
            <AlertTriangle size={26} className="mx-auto mb-2 text-amber-500" />
            <p className="text-sm" style={{ color: "var(--th-text-primary)" }}>Report not ready yet</p>
            <p className="text-xs mt-1 mb-4" style={{ color: "var(--th-text-faint)" }}>{errorMsg}</p>
            <div className="flex justify-center gap-2">
              <Button variant="secondary" onClick={load}>Retry</Button>
              <Link href="/dashboard"><Button>Dashboard</Button></Link>
            </div>
          </div>
        )}

        {phase === "ready" && (
          <>
            {a?.isDisqualified && (
              <div className="rounded-xl border p-4 flex items-center gap-3 text-sm border-rose-500/30 bg-rose-500/5 text-rose-600 dark:text-rose-400">
                <ShieldAlert size={16} /> This session was flagged as disqualified due to proctoring violations.
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-3">
              {/* Score */}
              <div className="rounded-2xl border p-6 flex flex-col items-center justify-center text-center gap-2" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                <div className="text-5xl font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color }}>
                  <CountUp end={score} />
                </div>
                <p className="text-[10px] font-bold tracking-wider" style={{ color: "var(--th-text-faint)" }}>COMPOSITE / 100</p>
                <Badge variant={band === "high" ? "verdant" : band === "mid" ? "amber" : "coral"}>Grade {grade}</Badge>
                {typeof a?.proctoringRiskScore === "number" && a.proctoringRiskScore > 0 && (
                  <span className="text-[10px] font-semibold flex items-center gap-1" style={{ color: a.proctoringRiskScore >= 60 ? "#FF5C5C" : a.proctoringRiskScore >= 25 ? "#F59E0B" : "var(--th-text-faint)" }}>
                    <ShieldAlert size={10} /> Integrity risk {Math.round(a.proctoringRiskScore)}
                  </span>
                )}
              </div>

              {/* Radar */}
              <div className="md:col-span-2 rounded-2xl border p-6" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                <h3 className="text-sm font-bold mb-2" style={{ color: "var(--th-text-primary)" }}>Round breakdown</h3>
                {radar.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radar}>
                      <PolarGrid stroke="var(--th-border)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "var(--th-text-muted)" }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar dataKey="score" stroke={color} fill={color} fillOpacity={0.25} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs py-10 text-center" style={{ color: "var(--th-text-faint)" }}>No round data recorded.</p>
                )}
              </div>
            </div>

            {a?.roundAnalytics && a.roundAnalytics.length > 0 && (
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                <div className="hidden sm:grid grid-cols-4 px-6 py-3 text-[10px] font-bold uppercase tracking-wider border-b" style={{ borderColor: "var(--th-border)", color: "var(--th-text-faint)" }}>
                  <span>Round</span><span>Score</span><span>Questions</span><span>Time</span>
                </div>
                {a.roundAnalytics.map((r) => (
                  <div key={r.roundType} className="px-4 sm:px-6 py-3 text-sm border-b last:border-0 flex items-center justify-between gap-3 sm:grid sm:grid-cols-4" style={{ borderColor: "var(--th-border)", color: "var(--th-text-secondary)" }}>
                    <span className="font-medium" style={{ color: "var(--th-text-primary)" }}>{ROUND_LABEL[r.roundType] ?? r.roundType}</span>
                    <span className="font-mono flex gap-3 sm:contents">
                      <span title="Score">{Math.round(r.totalScore ?? 0)}</span>
                      <span className="text-[color:var(--th-text-faint)] sm:hidden">·</span>
                      <span title="Questions">{r.questionsAttempted ?? 0}q</span>
                      <span className="text-[color:var(--th-text-faint)] sm:hidden">·</span>
                      <span title="Time">{Math.round((r.timeSpentSeconds ?? 0) / 60)}m</span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {report?.narrativeSummary && (
              <div className="rounded-2xl border p-6" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                <h3 className="text-sm font-bold mb-2" style={{ color: "var(--th-text-primary)" }}>AI summary</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>{report.narrativeSummary}</p>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {report?.strengths && report.strengths.length > 0 && (
                <div className="rounded-2xl border p-6" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--th-text-primary)" }}>
                    <CheckCircle2 size={15} className="text-emerald-500" /> Strengths
                  </h3>
                  <ul className="space-y-2">
                    {report.strengths.map((s, i) => <li key={i} className="text-xs flex gap-2" style={{ color: "var(--th-text-secondary)" }}><span className="text-emerald-500">✓</span>{s}</li>)}
                  </ul>
                </div>
              )}
              {report?.weaknesses && report.weaknesses.length > 0 && (
                <div className="rounded-2xl border p-6" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--th-text-primary)" }}>
                    <XCircle size={15} className="text-rose-500" /> Areas to improve
                  </h3>
                  <ul className="space-y-2">
                    {report.weaknesses.map((s, i) => <li key={i} className="text-xs flex gap-2" style={{ color: "var(--th-text-secondary)" }}><span className="text-rose-500">!</span>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {report?.actionableStudyPlan && report.actionableStudyPlan.length > 0 && (
              <div className="rounded-2xl border p-6" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--th-text-primary)" }}>
                  <BookOpen size={15} className="text-blue-500" /> Your study plan
                </h3>
                <ul className="space-y-2">
                  {report.actionableStudyPlan.map((s, i) => {
                    const text = typeof s === "string"
                      ? s
                      : [s.title ?? s.topic, s.focusArea, s.recommendedAction ?? s.description].filter(Boolean).join(" — ");
                    const pri = typeof s === "object" ? s.priority : undefined;
                    return (
                      <li key={i} className="text-xs flex gap-2" style={{ color: "var(--th-text-secondary)" }}>
                        <ArrowRight size={12} className="mt-0.5 shrink-0 text-blue-500" />
                        <span>{text}{pri ? <span className="ml-1.5 text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>· {pri}</span> : null}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="flex justify-center gap-3 pt-4">
              <Link href="/interview/setup"><Button variant="secondary">New interview</Button></Link>
              <Link href="/progress"><Button variant="secondary">Interview history</Button></Link>
              <Link href="/dashboard"><Button>Done</Button></Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function InterviewReportPage() {
  return (
    <Suspense fallback={<div className="p-10 text-sm" style={{ color: "var(--th-text-faint)" }}>Loading report…</div>}>
      <InterviewReportInner />
    </Suspense>
  );
}
