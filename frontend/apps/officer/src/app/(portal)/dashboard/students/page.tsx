"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { collegeAdminService } from "@synclyft/lib/api/services";
import { API_BASE_URL, toApiError } from "@synclyft/lib/api";
import { getGradeBand, getGradeColor } from "@synclyft/lib/utils";
import { Badge } from "@synclyft/ui/components/Badge";
import { Button } from "@synclyft/ui/components/Button";
import { SkeletonBlock } from "@synclyft/ui/components/SkeletonBlock";
import { Modal } from "@synclyft/ui/components/Modal";
import {
  Search, AlertCircle, Users, X, Loader2, TrendingUp, ShieldAlert, Megaphone, Download,
  CalendarClock, SlidersHorizontal, GraduationCap, Layers, Sparkles, FileText,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import toast from "react-hot-toast";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";

interface Row {
  id: string;
  name: string;
  email: string;
  branch?: string | null;
  graduationYear?: number | null;
  readiness: number;
  mocks: number;
  lastActive?: string | null;
  onboarded: boolean;
}

function normalize(p: Record<string, unknown>): Row {
  const user = (p.user ?? {}) as Record<string, unknown>;
  return {
    id: String(user._id ?? p._id ?? ""),
    name: String(user.name ?? p.name ?? "—"),
    email: String(user.email ?? p.email ?? ""),
    branch: (p.branch as string) ?? null,
    graduationYear: (p.graduationYear as number) ?? null,
    readiness: Math.round(Number(p.placementReadinessScore ?? 0)),
    mocks: Number(p.mockHistoryCount ?? 0),
    lastActive: (p.lastMockAt as string) ?? null,
    onboarded: p.onboarded !== false,
  };
}

const BANDS = [
  { id: "all", label: "All" },
  { id: "top", label: "Top 85+" },
  { id: "high", label: "70–85" },
  { id: "mid", label: "50–70" },
  { id: "risk", label: "At risk <50" },
] as const;

const SORTS = [
  { id: "recent", label: "Recently joined" },
  { id: "readiness_desc", label: "Readiness ↓" },
  { id: "readiness_asc", label: "Readiness ↑" },
  { id: "name", label: "Name A–Z" },
] as const;

const PAGE_SIZE = 40;

function StudentsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [band, setBand] = useState<string>("all");
  const [sort, setSort] = useState<string>("recent");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [openId, setOpenId] = useState<string | null>(params.get("student"));
  const [announce, setAnnounce] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (opts: { page: number; q: string; band: string; sort: string }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await collegeAdminService.students({
        page: opts.page, limit: PAGE_SIZE,
        search: opts.q || undefined, band: opts.band, sort: opts.sort,
      });
      setRows(res.items.map(normalize));
      setTotal(res.total);
      setPage(opts.page);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load({ page: 1, q: "", band: "all", sort: "recent" }); }, [load]);

  // Debounced search / instant filter+sort changes.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load({ page: 1, q, band, sort }), 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [q, band, sort, load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openStudent = (id: string) => { setOpenId(id); router.replace(`/dashboard/students?student=${id}`, { scroll: false }); };
  const closeStudent = () => { setOpenId(null); router.replace("/dashboard/students", { scroll: false }); };

  return (
    <div className="p-5 sm:p-6 md:p-8 space-y-6">
      <PageHeader
        eyebrow="Cohort"
        title="Students"
        subtitle={`${total} students · readiness tracked from mock interviews`}
        actions={
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button variant="secondary" size="sm" className="shrink-0" icon={<Megaphone size={13} />} onClick={() => setAnnounce(true)}>Announce</Button>
            <div className="relative flex-1 sm:w-64 sm:flex-none">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--th-text-faint)" }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, branch…"
                className="pl-9 pr-3 py-2 rounded-lg border text-xs w-full"
                style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {BANDS.map((b) => (
          <button key={b.id} onClick={() => setBand(b.id)}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors"
            style={{
              backgroundColor: band === b.id ? "var(--th-primary)" : "transparent",
              color: band === b.id ? "#fff" : "var(--th-text-secondary)",
              borderColor: band === b.id ? "var(--th-primary)" : "var(--th-border)",
            }}>
            {b.label}
          </button>
        ))}
        <select value={sort} onChange={(e) => setSort(e.target.value)}
          className="ml-auto px-2 py-1 rounded-lg border text-[11px] font-semibold"
          style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-secondary)" }}>
          {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
          <AlertCircle size={16} className="text-amber-500" /> {error}
          <button onClick={() => load({ page, q, band, sort })} className="ml-auto text-blue-600 dark:text-blue-400 text-xs">Retry</button>
        </div>
      )}

      <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
        <div className="min-w-[600px]">
        <div className="grid grid-cols-[2fr_1fr_1fr_0.8fr_1fr] px-6 py-3 text-[10px] font-bold uppercase tracking-wider border-b" style={{ borderColor: "var(--th-border)", color: "var(--th-text-faint)" }}>
          <span>Student</span><span>Branch / Year</span><span>Readiness</span><span>Mocks</span><span>Last active</span>
        </div>
        {loading ? (
          <div className="p-6 space-y-3"><SkeletonBlock height="h-8" /><SkeletonBlock height="h-8" /><SkeletonBlock height="h-8" /></div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-xs" style={{ color: "var(--th-text-faint)" }}>
            <Users size={22} className="mx-auto mb-2 opacity-40" />
            {total === 0 && !q ? "No students in your organization yet." : "No students match your filters."}
          </div>
        ) : (
          rows.map((r) => {
            const color = getGradeColor(getGradeBand(r.readiness));
            return (
              <button key={r.id} onClick={() => openStudent(r.id)}
                className="w-full grid grid-cols-[2fr_1fr_1fr_0.8fr_1fr] px-6 py-3.5 items-center border-b last:border-0 text-sm text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                style={{ borderColor: "var(--th-border)" }}>
                <div className="min-w-0">
                  <div className="font-medium truncate flex items-center gap-2" style={{ color: "var(--th-text-primary)" }}>
                    {r.name}
                    {!r.onboarded && <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "var(--th-bg-tertiary)", color: "var(--th-text-faint)" }}>not onboarded</span>}
                  </div>
                  <div className="text-[11px] font-mono truncate" style={{ color: "var(--th-text-faint)" }}>{r.email}</div>
                </div>
                <span className="text-xs" style={{ color: "var(--th-text-secondary)" }}>{r.branch ?? "—"}{r.graduationYear ? ` · ${r.graduationYear}` : ""}</span>
                <span className="font-mono font-bold text-sm" style={{ color }}>{r.readiness}</span>
                <span className="font-mono text-xs" style={{ color: "var(--th-text-muted)" }}>{r.mocks}</span>
                <span className="font-mono text-xs" style={{ color: "var(--th-text-muted)" }}>
                  {r.lastActive ? new Date(r.lastActive).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                </span>
              </button>
            );
          })
        )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => load({ page: page - 1, q, band, sort })}>Previous</Button>
          <span className="text-xs" style={{ color: "var(--th-text-faint)" }}>Page {page} of {totalPages}</span>
          <Button variant="secondary" disabled={page >= totalPages || loading} onClick={() => load({ page: page + 1, q, band, sort })}>Next</Button>
        </div>
      )}

      {openId && <StudentDrawer id={openId} onClose={closeStudent} />}
      {announce && <AnnounceModal onClose={() => setAnnounce(false)} />}
    </div>
  );
}

function AnnounceModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ title: "", message: "", sendEmail: false });
  const [sending, setSending] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return toast.error("Title and message are required");
    setSending(true);
    try {
      await collegeAdminService.sendBulkNotification({
        targetType: "students",
        title: form.title.trim(),
        message: form.message.trim(),
        sendEmail: form.sendEmail,
        priority: "normal",
      });
      toast.success("Announcement sent to all students");
      onClose();
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <form onSubmit={send} className="w-full max-w-md rounded-2xl border p-6 space-y-4 relative" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
        <button type="button" onClick={onClose} className="absolute right-4 top-4" style={{ color: "var(--th-text-faint)" }}><X size={18} /></button>
        <h3 className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>Announce to all students</h3>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Title</label>
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} maxLength={200}
            className="w-full px-3 py-2 rounded-lg border text-xs" style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Message</label>
          <textarea rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} maxLength={1000}
            className="w-full px-3 py-2 rounded-lg border text-xs resize-none" style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
        </div>
        <label className="flex items-center gap-2 text-xs" style={{ color: "var(--th-text-secondary)" }}>
          <input type="checkbox" checked={form.sendEmail} onChange={(e) => setForm((f) => ({ ...f, sendEmail: e.target.checked }))} /> Also send by email
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={sending}>Send</Button>
        </div>
      </form>
    </div>
  );
}

