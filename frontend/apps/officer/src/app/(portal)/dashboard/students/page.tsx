"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { collegeAdminService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { getGradeBand, getGradeColor } from "@synclyft/lib/utils";
import { Badge } from "@synclyft/ui/components/Badge";
import { Button } from "@synclyft/ui/components/Button";
import { SkeletonBlock } from "@synclyft/ui/components/SkeletonBlock";
import { Search, AlertCircle, Users, X, Loader2, TrendingUp, ShieldAlert, Megaphone } from "lucide-react";
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
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>Students</h1>
          <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>{total} students · readiness tracked from mock interviews</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Megaphone size={13} />} onClick={() => setAnnounce(true)}>Announce</Button>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--th-text-faint)" }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, branch…"
              className="pl-9 pr-3 py-2 rounded-lg border text-xs w-64"
              style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
          </div>
        </div>
      </div>

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

  useEffect(() => {
    let alive = true;
    setLoading(true);
    collegeAdminService.studentDetails(id)
      .then((d) => { if (alive) setData(d as Record<string, unknown>); })
      .catch((err) => { if (alive) setError(toApiError(err).message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  const student = (data?.student ?? {}) as Record<string, unknown>;
  const profile = (data?.profile ?? null) as Record<string, unknown> | null;
  const batch = (data?.batch ?? null) as Record<string, unknown> | null;
  const sessions = (data?.recentSessions ?? []) as Record<string, unknown>[];
  const analytics = (data?.recentAnalytics ?? []) as Record<string, unknown>[];
  const history = (data?.scoreHistory ?? []) as Record<string, unknown>[];
  const insights = (data?.insights ?? []) as Record<string, unknown>[];

  const readiness = Math.round(Number(profile?.placementReadinessScore ?? 0));
  const breakdown = profile?.scoreBreakdown
    ? Object.entries(SCORE_LABELS).map(([k, label]) => ({ subject: label, score: Math.round(Number((profile.scoreBreakdown as Record<string, number>)[k] ?? 0)) }))
    : [];
  const trend = [...history].reverse().map((h) => ({
    date: new Date(String(h.recordedAt ?? h.createdAt)).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    score: Math.round(Number(h.overallScore ?? 0)),
  }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-xl h-full overflow-y-auto shadow-2xl" style={{ backgroundColor: "var(--th-bg)" }}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-bg)" }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>{String(student.name ?? "Student")}</h2>
            <p className="text-[11px] font-mono" style={{ color: "var(--th-text-faint)" }}>{String(student.email ?? "")}</p>
          </div>
          <button onClick={onClose} style={{ color: "var(--th-text-faint)" }}><X size={18} /></button>
        </div>

        {loading ? (
          <div className="p-6"><Loader2 size={20} className="animate-spin" style={{ color: "var(--th-primary)" }} /></div>
        ) : error ? (
          <div className="p-6 text-sm" style={{ color: "var(--th-text-secondary)" }}><AlertCircle size={16} className="inline mr-2 text-amber-500" />{error}</div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Readiness", value: readiness },
                { label: "Mock interviews", value: Number(profile?.mockHistoryCount ?? sessions.length) },
                { label: "Latest score", value: Math.round(Number(analytics[0]?.overallScore ?? 0)) || "—" },
              ].map((k) => (
                <div key={k.label} className="rounded-xl border p-3" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                  <p className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>{k.label}</p>
                  <p className="mt-1 text-lg font-bold" style={{ color: "var(--th-text-primary)" }}>{k.value}</p>
                </div>
              ))}
            </div>

            <div className="text-xs space-y-1" style={{ color: "var(--th-text-secondary)" }}>
              <p><span style={{ color: "var(--th-text-faint)" }}>Branch:</span> {String(profile?.branch ?? "—")}{profile?.graduationYear ? ` · ${profile.graduationYear}` : ""}</p>
              <p><span style={{ color: "var(--th-text-faint)" }}>Batch:</span> {batch ? `${batch.batchName} (${batch.department ?? "—"})` : "Not assigned"}</p>
              <p><span style={{ color: "var(--th-text-faint)" }}>Skills:</span> {((profile?.skills as string[]) ?? []).slice(0, 8).join(", ") || "—"}</p>
            </div>

            {breakdown.length > 0 && breakdown.some((b) => b.score > 0) && (
              <div className="rounded-2xl border p-4" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                <p className="text-xs font-bold mb-2" style={{ color: "var(--th-text-primary)" }}>Readiness breakdown</p>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={breakdown}>
                    <PolarGrid stroke="var(--th-border)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "var(--th-text-muted)" }} />
                    <Radar dataKey="score" stroke="#0062FF" fill="#0062FF" fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            {trend.length >= 2 && (
              <div className="rounded-2xl border p-4" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: "var(--th-text-primary)" }}><TrendingUp size={12} /> Score history</p>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={trend} margin={{ left: -20, top: 4 }}>
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)", borderRadius: 8, fontSize: 11 }} />
                    <Area dataKey="score" stroke="#0062FF" fill="#0062FF" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <div>
              <p className="text-xs font-bold mb-2" style={{ color: "var(--th-text-primary)" }}>Recent interviews</p>
              {sessions.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>No interviews yet.</p>
              ) : (
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--th-card-border)" }}>
                  {sessions.slice(0, 6).map((s, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 border-b last:border-0 text-xs" style={{ borderColor: "var(--th-border)" }}>
                      <span className="flex-1 truncate" style={{ color: "var(--th-text-secondary)" }}>{String(s.targetRole ?? "Mock interview")}</span>
                      <span style={{ color: "var(--th-text-faint)" }}>{s.startedAt ? new Date(String(s.startedAt)).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}</span>
                      {s.status === "completed"
                        ? <Badge variant="verdant">{Math.round(Number(s.finalCompositeScore ?? 0))}% · {String(s.finalGrade ?? "")}</Badge>
                        : <Badge variant="neutral">{String(s.status ?? "")}</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {Boolean(insights[0]?.narrativeSummary) && (
              <div className="rounded-2xl border p-4 space-y-2" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                <p className="text-xs font-bold" style={{ color: "var(--th-text-primary)" }}>Latest AI summary</p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>{String(insights[0].narrativeSummary)}</p>
                {((insights[0].weaknesses as string[]) ?? []).length > 0 && (
                  <p className="text-[11px] flex items-start gap-1.5" style={{ color: "var(--th-text-muted)" }}>
                    <ShieldAlert size={12} className="mt-0.5 shrink-0 text-amber-500" />
                    {((insights[0].weaknesses as string[]) ?? []).slice(0, 3).join(" · ")}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
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
