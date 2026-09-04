"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, toApiError } from "@synclyft/lib/api";
import { resumeService } from "@synclyft/lib/api/services";
import { useResumeAnalyses } from "@synclyft/lib/api/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@synclyft/ui/components/Button";
import { Badge } from "@synclyft/ui/components/Badge";
import { SkeletonCard } from "@synclyft/ui/components/SkeletonBlock";
import { Modal } from "@synclyft/ui/components/Modal";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import toast from "react-hot-toast";
import {
  FileText, Calendar, Target, Trash2, Sparkles, Gauge, TrendingUp, CheckCircle2, AlertTriangle, Lightbulb, ChevronLeft, ChevronRight,
} from "lucide-react";

// ── types ─────────────────────────────────────────────────────────────────
interface AnalysisRow {
  _id: string;
  fileName?: string;
  targetRole?: string;
  experienceLevel?: string;
  atsScore?: number;
  createdAt?: string;
}
interface AnalysisDetail extends AnalysisRow {
  matchedKeywords?: string[];
  missingKeywords?: string[];
  strengths?: string[];
  weaknesses?: string[];
  summarySuggestion?: string;
  experienceImprovements?: string[];
  projectImprovements?: string[];
  certificationImprovements?: string[];
  generalTips?: string[];
  hasJobDescription?: boolean;
}
interface ResumeRow {
  _id: string;
  title: string;
  templateId?: string;
  targetRole?: string;
  experienceLevel?: string;
  updatedAt: string;
}

function scoreColor(n: number) {
  if (n >= 80) return "#3DDC84";
  if (n >= 60) return "#0062FF";
  if (n >= 40) return "#F5A623";
  return "#FF5C5C";
}

