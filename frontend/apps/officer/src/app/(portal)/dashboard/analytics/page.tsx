"use client";

import { useEffect, useState } from "react";
import { collegeAdminService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { CountUp } from "@synclyft/ui/components/CountUp";
import { SkeletonCard } from "@synclyft/ui/components/SkeletonBlock";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { AlertCircle, TrendingUp, Users, ShieldAlert, Activity } from "lucide-react";

const GRADE_COLORS: Record<string, string> = { A: "#3DDC84", B: "#0062FF", C: "#F59E0B", D: "#FF5C5C", Pending: "#9CA3AF" };

interface AnalyticsShape {
  period?: { days: number };
  students?: { total: number; active: number };
  interviewPerformance?: { totalSessions: number; averageScore: number; gradeDistribution: Record<string, number> };
  proctorRisk?: { totalReports: number; averageRiskScore: number; criticalCount: number; highCount: number };
  trend?: { date: string; sessions: number; averageScore: number }[];
}

export default function OfficerAnalyticsPage() {
  const [data, setData] = useState<AnalyticsShape | null>(null);
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (d: number) => {
    setLoading(true);
    setError(null);
    try {
      setData((await collegeAdminService.analyticsDashboard(d)) as AnalyticsShape);
      setDays(d);
    } catch (err) {
      setError(toApiError(err).message);
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
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>Analytics</h1>
          <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>Cohort-wide interview performance over the last {days} days</p>
        </div>
        <div className="inline-flex rounded-lg border p-0.5" style={{ borderColor: "var(--th-border)" }}>
          {[30, 90, 180].map((d) => (
            <button key={d} onClick={() => load(d)}
              className="px-3 py-1 rounded text-xs font-semibold transition-colors"
              style={{ backgroundColor: days === d ? "var(--th-primary)" : "transparent", color: days === d ? "#fff" : "var(--th-text-secondary)" }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
          <AlertCircle size={16} className="text-amber-500" /> {error}
          <button onClick={() => load(days)} className="ml-auto text-blue-600 dark:text-blue-400 text-xs">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><SkeletonCard className="h-28" /><SkeletonCard className="h-28" /><SkeletonCard className="h-28" /><SkeletonCard className="h-28" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Proctor reports", value: risk.totalReports },
              { label: "High-risk sessions", value: risk.highCount },
              { label: "Critical-risk sessions", value: risk.criticalCount },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl border p-5" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--th-text-faint)" }}>{k.label}</p>
                <p className="mt-2 text-2xl font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}><CountUp end={k.value} /></p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