const SCORE_LABELS: Record<string, string> = {
  academicPerformance: "Academics", codingPerformance: "Coding", aptitudePerformance: "Aptitude",
  communicationSkills: "Communication", mockInterviewPerformance: "Mock", professionalActivities: "Prof.",
  projectsPortfolio: "Projects",
};

function StudentDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dl, setDl] = useState<"csv" | "pdf" | null>(null);
  const [action, setAction] = useState<null | "followup" | "intel">(null);
  const [nonce, setNonce] = useState(0);

  const download = async (format: "csv" | "pdf") => {
    setDl(format);
    try {
      const res = await fetch(`${API_BASE_URL}/college-admin/reports/students/${id}/download?format=${format}`, { credentials: "include" });
      if (!res.ok) throw new Error("Report export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `student-report.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setDl(null);
    }
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    collegeAdminService.studentDetails(id)
      .then((d) => { if (alive) setData(d as Record<string, unknown>); })
      .catch((err) => { if (alive) setError(toApiError(err).message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id, nonce]);

  const student = (data?.student ?? {}) as Record<string, unknown>;
  const profile = (data?.profile ?? null) as Record<string, unknown> | null;
  const batch = (data?.batch ?? null) as Record<string, unknown> | null;
  const sessions = (data?.recentSessions ?? []) as Record<string, unknown>[];
  const analytics = (data?.recentAnalytics ?? []) as Record<string, unknown>[];
  const history = (data?.scoreHistory ?? []) as Record<string, unknown>[];
  const insights = (data?.insights ?? []) as Record<string, unknown>[];

  const readiness = Math.round(Number(profile?.placementReadinessScore ?? 0));
  const band = getGradeBand(readiness);
  const bandColor = getGradeColor(band);
  const breakdown = profile?.scoreBreakdown
    ? Object.entries(SCORE_LABELS).map(([k, label]) => ({ subject: label, score: Math.round(Number((profile.scoreBreakdown as Record<string, number>)[k] ?? 0)) }))
    : [];
  const hasBreakdown = breakdown.length > 0 && breakdown.some((b) => b.score > 0);
  const trend = [...history].reverse().map((h) => ({
    date: new Date(String(h.recordedAt ?? h.createdAt)).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    score: Math.round(Number(h.overallScore ?? 0)),
  }));
  const skills = ((profile?.skills as string[]) ?? []).filter(Boolean);
  const latestScore = Math.round(Number(analytics[0]?.overallScore ?? 0));
  const mockCount = Number(profile?.mockHistoryCount ?? sessions.length);
  const initials = String(student.name ?? "S").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const card = "rounded-2xl border p-4";
  const cardStyle = { backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" };
  const sectionTitle = "text-[11px] font-bold uppercase tracking-wider mb-2.5";

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      icon={
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-[#0062FF] to-[#4D7CFF] text-xs font-bold text-white">
          {initials}
        </span>
      }
      title={String(student.name ?? "Student")}
      subtitle={String(student.email ?? "")}
      headerRight={
        !loading && !error ? (
          <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
            style={{ backgroundColor: bandColor + "1f", color: bandColor }}>
            {readiness}<span className="text-[10px] font-medium opacity-70">/100</span>
          </span>
        ) : undefined
      }
      footer={
        !loading && !error ? (
          <>
            <Button variant="ghost" size="sm" icon={<CalendarClock size={13} />} onClick={() => setAction(action === "followup" ? null : "followup")}>Follow-up</Button>
            <Button variant="ghost" size="sm" icon={<SlidersHorizontal size={13} />} onClick={() => setAction(action === "intel" ? null : "intel")}>Edit scores</Button>
            <Button variant="secondary" size="sm" loading={dl === "csv"} icon={<Download size={13} />} onClick={() => download("csv")}>CSV</Button>
            <Button size="sm" loading={dl === "pdf"} icon={<FileText size={13} />} onClick={() => download("pdf")}>PDF report</Button>
          </>
        ) : undefined
      }
    >
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">{[0, 1, 2].map((i) => <SkeletonBlock key={i} height="h-16" className="rounded-xl" />)}</div>
          <SkeletonBlock height="h-20" className="rounded-2xl" />
          <SkeletonBlock height="h-48" className="rounded-2xl" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 py-6 text-sm" style={{ color: "var(--th-text-secondary)" }}>
          <AlertCircle size={16} className="text-amber-500" /> {error}
        </div>
      ) : (
        <div className="space-y-5">
          {action === "followup" && (
            <FollowUpPanel studentId={id} studentName={String(student.name ?? "student")} onClose={() => setAction(null)} />
          )}
          {action === "intel" && (
            <IntelPanel studentId={id} profile={profile} onClose={() => setAction(null)} onSaved={() => { setAction(null); setNonce((n) => n + 1); }} />
          )}

          {/* Stat tiles */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Readiness", value: readiness, color: bandColor, suffix: "/100" },
              { label: "Mock interviews", value: mockCount },
              { label: "Latest score", value: latestScore || "—", suffix: latestScore ? `· ${String(analytics[0]?.finalGrade ?? "")}` : "" },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border p-3.5" style={cardStyle}>
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--th-text-faint)" }}>{k.label}</p>
                <p className="mt-1.5 text-xl font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: k.color ?? "var(--th-text-primary)" }}>
                  {k.value}
                  {k.suffix && <span className="ml-1 text-[11px] font-medium" style={{ color: "var(--th-text-faint)" }}>{k.suffix}</span>}
                </p>
              </div>
            ))}
          </div>

          {/* About */}
          <div className={card} style={cardStyle}>
            <p className={sectionTitle} style={{ color: "var(--th-text-faint)" }}>Profile</p>
            <div className="grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
              <Row icon={<GraduationCap size={13} />} label="Branch / year" value={`${String(profile?.branch ?? "—")}${profile?.graduationYear ? ` · ${profile.graduationYear}` : ""}`} />
              <Row icon={<Layers size={13} />} label="Batch" value={batch ? `${batch.batchName}${batch.department ? ` · ${batch.department}` : ""}` : "Not assigned"} />
            </div>
            <div className="mt-3">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--th-text-faint)" }}>Skills</p>
              {skills.length === 0 ? (
                <span className="text-xs" style={{ color: "var(--th-text-faint)" }}>None listed</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {skills.slice(0, 14).map((s) => (
                    <span key={s} className="rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: "var(--th-border)", color: "var(--th-text-secondary)" }}>{s}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Charts */}
          {(hasBreakdown || trend.length >= 2) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {hasBreakdown && (
                <div className={card} style={cardStyle}>
                  <p className={sectionTitle} style={{ color: "var(--th-text-primary)" }}>Readiness breakdown</p>
                  <ResponsiveContainer width="100%" height={210}>
                    <RadarChart data={breakdown}>
                      <PolarGrid stroke="var(--th-border)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "var(--th-text-muted)" }} />
                      <Radar dataKey="score" stroke="#0062FF" fill="#0062FF" fillOpacity={0.22} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {trend.length >= 2 && (
                <div className={card} style={cardStyle}>
                  <p className={`${sectionTitle} flex items-center gap-1.5`} style={{ color: "var(--th-text-primary)" }}>
                    <TrendingUp size={12} /> Readiness history
                  </p>
                  <ResponsiveContainer width="100%" height={210}>
                    <AreaChart data={trend} margin={{ left: -18, top: 6 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)", borderRadius: 10, fontSize: 11 }} />
                      <Area dataKey="score" stroke="#0062FF" fill="#0062FF" fillOpacity={0.15} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Recent interviews */}
          <div>
            <p className={sectionTitle} style={{ color: "var(--th-text-primary)" }}>Recent interviews</p>
            {sessions.length === 0 ? (
              <p className="rounded-xl border px-3 py-4 text-center text-xs" style={{ borderColor: "var(--th-card-border)", color: "var(--th-text-faint)" }}>No mock interviews yet.</p>
            ) : (
              <div className="divide-y overflow-hidden rounded-xl border" style={{ borderColor: "var(--th-card-border)" }}>
                {sessions.slice(0, 8).map((s, i) => (
                  <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 text-xs" style={{ borderColor: "var(--th-border)" }}>
                    <span className="flex-1 truncate font-medium" style={{ color: "var(--th-text-primary)" }}>{String(s.targetRole ?? "Mock interview")}</span>
                    <span className="shrink-0 font-mono text-[10px]" style={{ color: "var(--th-text-faint)" }}>
                      {s.startedAt ? new Date(String(s.startedAt)).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                    </span>
                    {s.status === "completed"
                      ? <Badge variant="verdant">{Math.round(Number(s.finalCompositeScore ?? 0))}%{s.finalGrade ? ` · ${String(s.finalGrade)}` : ""}</Badge>
                      : <Badge variant="neutral">{String(s.status ?? "—")}</Badge>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI summary */}
          {Boolean(insights[0]?.narrativeSummary) && (
            <div className="rounded-2xl border p-4" style={{ backgroundColor: "color-mix(in srgb, var(--th-primary) 5%, transparent)", borderColor: "color-mix(in srgb, var(--th-primary) 20%, transparent)" }}>
              <p className={`${sectionTitle} flex items-center gap-1.5`} style={{ color: "var(--th-text-primary)" }}>
                <Sparkles size={12} className="text-blue-500" /> Latest AI summary
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>{String(insights[0].narrativeSummary)}</p>
              {((insights[0].weaknesses as string[]) ?? []).length > 0 && (
                <p className="mt-2 flex items-start gap-1.5 text-[11px]" style={{ color: "var(--th-text-muted)" }}>
                  <ShieldAlert size={12} className="mt-0.5 shrink-0 text-amber-500" />
                  {((insights[0].weaknesses as string[]) ?? []).slice(0, 4).join(" · ")}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0" style={{ color: "var(--th-text-faint)" }}>{icon}</span>
      <span className="shrink-0" style={{ color: "var(--th-text-faint)" }}>{label}</span>
      <span className="min-w-0 truncate font-medium" style={{ color: "var(--th-text-primary)" }}>{value}</span>
    </div>
  );
}

const FOLLOWUP_TYPES = [
  { value: "performance_alert", label: "Performance alert" },
  { value: "deadline_reminder", label: "Deadline reminder" },
  { value: "follow_up_pending", label: "General follow-up" },
  { value: "recommendation_assigned", label: "Recommendation assigned" },
];

function FollowUpPanel({ studentId, studentName, onClose }: { studentId: string; studentName: string; onClose: () => void }) {
  const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
  const [form, setForm] = useState({ followUpType: "performance_alert", scheduleDate: tomorrow, title: "", message: "", email: true });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return toast.error("Title and message are required");
    setSaving(true);
    try {
      await collegeAdminService.createFollowUp({
        targetType: "student",
        studentId,
        followUpType: form.followUpType,
        scheduleDate: new Date(form.scheduleDate).toISOString(),
        title: form.title.trim(),
        message: form.message.trim(),
        channels: { inApp: true, email: form.email },
        recipientRole: "student",
      });
      toast.success("Follow-up scheduled");
      onClose();
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ backgroundColor: "color-mix(in srgb, var(--th-primary) 6%, transparent)", borderColor: "color-mix(in srgb, var(--th-primary) 35%, transparent)" }}>
      <p className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "var(--th-text-primary)" }}>
        <CalendarClock size={13} className="text-blue-500" /> Schedule follow-up · {studentName}
      </p>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Type</label>
            <select value={form.followUpType} onChange={(e) => setForm((f) => ({ ...f, followUpType: e.target.value }))}
              className="w-full px-2 py-1.5 rounded-lg border text-xs" style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }}>
              {FOLLOWUP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Send on</label>
            <input type="date" value={form.scheduleDate} min={tomorrow} onChange={(e) => setForm((f) => ({ ...f, scheduleDate: e.target.value }))}
              className="w-full px-2 py-1.5 rounded-lg border text-xs" style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
          </div>
        </div>
        <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Title" maxLength={200}
          className="w-full px-3 py-2 rounded-lg border text-xs" style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
        <textarea rows={3} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder="Message to the student" maxLength={1000}
          className="w-full px-3 py-2 rounded-lg border text-xs resize-none" style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
        <label className="flex items-center gap-2 text-xs" style={{ color: "var(--th-text-secondary)" }}>
          <input type="checkbox" checked={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.checked }))} /> Also email
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" loading={saving}>Schedule</Button>
        </div>
      </form>
    </div>
  );
}

const INTEL_FIELDS = [
  ["aptitudeScore", "Aptitude"],
  ["codingScore", "Coding"],
  ["techScore", "Technical"],
  ["communicationScore", "Communication"],
  ["atsScore", "Resume / ATS"],
] as const;

function IntelPanel({ studentId, profile, onClose, onSaved }: { studentId: string; profile: Record<string, unknown> | null; onClose: () => void; onSaved: () => void }) {
  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(INTEL_FIELDS.map(([k]) => [k, profile?.[k] != null ? String(profile[k]) : ""]))
  );
  const [gaps, setGaps] = useState(((profile?.skillGaps as string[]) ?? []).join(", "));
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = {};
    for (const [k] of INTEL_FIELDS) {
      if (scores[k] !== "") {
        const n = Number(scores[k]);
        if (Number.isNaN(n) || n < 0 || n > 100) return toast.error(`${k} must be 0–100`);
        body[k] = n;
      }
    }
    const gapList = gaps.split(",").map((s) => s.trim()).filter(Boolean);
    if (gapList.length) body.skillGaps = gapList;
    if (Object.keys(body).length === 0) return toast.error("Nothing to update");
    setSaving(true);
    try {
      await collegeAdminService.updateStudentIntelligence(studentId, body);
      toast.success("Student profile updated");
      onSaved();
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ backgroundColor: "color-mix(in srgb, var(--th-primary) 6%, transparent)", borderColor: "color-mix(in srgb, var(--th-primary) 35%, transparent)" }}>
      <p className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "var(--th-text-primary)" }}>
        <SlidersHorizontal size={13} className="text-blue-500" /> Manual score overrides
      </p>
      <p className="text-[10px]" style={{ color: "var(--th-text-faint)" }}>For offline assessments the platform can&apos;t see. Feeds the readiness score.</p>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {INTEL_FIELDS.map(([k, label]) => (
            <div key={k} className="space-y-1">
              <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>{label}</label>
              <input type="number" min={0} max={100} value={scores[k]} onChange={(e) => setScores((s) => ({ ...s, [k]: e.target.value }))}
                className="w-full px-2 py-1.5 rounded-lg border text-xs" style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Skill gaps (comma-separated)</label>
          <input value={gaps} onChange={(e) => setGaps(e.target.value)} placeholder="DSA, System design, Communication"
            className="w-full px-3 py-2 rounded-lg border text-xs" style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" loading={saving}>Save</Button>
        </div>
      </form>
    </div>
  );
}

export default function OfficerStudentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs" style={{ color: "var(--th-text-faint)" }}>Loading…</div>}>
      <StudentsInner />
    </Suspense>
  );
}