// ── page ──────────────────────────────────────────────────────────────────
export default function ResumeHistoryPage() {
  const [tab, setTab] = useState<"analyses" | "resumes">("analyses");

  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="label-caption mb-1" style={{ color: "var(--th-text-faint)" }}>Resume</p>
          <h1 className="text-[1.65rem] sm:text-[2rem] font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>Resume history</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--th-text-faint)" }}>Past AI analyses and every resume you&apos;ve saved in the builder</p>
        </div>
        <Link href="/resume"><Button icon={<Sparkles size={14} />}>New analysis</Button></Link>
      </div>

      <div className="inline-flex rounded-lg border p-0.5" style={{ borderColor: "var(--th-border)" }}>
        {([["analyses", "AI analyses"], ["resumes", "Saved resumes"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className="px-4 py-1.5 rounded text-xs font-semibold transition-colors"
            style={{ backgroundColor: tab === k ? "var(--th-primary)" : "transparent", color: tab === k ? "#fff" : "var(--th-text-secondary)" }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "analyses" ? <AnalysesTab /> : <ResumesTab />}
    </div>
  );
}

// ── AI analyses ───────────────────────────────────────────────────────────
function AnalysesTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useResumeAnalyses(page);
  const [detail, setDetail] = useState<AnalysisDetail | null>(null);

  const items = (data?.items ?? []) as unknown as AnalysisRow[];
  const totalPages = data?.totalPages ?? 1;

  const trend = [...items]
    .reverse()
    .map((a) => ({ date: a.createdAt ? new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "", score: a.atsScore ?? 0 }));

  const open = async (id: string) => {
    try {
      setDetail(await resumeService.analysis(id));
    } catch (err) {
      toast.error(toApiError(err).message);
    }
  };
  const remove = async (id: string) => {
    try {
      await resumeService.removeAnalysis(id);
      toast.success("Analysis removed");
      qc.invalidateQueries({ queryKey: ["resume", "analyses"] });
    } catch (err) {
      toast.error(toApiError(err).message);
    }
  };

  if (isLoading) return <div className="grid gap-4 md:grid-cols-2"><SkeletonCard className="h-36" /><SkeletonCard className="h-36" /></div>;

  if (items.length === 0)
    return (
      <div className="rounded-2xl border p-8 sm:p-12 text-center" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
        <Gauge size={28} className="mx-auto mb-3" style={{ color: "var(--th-text-faint)" }} />
        <p className="text-sm font-semibold" style={{ color: "var(--th-text-primary)" }}>No analyses yet</p>
        <p className="text-xs mt-1 mb-4" style={{ color: "var(--th-text-faint)" }}>Upload a resume and pick a target role — the AI scores it for ATS-readiness and lists exactly what to fix.</p>
        <Link href="/resume"><Button variant="secondary" icon={<Sparkles size={13} />}>Analyse a resume</Button></Link>
      </div>
    );

  return (
    <div className="space-y-5">
      {trend.length >= 2 && (
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: "var(--th-text-faint)" }}>
            <TrendingUp size={13} /> ATS score over time
          </p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="atsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0062FF" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0062FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--th-card-bg)", border: "1px solid var(--th-card-border)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="score" stroke="#0062FF" strokeWidth={2} fill="url(#atsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {items.map((a) => {
          const s = a.atsScore ?? 0;
          return (
            <div key={a._id} className="rounded-2xl border p-5" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--th-text-primary)" }}>{a.fileName || "Resume analysis"}</p>
                  <p className="text-[11px] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5" style={{ color: "var(--th-text-muted)" }}>
                    {a.targetRole && <span className="flex items-center gap-1"><Target size={10} /> {a.targetRole}</span>}
                    {a.createdAt && <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold leading-none" style={{ color: scoreColor(s) }}>{s}</p>
                  <p className="text-[9px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>ATS</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => open(a._id)}>View report</Button>
                <button onClick={() => remove(a._id)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors" title="Remove"><Trash2 size={13} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg border disabled:opacity-40" style={{ borderColor: "var(--th-border)", color: "var(--th-text-secondary)" }}><ChevronLeft size={15} /></button>
          <span className="text-xs" style={{ color: "var(--th-text-muted)" }}>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg border disabled:opacity-40" style={{ borderColor: "var(--th-border)", color: "var(--th-text-secondary)" }}><ChevronRight size={15} /></button>
        </div>
      )}

      <AnalysisModal analysis={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function Chips({ items, tone }: { items?: string[]; tone: "good" | "bad" }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((k) => (
        <span key={k} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${tone === "good" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"}`}>{k}</span>
      ))}
    </div>
  );
}

function List({ title, items, icon: Icon }: { title: string; items?: string[]; icon: typeof CheckCircle2 }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: "var(--th-text-faint)" }}><Icon size={12} /> {title}</h3>
      <ul className="space-y-1">
        {items.map((t, i) => <li key={i} className="text-sm leading-relaxed pl-3 relative" style={{ color: "var(--th-text-secondary)" }}><span className="absolute left-0" style={{ color: "var(--th-text-faint)" }}>·</span>{t}</li>)}
      </ul>
    </div>
  );
}

