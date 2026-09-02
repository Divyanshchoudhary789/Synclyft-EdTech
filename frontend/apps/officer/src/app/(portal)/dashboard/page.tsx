"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@synclyft/ui/components/Badge";
import { Button } from "@synclyft/ui/components/Button";
import { CountUp } from "@synclyft/ui/components/CountUp";
import { SkeletonCard } from "@synclyft/ui/components/SkeletonBlock";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, CartesianGrid } from "recharts";
import {
  Users, TrendingUp, Award, Activity, Layers, Megaphone, Armchair,
  BarChart3, FileText, Sparkles, ArrowRight, AlertCircle,
} from "lucide-react";
import { getGradeColor, getGradeBand } from "@synclyft/lib/utils";
import { collegeAdminService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";

interface StudentRow {
  id: string;
  name: string;
  email: string;
  readiness: number;
  mocks: number;
}

const DIST_COLORS = ["#3DDC84", "#0062FF", "#F59E0B", "#FF5C5C"];

export default function OfficerDashboardPage() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [d, s] = await Promise.allSettled([
          collegeAdminService.dashboard(),
          collegeAdminService.students({ limit: 500 }),
        ]);
        if (d.status === "fulfilled") setDash(d.value as Record<string, unknown>);
        if (s.status === "fulfilled") {
          setStudents(
            s.value.items.map((p) => {
              const user = (p.user ?? {}) as Record<string, unknown>;
              return {
                id: String(user._id ?? p._id ?? ""),
                name: String(user.name ?? p.name ?? "—"),
                email: String(user.email ?? p.email ?? ""),
                readiness: Math.round(Number(p.placementReadinessScore ?? 0)),
                mocks: Number(p.mockHistoryCount ?? 0),
              };
            })
          );
        }
        if (d.status === "rejected" && s.status === "rejected") setError(toApiError(d.reason).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const analytics = (dash?.analytics ?? {}) as Record<string, number>;
  const totalStudents = Number(dash?.studentCount ?? students.length);
  const avgReadiness = students.length
    ? Math.round(students.reduce((a, c) => a + c.readiness, 0) / students.length)
    : 0;
  const readyCount = students.filter((s) => s.readiness >= 75).length;
  const totalSessions = Number(analytics.totalInterviewSessions ?? 0);

  const distribution = [
    { band: "Top (85+)", count: students.filter((s) => s.readiness >= 85).length },
    { band: "High (70–85)", count: students.filter((s) => s.readiness >= 70 && s.readiness < 85).length },
    { band: "Average (50–70)", count: students.filter((s) => s.readiness >= 50 && s.readiness < 70).length },
    { band: "At risk (<50)", count: students.filter((s) => s.readiness < 50).length },
  ];

  const topMovers = [...students].sort((a, b) => b.readiness - a.readiness).slice(0, 5);
  const needsAttention = [...students].filter((s) => s.readiness > 0).sort((a, b) => a.readiness - b.readiness).slice(0, 5);

  const kpis = [
    { label: "Total students", value: totalStudents, icon: Users, color: "#4D7CFF", href: "/dashboard/students" },
    { label: "Avg readiness", value: avgReadiness, suffix: "/100", icon: TrendingUp, color: "#0062FF", href: "/dashboard/analytics" },
    { label: "Interview-ready (75+)", value: readyCount, icon: Award, color: "#3DDC84", href: "/dashboard/students" },
    { label: "Interview sessions", value: totalSessions, icon: Activity, color: "#F59E0B", href: "/dashboard/analytics" },
  ];

  const quickLinks = [
    { label: "Manage batches", icon: Layers, href: "/dashboard/batches" },
    { label: "Run a campaign", icon: Megaphone, href: "/dashboard/campaigns" },
    { label: "Allocate seats", icon: Armchair, href: "/dashboard/seats" },
    { label: "Full analytics", icon: BarChart3, href: "/dashboard/analytics" },
    { label: "Placement reports", icon: FileText, href: "/dashboard/reports" },
    { label: "Ask your data", icon: Sparkles, href: "/dashboard/query" },
  ];

  return (
    <div className="p-6 md:p-8 space-y-7">
      <div>
        <p className="label-caption mb-1" style={{ color: "var(--th-text-faint)" }}>Placement Officer Portal</p>
        <h1 className="text-[1.75rem] font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
          Cohort overview
        </h1>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
          <AlertCircle size={16} className="text-amber-500" /> {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><SkeletonCard className="h-28" /><SkeletonCard className="h-28" /><SkeletonCard className="h-28" /><SkeletonCard className="h-28" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((k) => (
              <Link key={k.label} href={k.href} className="card-light p-4 space-y-3 transition-colors hover:border-[color:var(--th-primary)]" style={{ borderColor: "var(--th-card-border)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--th-text-secondary)" }}>{k.label}</span>
                  <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: k.color + "18" }}>
                    <k.icon size={13} style={{ color: k.color }} />
                  </div>
                </div>
                <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: k.color }}>
                  <CountUp end={k.value} duration={800} />
                  {k.suffix && <span className="text-sm font-normal ml-0.5" style={{ color: "var(--th-text-secondary)" }}>{k.suffix}</span>}
                </div>
              </Link>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2 card-light p-5">
              <p className="label-caption mb-4" style={{ color: "var(--th-text-secondary)" }}>Readiness distribution</p>
              {students.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={distribution} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--th-border)" vertical={false} />
                    <XAxis dataKey="band" tick={{ fontSize: 10, fill: "var(--th-text-secondary)" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "var(--th-card-bg)", border: "1px solid var(--th-border)", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "rgba(125,125,125,0.06)" }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {distribution.map((_, i) => <Cell key={i} fill={DIST_COLORS[i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs py-16 text-center" style={{ color: "var(--th-text-faint)" }}>No students in your cohort yet.</p>
              )}
            </div>

            <div className="card-light p-5">
              <p className="label-caption mb-3" style={{ color: "var(--th-text-secondary)" }}>Quick actions</p>
              <div className="space-y-1">
                {quickLinks.map((a) => (
                  <Link key={a.label} href={a.href}
                    className="flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03] group text-xs font-semibold"
                    style={{ color: "var(--th-text-secondary)" }}>
                    <a.icon size={14} className="text-blue-600 dark:text-blue-400" />
                    <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{a.label}</span>
                    <ArrowRight size={12} className="ml-auto opacity-40 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <StudentMiniTable title="Top of the cohort" rows={topMovers} onOpen={(id) => router.push(`/dashboard/students?student=${id}`)} />
            <StudentMiniTable title="Needs attention" rows={needsAttention} onOpen={(id) => router.push(`/dashboard/students?student=${id}`)} />
          </div>
        </>
      )}
    </div>
  );
}

function StudentMiniTable({ title, rows, onOpen }: { title: string; rows: StudentRow[]; onOpen: (id: string) => void }) {
  return (
    <div className="card-light overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--th-border)" }}>
        <h3 className="text-xs font-bold" style={{ color: "var(--th-text-primary)" }}>{title}</h3>
        <Link href="/dashboard/students" className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline">View all</Link>
      </div>
      {rows.length === 0 ? (
        <p className="p-6 text-center text-xs" style={{ color: "var(--th-text-faint)" }}>No data yet.</p>
      ) : (
        rows.map((r) => {
          const color = getGradeColor(getGradeBand(r.readiness));
          return (
            <button key={r.id} onClick={() => onOpen(r.id)}
              className="w-full flex items-center gap-3 px-5 py-3 border-b last:border-0 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
              style={{ borderColor: "var(--th-border)" }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: "var(--th-text-primary)" }}>{r.name}</p>
                <p className="text-[10px] font-mono truncate" style={{ color: "var(--th-text-faint)" }}>{r.email}</p>
              </div>
              <span className="text-[10px] font-mono" style={{ color: "var(--th-text-muted)" }}>{r.mocks} mocks</span>
              <span className="font-mono font-bold text-sm" style={{ color }}>{r.readiness}</span>
            </button>
          );
        })
      )}
    </div>
  );
}
