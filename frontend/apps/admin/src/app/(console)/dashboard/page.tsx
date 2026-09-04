"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CountUp } from "@synclyft/ui/components/CountUp";
import { Button } from "@synclyft/ui/components/Button";
import { SkeletonBlock } from "@synclyft/ui/components/SkeletonBlock";
import { superAdminService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Line, Legend,
} from "recharts";
import {
  Users, Building2, CreditCard, Armchair, FileText, AlertCircle, ArrowRight, GraduationCap,
  Activity, ShieldAlert, TrendingUp, ClipboardCheck, IndianRupee,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

interface Overview {
  users: { students: number; collegeAdmins: number; superAdmins: number; pendingAdmins: number };
  organizations: number;
  subscriptions: { activeSubscriptions: number };
  billing: { invoices: number; completedInvoices: number };
  seats: { totalSeats: number; usedSeats: number; usagePercentage: number };
  verifiedProfiles: number;
}
interface Analytics {
  interviewStats: { totalSessions: number; completedSessions: number; averageScore: number; averageRiskScore: number; disqualifiedCount: number };
  proctorStats: { totalReports: number; criticalRiskCount: number; highRiskCount: number; disqualifiedCount: number; averageRiskScore: number };
  topViolationTypes: { _id: string; count: number }[];
  trendData: { date: string; sessions: number; averageScore: number; averageRisk: number }[];
}
interface Pending { _id?: string; id?: string; name?: string; email?: string; organization?: string; createdAt?: string }

const VIOLATION_LABELS: Record<string, string> = {
  tab_switch: "Tab switch", window_minimize: "Window minimise", window_blur: "Lost focus",
  paste_attempt: "Paste attempt", copy_attempt: "Copy attempt", context_menu: "Right-click",
  face_absence: "Face not visible", face_not_visible: "Face not visible", multiple_faces: "Multiple faces",
  gaze_deviation: "Looking away", multiple_voices: "Multiple voices", audio_anomaly: "Audio anomaly",
  phone_detected: "Phone detected", person_detected: "Another person", multiple_persons: "Multiple people",
};

export default function AdminDashboardPage() {
  const [ov, setOv] = useState<Overview | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [subStats, setSubStats] = useState<Record<string, number> | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, a, s, p] = await Promise.allSettled([
        superAdminService.overview(),
        superAdminService.analyticsOverview({ days: 30 }),
        superAdminService.subscriptionStats(),
        superAdminService.pendingApprovals(),
      ]);
      if (o.status === "fulfilled") setOv(o.value as Overview);
      else setError(toApiError(o.reason).message);
      if (a.status === "fulfilled") setAnalytics(a.value as Analytics);
      if (s.status === "fulfilled") setSubStats(s.value as Record<string, number>);
      if (p.status === "fulfilled") setPending((p.value as Pending[]).slice(0, 5));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const mrr = Number(subStats?.mrr ?? 0);
  const trend = (analytics?.trendData ?? []).map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    sessions: d.sessions,
    score: d.averageScore,
  }));

  const kpis = ov ? [
    { label: "Students", value: ov.users.students, icon: GraduationCap, color: "#4D7CFF", href: "/students" },
    { label: "College admins", value: ov.users.collegeAdmins, icon: Users, color: "#0062FF", href: "/organizations" },
    { label: "Organizations", value: ov.organizations, icon: Building2, color: "#3DDC84", href: "/organizations" },
    { label: "Active subscriptions", value: ov.subscriptions.activeSubscriptions, icon: CreditCard, color: "#F59E0B", href: "/subscriptions" },
    { label: "Seats allocated", value: ov.seats.usedSeats, sub: `of ${ov.seats.totalSeats} · ${ov.seats.usagePercentage}% used`, icon: Armchair, color: "#8B5CF6", href: "/subscriptions" },
    { label: "Invoices", value: ov.billing.invoices, sub: `${ov.billing.completedInvoices} paid`, icon: FileText, color: "#EC4899", href: "/subscriptions" },
    { label: "Scored student profiles", value: ov.verifiedProfiles, sub: "have a readiness score", icon: TrendingUp, color: "#14B8A6", href: "/students" },
    { label: "Pending approvals", value: ov.users.pendingAdmins, icon: ClipboardCheck, color: "#FF5C5C", href: "/pending-colleges" },
  ] : [];

  const iv = analytics?.interviewStats;
  const pr = analytics?.proctorStats;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Overview"
        subtitle="Live health of every institution, subscription and interview on Synclyft"
        actions={
          ov && ov.users.pendingAdmins > 0 ? (
            <Link href="/pending-colleges">
              <Button icon={<AlertCircle size={14} />}>
                {ov.users.pendingAdmins} college{ov.users.pendingAdmins > 1 ? "s" : ""} awaiting approval
              </Button>
            </Link>
          ) : undefined
        }
      />

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border p-4 text-sm"
          style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
          <span className="flex items-center gap-2"><AlertCircle size={16} className="text-amber-500" /> {error}</span>
          <Button variant="secondary" onClick={load}>Retry</Button>
        </div>
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Platform KPIs */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => {
              const card = (
                <div className="rounded-2xl border p-5 h-full transition-colors hover:border-[color:var(--th-primary)]" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: "var(--th-text-secondary)" }}>{k.label}</span>
                    <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: k.color + "18" }}>
                      <k.icon size={13} style={{ color: k.color }} />
                    </div>
                  </div>
                  <div className="mt-3 text-2xl font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
                    <CountUp end={k.value} />
                  </div>
                  {k.sub && <p className="text-[11px] mt-0.5" style={{ color: "var(--th-text-faint)" }}>{k.sub}</p>}
                </div>
              );
              return k.href ? <Link key={k.label} href={k.href}>{card}</Link> : <div key={k.label}>{card}</div>;
            })}
          </div>

          {/* Revenue + interview activity */}
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border p-6 flex flex-col justify-center" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <div className="flex items-center gap-2">
                <IndianRupee size={14} style={{ color: "var(--th-primary)" }} />
                <p className="text-xs font-semibold" style={{ color: "var(--th-text-faint)" }}>Monthly recurring revenue</p>
              </div>
              <p className="mt-2 text-3xl font-black" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
                ₹<CountUp end={mrr} />
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]" style={{ color: "var(--th-text-muted)" }}>
                <span>Active {Number(subStats?.totalActive ?? 0)}</span>
                <span>Grace {Number(subStats?.totalGracePeriod ?? 0)}</span>
                <span>Pending {Number(subStats?.totalPending ?? 0)}</span>
                <span>Expiring 30d {Number(subStats?.expiringIn30Days ?? 0)}</span>
              </div>
            </div>

            <div className="lg:col-span-2 rounded-2xl border p-6" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--th-text-primary)" }}>
                  <Activity size={14} /> Interview activity <span className="text-[11px] font-normal" style={{ color: "var(--th-text-faint)" }}>last 30 days</span>
                </h3>
                {iv && <span className="text-xs" style={{ color: "var(--th-text-muted)" }}>{iv.totalSessions} sessions · avg {iv.averageScore}</span>}
              </div>
              {trend.length >= 2 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trend} margin={{ top: 4, right: 6, left: -20 }}>
                    <defs>
                      <linearGradient id="adminSess" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0062FF" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#0062FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--th-border)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)", borderRadius: 12, fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area dataKey="sessions" name="Sessions" stroke="#0062FF" strokeWidth={2} fill="url(#adminSess)" />
                    <Line dataKey="score" name="Avg score" stroke="#3DDC84" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : trend.length === 1 ? (
                <div className="flex flex-col items-center gap-1 py-16 text-center">
                  <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>{trend[0].sessions}</p>
                  <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>sessions on {trend[0].date} · avg score {trend[0].score}</p>
                  <p className="text-[11px]" style={{ color: "var(--th-text-faint)" }}>A trend line appears once activity spans multiple days.</p>
                </div>
              ) : (
                <p className="text-xs py-16 text-center" style={{ color: "var(--th-text-faint)" }}>No interview activity in this window yet.</p>
              )}
            </div>
          </div>

          {/* Proctoring health + violations + pending approvals */}
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border p-6" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4" style={{ color: "var(--th-text-primary)" }}>
                <ShieldAlert size={14} /> Proctoring health <span className="text-[11px] font-normal" style={{ color: "var(--th-text-faint)" }}>last 30 days</span>
              </h3>
              {pr ? (
                <div className="space-y-2.5 text-xs">
                  {[
                    ["Risk reports", pr.totalReports, "var(--th-text-primary)"],
                    ["High-risk sessions", pr.highRiskCount, "#F59E0B"],
                    ["Critical-risk sessions", pr.criticalRiskCount, "#FF5C5C"],
                    ["Disqualified", pr.disqualifiedCount, "#FF5C5C"],
                    ["Avg risk score", pr.averageRiskScore, "var(--th-text-primary)"],
                  ].map(([label, value, color]) => (
                    <div key={String(label)} className="flex items-center justify-between">
                      <span style={{ color: "var(--th-text-secondary)" }}>{label}</span>
                      <span className="font-mono font-bold" style={{ color: color as string }}>{value as number}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>No data.</p>}
            </div>

            <div className="rounded-2xl border p-6" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--th-text-primary)" }}>
                Top integrity flags <span className="text-[11px] font-normal" style={{ color: "var(--th-text-faint)" }}>last 30 days</span>
              </h3>
              {(analytics?.topViolationTypes ?? []).length > 0 ? (
                <div className="space-y-2">
                  {analytics!.topViolationTypes.slice(0, 6).map((v) => {
                    const max = analytics!.topViolationTypes[0].count || 1;
                    return (
                      <div key={v._id}>
                        <div className="flex items-center justify-between text-[11px] mb-0.5" style={{ color: "var(--th-text-secondary)" }}>
                          <span>{VIOLATION_LABELS[v._id] ?? v._id}</span>
                          <span className="font-mono">{v.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ backgroundColor: "var(--th-bg-tertiary)" }}>
                          <div className="h-full rounded-full" style={{ width: `${(v.count / max) * 100}%`, backgroundColor: "#0062FF" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>No integrity flags recorded.</p>}
            </div>

            <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--th-border)" }}>
                <h3 className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>Pending approvals</h3>
                <Link href="/pending-colleges" className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline">View all</Link>
              </div>
              {pending.length === 0 ? (
                <p className="p-6 text-center text-xs" style={{ color: "var(--th-text-faint)" }}>All caught up.</p>
              ) : (
                pending.map((p) => (
                  <Link key={p._id ?? p.id} href="/pending-colleges" className="block px-5 py-3 border-b last:border-0 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]" style={{ borderColor: "var(--th-border)" }}>
                    <p className="text-xs font-semibold truncate" style={{ color: "var(--th-text-primary)" }}>{p.organization}</p>
                    <p className="text-[10px] font-mono truncate" style={{ color: "var(--th-text-faint)" }}>{p.email}</p>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/pending-colleges"><Button variant="secondary" icon={<ClipboardCheck size={14} />} iconRight={<ArrowRight size={14} />}>Approvals</Button></Link>
            <Link href="/organizations"><Button variant="secondary" icon={<Building2 size={14} />} iconRight={<ArrowRight size={14} />}>Organizations</Button></Link>
            <Link href="/students"><Button variant="secondary" icon={<GraduationCap size={14} />} iconRight={<ArrowRight size={14} />}>Students</Button></Link>
            <Link href="/audit-logs"><Button variant="secondary" icon={<FileText size={14} />} iconRight={<ArrowRight size={14} />}>Audit log</Button></Link>
          </div>
        </>
      )}
    </div>
  );
}

const skelCard = "rounded-2xl border p-5";
const skelStyle = { backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" };

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI grid — matches the 8-card 2/4-col layout exactly */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={skelCard} style={skelStyle}>
            <div className="flex items-center justify-between">
              <SkeletonBlock height="h-3" width="w-20" />
              <SkeletonBlock height="h-7" width="w-7" className="rounded" />
            </div>
            <SkeletonBlock height="h-7" width="w-14" className="mt-3" />
            <SkeletonBlock height="h-2.5" width="w-24" className="mt-2" />
          </div>
        ))}
      </div>

      {/* Revenue + interview activity */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className={`${skelCard} p-6`} style={skelStyle}>
          <SkeletonBlock height="h-3" width="w-40" />
          <SkeletonBlock height="h-8" width="w-28" className="mt-3" />
          <SkeletonBlock height="h-3" width="w-full" className="mt-4" />
        </div>
        <div className={`${skelCard} p-6 lg:col-span-2`} style={skelStyle}>
          <SkeletonBlock height="h-4" width="w-48" />
          <SkeletonBlock height="h-[200px]" width="w-full" className="mt-4 rounded-xl" />
        </div>
      </div>

      {/* Proctoring + flags + pending */}
      <div className="grid gap-5 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`${skelCard} p-6`} style={skelStyle}>
            <SkeletonBlock height="h-4" width="w-36" />
            <div className="mt-4 space-y-2.5">
              {Array.from({ length: 5 }).map((_, j) => <SkeletonBlock key={j} height="h-3" width={j % 2 ? "w-full" : "w-4/5"} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
