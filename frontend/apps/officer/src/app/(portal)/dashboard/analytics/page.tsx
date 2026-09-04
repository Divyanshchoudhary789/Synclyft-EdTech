"use client";

import { useEffect, useState } from "react";
import { collegeAdminService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { CountUp } from "@synclyft/ui/components/CountUp";
import { SkeletonCard } from "@synclyft/ui/components/SkeletonBlock";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid, AreaChart, Area,
} from "recharts";
import { AlertCircle, TrendingUp, Users, ShieldAlert, Activity, ScanEye, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const GRADE_COLORS: Record<string, string> = { A: "#3DDC84", B: "#0062FF", C: "#F59E0B", D: "#FF5C5C", Pending: "#9CA3AF" };

interface AnalyticsShape {
  period?: { days: number };
  students?: { total: number; active: number };
  interviewPerformance?: { totalSessions: number; averageScore: number; gradeDistribution: Record<string, number> };
  proctorRisk?: { totalReports: number; averageRiskScore: number; criticalCount: number; highCount: number };
  trend?: { date: string; sessions: number; averageScore: number }[];
}

interface ProctorShape {
  summary?: { totalSessions: number; averageRiskScore: number; disqualifiedCount: number; highRiskCount: number; lowRiskCount: number };
  riskDistribution?: { _id?: string; count?: number }[] | Record<string, number>;
  dailyTrend?: { _id?: string; date?: string; averageRiskScore?: number; count?: number }[];
  topViolationTypes?: { _id?: string; violationType?: string; count: number }[];
  highRiskSessions?: { id: string; student?: { name?: string; email?: string }; cumulativeRiskScore: number; riskLevel: string; isDisqualified: boolean; violationCount: number }[];
}

const RISK_COLORS: Record<string, string> = { low: "#3DDC84", medium: "#F59E0B", high: "#FF7A45", critical: "#FF5C5C" };

export default function OfficerAnalyticsPage() {
  const [data, setData] = useState<AnalyticsShape | null>(null);
  const [proctor, setProctor] = useState<ProctorShape | null>(null);
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (d: number) => {
    setLoading(true);
    setError(null);
    try {
      const [a, p] = await Promise.allSettled([
        collegeAdminService.analyticsDashboard(d),
        collegeAdminService.proctorRiskDashboard(d),
      ]);
      if (a.status === "fulfilled") setData(a.value as AnalyticsShape);
      else setError(toApiError(a.reason).message);
      if (p.status === "fulfilled") setProctor(p.value as ProctorShape);
      setDays(d);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(90); }, []);

  const perf = data?.interviewPerformance ?? { totalSessions: 0, averageScore: 0, gradeDistribution: {} };
  const risk = data?.proctorRisk ?? { totalReports: 0, averageRiskScore: 0, criticalCount: 0, highCount: 0 };
  const trend = (data?.trend ?? []).map((t) => ({
    date: new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    score: Math.round(t.averageScore),
    sessions: t.sessions,
  }));
  const grades = Object.entries(perf.gradeDistribution ?? {})
    .filter(([, v]) => v > 0)
    .map(([grade, count]) => ({ grade, count }));

  const kpis = [
    { label: "Interview sessions", value: perf.totalSessions, icon: Activity, color: "#4D7CFF" },
    { label: "Avg score", value: Math.round(perf.averageScore), icon: TrendingUp, color: "#0062FF", suffix: "/100" },
    { label: "Students tracked", value: data?.students?.total ?? 0, icon: Users, color: "#3DDC84" },
    { label: "Avg risk score", value: Math.round(risk.averageRiskScore), icon: ShieldAlert, color: "#F59E0B" },
  ];

  return (
    <div className="p-5 sm:p-6 md:p-8 space-y-6">
      <PageHeader
        eyebrow="Performance"
        title="Analytics"
        subtitle={`Cohort-wide interview performance over the last ${days} days`}
        actions={
          <div className="inline-flex rounded-lg border p-0.5" style={{ borderColor: "var(--th-border)" }}>
            {[30, 90, 180].map((d) => (
              <button key={d} onClick={() => load(d)}
                className="px-3 py-1 rounded text-xs font-semibold transition-colors"
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
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4"><SkeletonCard className="h-28" /><SkeletonCard className="h-28" /><SkeletonCard className="h-28" /><SkeletonCard className="h-28" /></div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-2xl border p-5" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--th-text-secondary)" }}>{k.label}</span>
                  <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: k.color + "18" }}><k.icon size={13} style={{ color: k.color }} /></div>
                </div>
                <div className="mt-3 text-2xl font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
                  <CountUp end={k.value} />{k.suffix && <span className="text-sm font-normal" style={{ color: "var(--th-text-faint)" }}>{k.suffix}</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border p-6" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--th-text-primary)" }}>Interview score trend</h3>
              {trend.length >= 2 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={trend} margin={{ top: 6, right: 6, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--th-border)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)", borderRadius: 12, fontSize: 11 }} />
                    <Bar dataKey="score" name="Avg score" fill="#0062FF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs py-16 text-center" style={{ color: "var(--th-text-faint)" }}>Not enough completed interviews in this window yet.</p>
              )}
            </div>

            <div className="rounded-2xl border p-6" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <h3 className="text-sm font-bold mb-4" style={{ color: "var(--th-text-primary)" }}>Grade distribution</h3>
              {grades.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={grades} dataKey="count" nameKey="grade" cx="50%" cy="50%" innerRadius={42} outerRadius={70}>
                        {grades.map((g) => <Cell key={g.grade} fill={GRADE_COLORS[g.grade] ?? "#9CA3AF"} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)", borderRadius: 12, fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 flex flex-wrap gap-2 justify-center">
                    {grades.map((g) => (
                      <span key={g.grade} className="flex items-center gap-1 text-[10px]" style={{ color: "var(--th-text-muted)" }}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: GRADE_COLORS[g.grade] }} /> {g.grade} · {g.count}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs py-16 text-center" style={{ color: "var(--th-text-faint)" }}>No graded interviews yet.</p>
              )}
            </div>
          </div>

          <ProctorSection proctor={proctor} risk={risk} />
        </>
      )}
    </div>
  );
}

