"use client";

import { useEffect, useState } from "react";
import { superAdminService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { CountUp } from "@synclyft/ui/components/CountUp";
import { SkeletonCard } from "@synclyft/ui/components/SkeletonBlock";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { AlertCircle, Activity, ShieldAlert, GraduationCap, Award } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

interface Overview {
  interviewStats: { totalSessions: number; completedSessions: number; averageScore: number; averageRiskScore: number; disqualifiedCount: number };
  proctorStats: { totalReports: number; criticalRiskCount: number; highRiskCount: number; disqualifiedCount: number; averageRiskScore: number };
  topViolationTypes: { _id: string; count: number }[];
  trendData: { date: string; sessions: number; averageScore: number; averageRisk: number }[];
}
interface RiskRow {
  organizationName?: string; totalSessions?: number; averageRiskScore?: number;
  disqualifiedCount?: number; criticalCount?: number; highCount?: number;
}
interface Violations {
  violationPatterns: { violationType: string; count: number; averageWeight: number }[];
  roundDistribution: { roundType: string; violationCount: number }[];
  timeDistribution: { hour: number; violationCount: number }[];
}
interface Heatmap {
  dayOfWeekHeatmap: { dayName: string; sessionCount: number; averageScore: number; completionRate: number }[];
}

const VIOLATION_LABELS: Record<string, string> = {
  tab_switch: "Tab switch", window_minimize: "Window minimise", window_blur: "Lost focus",
  paste_attempt: "Paste attempt", copy_attempt: "Copy attempt", context_menu: "Right-click",
  face_absence: "Face not visible", face_not_visible: "Face not visible", multiple_faces: "Multiple faces",
  gaze_deviation: "Looking away", multiple_voices: "Multiple voices", audio_anomaly: "Audio anomaly",
  phone_detected: "Phone detected", person_detected: "Another person", multiple_persons: "Multiple people",
};

export default function AdminAnalyticsPage() {
  const [ov, setOv] = useState<Overview | null>(null);
  const [risk, setRisk] = useState<RiskRow[]>([]);
  const [violations, setViolations] = useState<Violations | null>(null);
  const [heatmap, setHeatmap] = useState<Heatmap | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (d: number) => {
    setLoading(true);
    setError(null);
    try {
      const [o, r, v, h] = await Promise.allSettled([
        superAdminService.analyticsOverview({ days: d }),
        superAdminService.riskTrend({ days: d, limit: 20 }),
        superAdminService.violationAnalytics({ days: d }),
        superAdminService.interviewHeatmap({ days: Math.max(d, 90) }),
      ]);
      if (o.status === "fulfilled") setOv(o.value as Overview); else setError(toApiError(o.reason).message);
      if (r.status === "fulfilled") setRisk(r.value as unknown as RiskRow[]);
      if (v.status === "fulfilled") setViolations(v.value as Violations);
      if (h.status === "fulfilled") setHeatmap(h.value as Heatmap);
      setDays(d);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(30); }, []);

  const iv = ov?.interviewStats;
  const trend = (ov?.trendData ?? []).map((t) => ({
    date: new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    sessions: t.sessions, score: t.averageScore,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Analytics"
        subtitle="Interview volume, scoring and proctoring integrity across every institution"
        actions={
          <div className="inline-flex rounded-lg border p-0.5" style={{ borderColor: "var(--th-border)" }}>
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => load(d)}
                className="rounded px-3 py-1 text-xs font-semibold transition-colors"
                style={{ backgroundColor: days === d ? "var(--th-primary)" : "transparent", color: days === d ? "#fff" : "var(--th-text-secondary)" }}>
                {d}d
              </button>
            ))}
          </div>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
          <AlertCircle size={16} className="text-amber-500" /> {error}
          <button onClick={() => load(days)} className="ml-auto text-blue-600 dark:text-blue-400 text-xs">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} className="h-28" />)}</div>
      ) : (
        <>
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Interview sessions", value: iv?.totalSessions ?? 0, icon: Activity, color: "#4D7CFF" },
              { label: "Completed", value: iv?.completedSessions ?? 0, icon: GraduationCap, color: "#3DDC84" },
              { label: "Avg score", value: iv?.averageScore ?? 0, icon: Award, color: "#0062FF" },
              { label: "Disqualified", value: iv?.disqualifiedCount ?? 0, icon: ShieldAlert, color: "#FF5C5C" },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl border p-5" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--th-text-secondary)" }}>{k.label}</span>
                  <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: k.color + "18" }}><k.icon size={13} style={{ color: k.color }} /></div>
                </div>
                <p className="mt-3 text-2xl font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}><CountUp end={k.value} /></p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border p-6" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--th-text-primary)" }}>Sessions &amp; average score</h3>
              {trend.length >= 2 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={trend} margin={{ top: 4, right: 6, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--th-border)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)", borderRadius: 12, fontSize: 11 }} />
                    <Bar dataKey="sessions" name="Sessions" fill="#0062FF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-xs py-16 text-center" style={{ color: "var(--th-text-faint)" }}>No sessions in this window.</p>}
            </div>

            <div className="rounded-2xl border p-6" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--th-text-primary)" }}>By day of week</h3>
              {(heatmap?.dayOfWeekHeatmap ?? []).length > 0 ? (
                <div className="space-y-2">
                  {heatmap!.dayOfWeekHeatmap.map((d) => {
                    const max = Math.max(...heatmap!.dayOfWeekHeatmap.map((x) => x.sessionCount), 1);
                    return (
                      <div key={d.dayName}>
                        <div className="flex justify-between text-[11px] mb-0.5" style={{ color: "var(--th-text-secondary)" }}>
                          <span>{d.dayName?.slice(0, 3)}</span><span className="font-mono">{d.sessionCount} · avg {d.averageScore}</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ backgroundColor: "var(--th-bg-tertiary)" }}>
                          <div className="h-full rounded-full" style={{ width: `${(d.sessionCount / max) * 100}%`, backgroundColor: "#0062FF" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-xs py-8 text-center" style={{ color: "var(--th-text-faint)" }}>No data.</p>}
            </div>
          </div>

          {/* Risk by college */}
          <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
            <div className="min-w-[640px]">
              <div className="px-6 py-3 border-b text-sm font-bold" style={{ borderColor: "var(--th-border)", color: "var(--th-text-primary)" }}>Proctoring risk by college</div>
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-6 py-2 text-[10px] font-bold uppercase" style={{ color: "var(--th-text-faint)" }}>
                <span>College</span><span>Sessions</span><span>Avg risk</span><span>High</span><span>Critical</span>
              </div>
              {risk.length === 0 ? (
                <p className="p-8 text-center text-xs" style={{ color: "var(--th-text-faint)" }}>No proctoring data in this window.</p>
              ) : risk.map((r, i) => (
                <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-6 py-2.5 border-t text-xs items-center" style={{ borderColor: "var(--th-border)", color: "var(--th-text-secondary)" }}>
                  <span className="truncate">{r.organizationName ?? "Unknown"}</span>
                  <span className="font-mono">{r.totalSessions ?? 0}</span>
                  <span className="font-mono" style={{ color: (r.averageRiskScore ?? 0) > 50 ? "#FF5C5C" : "var(--th-text-secondary)" }}>{r.averageRiskScore ?? 0}</span>
                  <span className="font-mono">{r.highCount ?? 0}</span>
                  <span className="font-mono" style={{ color: (r.criticalCount ?? 0) > 0 ? "#FF5C5C" : "var(--th-text-secondary)" }}>{r.criticalCount ?? 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Violation patterns */}
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border p-6" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--th-text-primary)" }}>Integrity flag patterns</h3>
              {(violations?.violationPatterns ?? []).length > 0 ? (
                <div className="space-y-2">
                  {violations!.violationPatterns.slice(0, 8).map((v) => {
                    const max = violations!.violationPatterns[0].count || 1;
                    return (
                      <div key={v.violationType}>
                        <div className="flex justify-between text-[11px] mb-0.5" style={{ color: "var(--th-text-secondary)" }}>
                          <span>{VIOLATION_LABELS[v.violationType] ?? v.violationType}</span><span className="font-mono">{v.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ backgroundColor: "var(--th-bg-tertiary)" }}>
                          <div className="h-full rounded-full" style={{ width: `${(v.count / max) * 100}%`, backgroundColor: "#F59E0B" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>No flags recorded.</p>}
            </div>

            <div className="rounded-2xl border p-6" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--th-text-primary)" }}>Flags by round</h3>
              {(violations?.roundDistribution ?? []).length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={violations!.roundDistribution} margin={{ left: -20 }}>
                    <XAxis dataKey="roundType" tick={{ fontSize: 10, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)", borderRadius: 12, fontSize: 11 }} />
                    <Bar dataKey="violationCount" radius={[4, 4, 0, 0]}>
                      {violations!.roundDistribution.map((_, i) => <Cell key={i} fill={["#3DDC84", "#0062FF", "#F59E0B", "#FF5C5C"][i % 4]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-xs py-8 text-center" style={{ color: "var(--th-text-faint)" }}>No data.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