function AnalysisModal({ analysis: a, onClose }: { analysis: AnalysisDetail | null; onClose: () => void }) {
  const s = a?.atsScore ?? 0;
  return (
    <Modal
      open={!!a}
      onClose={onClose}
      size="lg"
      icon={<div className="grid h-8 w-8 place-items-center rounded-lg" style={{ backgroundColor: "color-mix(in srgb, var(--th-primary) 12%, transparent)" }}><Gauge size={15} style={{ color: "var(--th-primary)" }} /></div>}
      title={a?.fileName || "Resume analysis"}
      subtitle={a ? `${a.targetRole ? `For ${a.targetRole}` : "General"}${a.hasJobDescription ? " · matched to a JD" : ""}` : ""}
      hero={
        a ? (
          <div className="flex items-center gap-4 border-b px-5 py-4 sm:px-6" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-bg-secondary)" }}>
            <div className="relative h-16 w-16 shrink-0">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--th-border)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke={scoreColor(s)} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(s / 100) * 97.4} 97.4`} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-bold" style={{ color: scoreColor(s) }}>{s}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: "var(--th-text-primary)" }}>ATS readiness score</p>
              <p className="mt-0.5 text-xs" style={{ color: "var(--th-text-muted)" }}>
                {s >= 80 ? "Strong — minor polish only" : s >= 60 ? "Solid base, a few gaps to close" : s >= 40 ? "Needs work before you apply" : "Rework recommended"}
              </p>
            </div>
          </div>
        ) : null
      }
    >
      {a && (
        <div className="space-y-6">
          {a.summarySuggestion && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--th-text-faint)" }}>Summary rewrite</h3>
              <p className="text-sm leading-relaxed rounded-xl border p-3" style={{ color: "var(--th-text-secondary)", borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>{a.summarySuggestion}</p>
            </div>
          )}

          {(a.matchedKeywords?.length || a.missingKeywords?.length) ? (
            <div className="space-y-3">
              {a.matchedKeywords?.length ? (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--th-text-faint)" }}>Matched keywords ({a.matchedKeywords.length})</h3>
                  <Chips items={a.matchedKeywords} tone="good" />
                </div>
              ) : null}
              {a.missingKeywords?.length ? (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--th-text-faint)" }}>Missing keywords ({a.missingKeywords.length})</h3>
                  <Chips items={a.missingKeywords} tone="bad" />
                </div>
              ) : null}
            </div>
          ) : null}

          <List title="Strengths" items={a.strengths} icon={CheckCircle2} />
          <List title="Weaknesses" items={a.weaknesses} icon={AlertTriangle} />
          <List title="Experience section" items={a.experienceImprovements} icon={Lightbulb} />
          <List title="Projects section" items={a.projectImprovements} icon={Lightbulb} />
          <List title="Certifications" items={a.certificationImprovements} icon={Lightbulb} />
          <List title="General tips" items={a.generalTips} icon={Lightbulb} />
        </div>
      )}
    </Modal>
  );
}

// ── Saved resumes ─────────────────────────────────────────────────────────
function ResumesTab() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ResumeRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchHistory = async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/resume/history?page=${p}`);
      const list = res.data?.resumes ?? res.data?.data ?? [];
      setRows(Array.isArray(list) ? list : []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
    } catch (err) {
      toast.error(toApiError(err).message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(page); }, [page]);

  const del = async (id: string) => {
    try {
      await api.delete(`/resume/${id}`);
      toast.success("Resume deleted");
      fetchHistory(page);
    } catch (err) {
      toast.error(toApiError(err).message);
    }
  };

  if (loading) return <div className="grid gap-4 md:grid-cols-2"><SkeletonCard className="h-32" /><SkeletonCard className="h-32" /></div>;

  if (rows.length === 0)
    return (
      <div className="rounded-2xl border p-8 sm:p-12 text-center" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
        <FileText size={28} className="mx-auto mb-3" style={{ color: "var(--th-text-faint)" }} />
        <p className="text-sm font-semibold" style={{ color: "var(--th-text-primary)" }}>No saved resumes</p>
        <p className="text-xs mt-1 mb-4" style={{ color: "var(--th-text-faint)" }}>Build a resume in the studio and it&apos;ll be saved here.</p>
        <Link href="/tools/ats-analyzer"><Button variant="secondary">Open resume builder</Button></Link>
      </div>
    );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((r) => (
          <div key={r._id} className="rounded-2xl border p-5" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--th-text-primary)" }}>{r.title}</p>
                <p className="text-[11px] mt-0.5 flex flex-wrap items-center gap-x-2" style={{ color: "var(--th-text-muted)" }}>
                  {r.targetRole && <span>{r.targetRole}</span>}
                  {r.experienceLevel && <span>· {r.experienceLevel}</span>}
                  {r.updatedAt && <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(r.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>}
                </p>
              </div>
              <button onClick={() => del(r._id)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0" title="Delete"><Trash2 size={13} /></button>
            </div>
            <div className="mt-3">
              <Link href="/tools/ats-analyzer"><Button size="sm" variant="secondary">Open in builder</Button></Link>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg border disabled:opacity-40" style={{ borderColor: "var(--th-border)", color: "var(--th-text-secondary)" }}><ChevronLeft size={15} /></button>
          <span className="text-xs" style={{ color: "var(--th-text-muted)" }}>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg border disabled:opacity-40" style={{ borderColor: "var(--th-border)", color: "var(--th-text-secondary)" }}><ChevronRight size={15} /></button>
        </div>
      )}
    </div>
  );
}