function ProctorSection({ proctor, risk }: { proctor: ProctorShape | null; risk: { totalReports: number; highCount: number; criticalCount: number } }) {
  const s = proctor?.summary;
  const distRaw = proctor?.riskDistribution;
  const dist = Array.isArray(distRaw)
    ? distRaw.map((d) => ({ level: String(d._id ?? "unknown"), count: Number(d.count ?? 0) }))
    : Object.entries(distRaw ?? {}).map(([level, count]) => ({ level, count: Number(count) }));
  const trend = (proctor?.dailyTrend ?? []).map((t) => ({
    date: new Date(String(t.date ?? t._id)).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    risk: Math.round(Number(t.averageRiskScore ?? 0)),
  }));
  const violations = (proctor?.topViolationTypes ?? []).map((v) => ({
    type: String(v.violationType ?? v._id ?? "—").replace(/_/g, " "),
    count: Number(v.count ?? 0),
  }));
  const highRisk = proctor?.highRiskSessions ?? [];

  const cards = [
    { label: "Proctored sessions", value: s?.totalSessions ?? risk.totalReports },
    { label: "Avg integrity risk", value: s?.averageRiskScore ?? 0, suffix: "/100" },
    { label: "High-risk", value: s?.highRiskCount ?? risk.highCount },
    { label: "Disqualified", value: s?.disqualifiedCount ?? 0 },
  ];

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--th-text-primary)" }}>
        <ScanEye size={15} className="text-blue-500" /> Proctoring & integrity
      </h3>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {cards.map((k) => (
          <div key={k.label} className="rounded-2xl border p-5" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
            <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--th-text-faint)" }}>{k.label}</p>
            <p className="mt-2 text-2xl font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
              <CountUp end={Number(k.value)} />{k.suffix && <span className="text-sm font-normal" style={{ color: "var(--th-text-faint)" }}>{k.suffix}</span>}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border p-6" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
          <h4 className="text-xs font-bold mb-3" style={{ color: "var(--th-text-primary)" }}>Risk level split</h4>
          {dist.some((d) => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={dist.filter((d) => d.count > 0)} dataKey="count" nameKey="level" cx="50%" cy="50%" innerRadius={38} outerRadius={64}>
                  {dist.map((d) => <Cell key={d.level} fill={RISK_COLORS[d.level] ?? "#9CA3AF"} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)", borderRadius: 10, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-xs py-12 text-center" style={{ color: "var(--th-text-faint)" }}>No proctored sessions yet.</p>}
          <div className="mt-2 flex flex-wrap gap-2 justify-center">
            {dist.filter((d) => d.count > 0).map((d) => (
              <span key={d.level} className="flex items-center gap-1 text-[10px] capitalize" style={{ color: "var(--th-text-muted)" }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RISK_COLORS[d.level] ?? "#9CA3AF" }} /> {d.level} · {d.count}
              </span>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border p-6" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
          <h4 className="text-xs font-bold mb-3" style={{ color: "var(--th-text-primary)" }}>Average risk over time</h4>
          {trend.length >= 2 ? (
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={trend} margin={{ left: -20, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--th-border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)", borderRadius: 10, fontSize: 11 }} />
                <Area dataKey="risk" stroke="#FF5C5C" fill="#FF5C5C" fillOpacity={0.12} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <p className="text-xs py-12 text-center" style={{ color: "var(--th-text-faint)" }}>Not enough proctored sessions in this window.</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
          <div className="px-5 py-3 border-b text-xs font-bold" style={{ borderColor: "var(--th-border)", color: "var(--th-text-primary)" }}>Highest-risk sessions</div>
          {highRisk.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 p-8 text-center">
              <ShieldCheck size={20} className="text-emerald-500" />
              <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>No high-risk sessions flagged.</p>
            </div>
          ) : (
            highRisk.slice(0, 8).map((h) => (
              <div key={h.id} className="flex items-center gap-3 px-5 py-2.5 border-b last:border-0 text-xs" style={{ borderColor: "var(--th-border)" }}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: "var(--th-text-primary)" }}>{h.student?.name ?? "Student"}</p>
                  <p className="text-[10px] truncate" style={{ color: "var(--th-text-faint)" }}>{h.violationCount} violation{h.violationCount === 1 ? "" : "s"}{h.isDisqualified ? " · disqualified" : ""}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize" style={{ backgroundColor: (RISK_COLORS[h.riskLevel] ?? "#9CA3AF") + "22", color: RISK_COLORS[h.riskLevel] ?? "#9CA3AF" }}>
                  {h.riskLevel}
                </span>
                <span className="font-mono font-bold" style={{ color: RISK_COLORS[h.riskLevel] ?? "var(--th-text-primary)" }}>{Math.round(h.cumulativeRiskScore)}</span>
              </div>
            ))
          )}
        </div>

        <div className="rounded-2xl border p-5" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
          <p className="text-xs font-bold mb-3" style={{ color: "var(--th-text-primary)" }}>Most common violations</p>
          {violations.length === 0 ? (
            <p className="text-xs py-8 text-center" style={{ color: "var(--th-text-faint)" }}>No violations recorded.</p>
          ) : (
            <div className="space-y-2">
              {violations.slice(0, 6).map((v) => {
                const max = Math.max(...violations.map((x) => x.count), 1);
                return (
                  <div key={v.type}>
                    <div className="flex justify-between text-[11px] mb-0.5" style={{ color: "var(--th-text-secondary)" }}>
                      <span className="capitalize truncate">{v.type}</span><span className="font-mono">{v.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ backgroundColor: "var(--th-bg-tertiary)" }}>
                      <div className="h-full rounded-full" style={{ width: `${(v.count / max) * 100}%`, backgroundColor: "#FF5C5C" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
