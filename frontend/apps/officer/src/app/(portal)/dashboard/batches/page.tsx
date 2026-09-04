"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { collegeAdminService } from "@synclyft/lib/api/services";
import { API_BASE_URL, toApiError } from "@synclyft/lib/api";
import { Button } from "@synclyft/ui/components/Button";
import { Badge } from "@synclyft/ui/components/Badge";
import { SkeletonBlock } from "@synclyft/ui/components/SkeletonBlock";
import { getGradeBand, getGradeColor } from "@synclyft/lib/utils";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@synclyft/ui/components/Modal";
import { Plus, Layers, X, AlertCircle, Users, Archive, ArchiveRestore, Trash2, Search, Check, Loader2, Lock, BarChart3, Download, GitCompareArrows, Sparkles, CornerDownRight, RefreshCw, FileText, Trophy } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, Legend, CartesianGrid,
} from "recharts";
import toast from "react-hot-toast";

interface BatchStudent { student?: { _id?: string; name?: string; email?: string } | string; status?: string }
interface Batch {
  _id: string;
  batchName: string;
  batchCode?: string;
  academicYear?: string;
  graduationYear?: number;
  department?: string;
  section?: string;
  description?: string;
  status?: string;
  students?: BatchStudent[];
}

const EMPTY = { batchName: "", academicYear: "", graduationYear: "", department: "", section: "", description: "" };

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [roster, setRoster] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [manageId, setManageId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, students] = await Promise.all([
        collegeAdminService.batches({ limit: 100 }),
        collegeAdminService.students({ limit: 500 }).catch(() => ({ items: [] as Record<string, unknown>[] })),
      ]);
      setBatches(list as unknown as Batch[]);
      setRoster(
        students.items.map((p) => {
          const u = (p.user ?? {}) as Record<string, unknown>;
          return { id: String(u._id ?? p._id ?? ""), name: String(u.name ?? "—"), email: String(u.email ?? "") };
        })
      );
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.batchName || !form.academicYear || !form.graduationYear || !form.department) {
      return toast.error("Name, academic year, graduation year and department are required");
    }
    setSaving(true);
    try {
      await collegeAdminService.createBatch({
        batchName: form.batchName,
        academicYear: form.academicYear,
        graduationYear: Number(form.graduationYear),
        department: form.department,
        section: form.section || undefined,
        description: form.description || undefined,
      });
      toast.success("Batch created");
      setModal(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const act = async (id: string, fn: () => Promise<unknown>, msg: string) => {
    setBusy(id);
    try { await fn(); toast.success(msg); load(); }
    catch (err) { toast.error(toApiError(err).message); }
    finally { setBusy(null); }
  };

  const manageBatch = batches.find((b) => b._id === manageId) ?? null;

  return (
    <div className="p-5 sm:p-6 md:p-8 space-y-6">
      <PageHeader
        eyebrow="Cohort"
        title="Batches"
        subtitle="Group students by department and graduation year, then run campaigns against them"
        actions={
          <>
            <Button variant="secondary" icon={<GitCompareArrows size={14} />} onClick={() => setCompareOpen(true)}
              disabled={batches.filter((b) => b.status !== "archived").length < 2}>
              Compare
            </Button>
            <Button icon={<Plus size={14} />} onClick={() => setModal(true)}>New batch</Button>
          </>
        }
      />

      {error && /subscription|plan/i.test(error) ? (
        <div className="rounded-2xl border p-6 text-center" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
          <Lock size={22} className="mx-auto mb-2" style={{ color: "var(--th-text-faint)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--th-text-primary)" }}>Batch management needs an active plan</p>
          <p className="text-xs mt-1 mb-4" style={{ color: "var(--th-text-faint)" }}>{error}</p>
          <Link href="/dashboard/billing"><Button>View plans</Button></Link>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
          <AlertCircle size={16} className="text-amber-500" /> {error}
          <button onClick={load} className="ml-auto text-blue-600 dark:text-blue-400 text-xs">Retry</button>
        </div>
      ) : null}

      {error && /subscription|plan/i.test(error) ? null : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><SkeletonBlock height="h-36" /><SkeletonBlock height="h-36" /><SkeletonBlock height="h-36" /></div>
      ) : batches.length === 0 ? (
        <div className="rounded-2xl border p-12 text-center" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
          <Layers size={24} className="mx-auto mb-2" style={{ color: "var(--th-text-faint)" }} />
          <p className="text-sm" style={{ color: "var(--th-text-secondary)" }}>No batches yet</p>
          <Button variant="secondary" className="mt-3" onClick={() => setModal(true)}>Create your first batch</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((b) => {
            const activeCount = (b.students ?? []).filter((s) => (s.status ?? "active") === "active").length;
            return (
              <div key={b._id} className="rounded-2xl border p-5 flex flex-col" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "var(--th-text-primary)" }}>{b.batchName}</p>
                    <p className="text-[11px]" style={{ color: "var(--th-text-faint)" }}>{b.department}{b.section ? ` · ${b.section}` : ""} · {b.graduationYear}</p>
                  </div>
                  {b.status === "archived" && <Badge variant="neutral">Archived</Badge>}
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: "var(--th-text-muted)" }}>
                  <Users size={12} /> {activeCount} student{activeCount === 1 ? "" : "s"}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {b.status !== "archived" && (
                    <button disabled={busy === b._id} onClick={() => setManageId(b._id)}
                      className="text-[11px] px-2 py-1 rounded border font-semibold disabled:opacity-50" style={{ borderColor: "var(--th-primary)", color: "var(--th-primary)" }}>
                      Manage students
                    </button>
                  )}
                  <button onClick={() => setReportId(b._id)}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded border" style={{ borderColor: "var(--th-border)", color: "var(--th-text-secondary)" }}>
                    <BarChart3 size={11} /> Report
                  </button>
                  {b.status !== "archived" ? (
                    <button disabled={busy === b._id} onClick={() => act(b._id, () => collegeAdminService.archiveBatch(b._id), "Batch archived")}
                      className="flex items-center gap-1 text-[11px] px-2 py-1 rounded border disabled:opacity-50" style={{ borderColor: "var(--th-border)", color: "var(--th-text-secondary)" }}>
                      <Archive size={11} /> Archive
                    </button>
                  ) : (
                    <button disabled={busy === b._id} onClick={() => act(b._id, () => collegeAdminService.updateBatch(b._id, { status: "active" }), "Batch restored")}
                      className="flex items-center gap-1 text-[11px] px-2 py-1 rounded border disabled:opacity-50" style={{ borderColor: "var(--th-border)", color: "var(--th-text-secondary)" }}>
                      <ArchiveRestore size={11} /> Restore
                    </button>
                  )}
                  <button disabled={busy === b._id} onClick={() => { if (confirm("Delete this batch permanently?")) act(b._id, () => collegeAdminService.deleteBatch(b._id), "Batch deleted"); }}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-rose-500/20 text-rose-600 dark:text-rose-400 disabled:opacity-50">
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form onSubmit={create} className="w-full max-w-md rounded-2xl border p-6 space-y-4 relative"
            style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
            <button type="button" onClick={() => setModal(false)} className="absolute right-4 top-4" style={{ color: "var(--th-text-faint)" }}><X size={18} /></button>
            <h3 className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>New batch</h3>
            {([
              ["batchName", "Batch name", "text"],
              ["academicYear", "Academic year (e.g. 2024-25)", "text"],
              ["graduationYear", "Graduation year", "number"],
              ["department", "Department", "text"],
              ["section", "Section (optional)", "text"],
            ] as const).map(([k, label, type]) => (
              <div key={k} className="space-y-1">
                <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>{label}</label>
                <input type={type} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-xs"
                  style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
              </div>
            ))}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Description (optional)</label>
              <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border text-xs resize-none"
                style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
              <Button type="submit" loading={saving}>Create</Button>
            </div>
          </form>
        </div>
      )}

      {manageBatch && (
        <ManageStudentsModal batch={manageBatch} roster={roster} onClose={() => setManageId(null)} onChanged={load} />
      )}
      {reportId && (
        <BatchReportDrawer
          batchId={reportId}
          batchName={batches.find((b) => b._id === reportId)?.batchName ?? "Batch"}
          onClose={() => setReportId(null)}
        />
      )}
      {compareOpen && (
        <CompareBatchesModal
          batches={batches.filter((b) => b.status !== "archived").map((b) => ({ _id: b._id, batchName: b.batchName, department: b.department, graduationYear: b.graduationYear }))}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </div>
  );
}

const METRIC_LABELS: Record<string, string> = {
  averageReadinessScore: "Avg readiness",
  averageInterviewScore: "Avg interview",
  averageRiskScore: "Avg risk",
  totalSessions: "Sessions",
  completedSessions: "Completed",
};

function CompareBatchesModal({
  batches, onClose,
}: { batches: { _id: string; batchName: string; department?: string; graduationYear?: number }[]; onClose: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [ai, setAi] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const run = async () => {
    if (selected.size < 2) return toast.error("Pick at least two batches");
    setLoading(true);
    setError(null);
    setData(null);
    setAi(null);
    try {
      setData(await collegeAdminService.compareBatches({ batchIds: [...selected] }) as Record<string, unknown>);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const runAi = async () => {
    setAiLoading(true);
    try {
      setAi(await collegeAdminService.aiComparativeReport({ batchIds: [...selected] }) as Record<string, unknown>);
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setAiLoading(false);
    }
  };

  const rows = (data?.batches ?? []) as Record<string, unknown>[];
  const insight = data?.comparisonInsight as Record<string, unknown> | undefined;
  const chartData = rows.map((r) => {
    const m = (r.metrics ?? {}) as Record<string, number>;
    return {
      name: String(r.batchName ?? "").slice(0, 14),
      readiness: Math.round(m.averageReadinessScore ?? 0),
      interview: Math.round(m.averageInterviewScore ?? 0),
      risk: Math.round(m.averageRiskScore ?? 0),
    };
  });
  const weakAreas = (ai?.weakestSkillAreas ?? []) as { area: string; averageScore: number }[];
  const aiRecs = (ai?.recommendations ?? []) as { priority?: string; title?: string; description?: string; action?: string }[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border p-6 relative max-h-[88vh] overflow-y-auto" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
        <button onClick={onClose} className="absolute right-4 top-4" style={{ color: "var(--th-text-faint)" }}><X size={18} /></button>
        <h3 className="text-sm font-bold mb-1" style={{ color: "var(--th-text-primary)" }}>Compare batches</h3>
        <p className="text-xs mb-4" style={{ color: "var(--th-text-faint)" }}>Select two or more batches to benchmark readiness, interview scores and integrity risk.</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {batches.map((b) => {
            const on = selected.has(b._id);
            return (
              <button key={b._id} onClick={() => toggle(b._id)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                style={{
                  backgroundColor: on ? "var(--th-primary)" : "transparent",
                  color: on ? "#fff" : "var(--th-text-secondary)",
                  borderColor: on ? "var(--th-primary)" : "var(--th-border)",
                }}>
                {b.batchName}{b.graduationYear ? ` · ${b.graduationYear}` : ""}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 mb-5">
          <Button size="sm" loading={loading} onClick={run} disabled={selected.size < 2}>Compare</Button>
          {data && <Button size="sm" variant="secondary" loading={aiLoading} icon={<Sparkles size={12} />} onClick={runAi}>AI report</Button>}
        </div>

        {error && <p className="text-xs mb-4" style={{ color: "var(--th-text-secondary)" }}><AlertCircle size={14} className="inline mr-1 text-amber-500" />{error}</p>}

        {rows.length > 0 && (
          <div className="space-y-5">
            <div className="rounded-xl border p-4" style={{ borderColor: "var(--th-card-border)" }}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--th-border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--th-text-faint)" }} axisLine={false} tickLine={false} />
                  <RTooltip contentStyle={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)", borderRadius: 10, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="readiness" name="Readiness" fill="#0062FF" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="interview" name="Interview" fill="#3DDC84" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="risk" name="Risk" fill="#FF5C5C" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border overflow-x-auto" style={{ borderColor: "var(--th-card-border)" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ color: "var(--th-text-faint)" }}>
                    <th className="text-left px-4 py-2 font-bold">Batch</th>
                    <th className="text-right px-3 py-2 font-bold">Students</th>
                    {Object.values(METRIC_LABELS).map((l) => <th key={l} className="text-right px-3 py-2 font-bold whitespace-nowrap">{l}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const m = (r.metrics ?? {}) as Record<string, number>;
                    return (
                      <tr key={i} className="border-t" style={{ borderColor: "var(--th-border)", color: "var(--th-text-secondary)" }}>
                        <td className="px-4 py-2 truncate" style={{ color: "var(--th-text-primary)" }}>{String(r.batchName ?? "")}</td>
                        <td className="px-3 py-2 text-right font-mono">{String(r.studentCount ?? 0)}</td>
                        {Object.keys(METRIC_LABELS).map((k) => <td key={k} className="px-3 py-2 text-right font-mono">{Math.round(m[k] ?? 0)}</td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {insight && (
              <div className="rounded-xl border p-4 text-xs space-y-1" style={{ borderColor: "var(--th-card-border)", backgroundColor: "color-mix(in srgb, var(--th-primary) 5%, transparent)" }}>
                <p style={{ color: "var(--th-text-primary)" }}>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{String(insight.highestPerformingBatch ?? "")}</span> leads at {String(insight.highestReadinessScore ?? 0)}% readiness ·{" "}
                  <span className="font-semibold text-rose-600 dark:text-rose-400">{String(insight.lowestPerformingBatch ?? "")}</span> trails at {String(insight.lowestReadinessScore ?? 0)}% (gap {String(insight.performanceGap ?? 0)})
                </p>
                <p style={{ color: "var(--th-text-secondary)" }}>{String(insight.recommendation ?? "")}</p>
              </div>
            )}

            {ai && (
              <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--th-card-border)" }}>
                <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: "var(--th-text-primary)" }}><Sparkles size={13} className="text-blue-500" /> AI comparative report</p>
                {weakAreas.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase font-bold mb-1" style={{ color: "var(--th-text-faint)" }}>Weakest skill areas</p>
                    <div className="flex flex-wrap gap-1.5">
                      {weakAreas.map((w) => (
                        <span key={w.area} className="px-2 py-0.5 rounded-full text-[10px] border" style={{ borderColor: "var(--th-border)", color: "var(--th-text-muted)" }}>
                          {w.area}: {w.averageScore}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {aiRecs.map((r, i) => (
                  <div key={i} className="text-xs">
                    <p className="font-semibold" style={{ color: "var(--th-text-primary)" }}>{r.title} {r.priority && <span className="text-[9px] uppercase ml-1" style={{ color: "var(--th-text-faint)" }}>{r.priority}</span>}</p>
                    <p style={{ color: "var(--th-text-secondary)" }}>{r.description}</p>
                    {r.action && (
                      <p className="text-[11px] mt-0.5 flex items-start gap-1" style={{ color: "var(--th-text-muted)" }}>
                        <CornerDownRight size={11} className="mt-0.5 shrink-0" /> {r.action}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BatchReportDrawer({ batchId, batchName, onClose }: { batchId: string; batchName: string; onClose: () => void }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dl, setDl] = useState<"csv" | "pdf" | null>(null);
  const [recalc, setRecalc] = useState(false);
  const [nonce, setNonce] = useState(0);

  const recalculate = async () => {
    setRecalc(true);
    try {
      const res = await collegeAdminService.recalculateScores(batchId);
      toast.success(res?.message ?? "Readiness scores recalculated");
      setNonce((n) => n + 1);
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setRecalc(false);
    }
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    collegeAdminService.batchReportDashboard(batchId)
      .then((d) => { if (alive) setData(d as Record<string, unknown>); })
      .catch((err) => { if (alive) setError(toApiError(err).message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [batchId, nonce]);

  const download = async (format: "csv" | "pdf") => {
    setDl(format);
    try {
      const res = await fetch(`${API_BASE_URL}/college-admin/reports/batches/${batchId}/download?format=${format}`, { credentials: "include" });
      if (!res.ok) throw new Error("Report export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `batch-report.${format}`;
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

  const summary = (data?.entity as Record<string, unknown>)?.summary as Record<string, number> | undefined;
  const top = (data?.topStudents ?? []) as Record<string, unknown>[];
  const risk = (data?.atRiskStudents ?? []) as Record<string, unknown>[];
  const students = Number(summary?.activeStudents ?? summary?.totalStudents ?? 0);
  const avgReadiness = Math.round(Number(summary?.averageReadinessScore ?? 0));
  const band = getGradeBand(avgReadiness);
  const bandColor = getGradeColor(band);
  const cardStyle = { backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" };
  const sectionTitle = "text-[11px] font-bold uppercase tracking-wider mb-2.5";

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      icon={<div className="rounded-xl bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400"><BarChart3 size={16} /></div>}
      title={batchName}
      subtitle="Batch performance report"
      headerRight={
        !loading && !error ? (
          <span className="hidden items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold sm:flex"
            style={{ backgroundColor: bandColor + "1f", color: bandColor }}>
            {avgReadiness}<span className="text-[10px] font-medium opacity-70">avg</span>
          </span>
        ) : undefined
      }
      footer={
        !loading && !error ? (
          <>
            <Button variant="ghost" size="sm" loading={recalc} icon={<RefreshCw size={13} />} onClick={recalculate}>Recalculate</Button>
            <Button variant="secondary" size="sm" loading={dl === "csv"} icon={<Download size={13} />} onClick={() => download("csv")}>CSV</Button>
            <Button size="sm" loading={dl === "pdf"} icon={<FileText size={13} />} onClick={() => download("pdf")}>PDF</Button>
          </>
        ) : undefined
      }
    >
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} height="h-16" className="rounded-xl" />)}</div>
          <SkeletonBlock height="h-40" className="rounded-2xl" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 py-6 text-sm" style={{ color: "var(--th-text-secondary)" }}>
          <AlertCircle size={16} className="text-amber-500" /> {error}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Students", value: students },
              { label: "Avg readiness", value: avgReadiness, color: bandColor },
              { label: "Avg interview", value: Math.round(Number(summary?.averageInterviewScore ?? 0)) },
              { label: "Avg risk", value: Math.round(Number(summary?.averageRiskScore ?? 0)), color: Number(summary?.averageRiskScore ?? 0) > 50 ? "#FF5C5C" : undefined },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border p-3.5" style={cardStyle}>
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--th-text-faint)" }}>{k.label}</p>
                <p className="mt-1.5 text-xl font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: k.color ?? "var(--th-text-primary)" }}>{k.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {[
              { title: "Top students", icon: <Trophy size={12} className="text-emerald-500" />, rows: top },
              { title: "Needs intervention", icon: <ShieldAlertMini />, rows: risk },
            ].map((sec) => (
              <div key={sec.title}>
                <p className={`${sectionTitle} flex items-center gap-1.5`} style={{ color: "var(--th-text-primary)" }}>{sec.icon} {sec.title}</p>
                {sec.rows.length === 0 ? (
                  <p className="rounded-xl border px-3 py-4 text-center text-xs" style={{ borderColor: "var(--th-card-border)", color: "var(--th-text-faint)" }}>No data yet.</p>
                ) : (
                  <div className="divide-y overflow-hidden rounded-xl border" style={{ borderColor: "var(--th-card-border)" }}>
                    {sec.rows.slice(0, 8).map((r, i) => {
                      const score = Math.round(Number(r.placementReadinessScore ?? 0));
                      const color = getGradeColor(getGradeBand(score));
                      return (
                        <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 text-xs" style={{ borderColor: "var(--th-border)" }}>
                          <span className="flex-1 truncate font-medium" style={{ color: "var(--th-text-primary)" }}>{String(r.name ?? "—")}</span>
                          <span className="shrink-0 text-[10px]" style={{ color: "var(--th-text-faint)" }}>{String(r.branch ?? "")}</span>
                          <span className="shrink-0 font-mono font-bold" style={{ color }}>{score}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

function ShieldAlertMini() {
  return <AlertCircle size={12} className="text-rose-500" />;
}

function ManageStudentsModal({
  batch, roster, onClose, onChanged,
}: {
  batch: { _id: string; batchName: string; students?: { student?: { _id?: string; name?: string; email?: string } | string; status?: string }[] };
  roster: { id: string; name: string; email: string }[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const enrolledIds = useMemo(
    () => new Set(
      (batch.students ?? [])
        .filter((s) => (s.status ?? "active") === "active")
        .map((s) => String(typeof s.student === "object" ? s.student?._id : s.student))
    ),
    [batch.students]
  );

  const available = roster.filter(
    (r) => !enrolledIds.has(r.id) && (r.name.toLowerCase().includes(q.toLowerCase()) || r.email.toLowerCase().includes(q.toLowerCase()))
  );
  const enrolled = roster.filter((r) => enrolledIds.has(r.id));

  const add = async (id: string) => {
    setBusy(true);
    try { await collegeAdminService.addStudentsToBatch(batch._id, [id]); toast.success("Added"); onChanged(); }
    catch (err) { toast.error(toApiError(err).message); }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    setBusy(true);
    try { await collegeAdminService.removeStudentsFromBatch(batch._id, [id]); toast.success("Removed"); onChanged(); }
    catch (err) { toast.error(toApiError(err).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border p-6 relative max-h-[80vh] flex flex-col" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
        <button onClick={onClose} className="absolute right-4 top-4" style={{ color: "var(--th-text-faint)" }}><X size={18} /></button>
        <h3 className="text-sm font-bold mb-1" style={{ color: "var(--th-text-primary)" }}>Manage students · {batch.batchName}</h3>
        <p className="text-xs mb-4" style={{ color: "var(--th-text-faint)" }}>{enrolled.length} enrolled · {available.length} available {busy && <Loader2 size={11} className="inline animate-spin ml-1" />}</p>

        <div className="grid md:grid-cols-2 gap-4 flex-1 min-h-0">
          <div className="flex flex-col min-h-0">
            <div className="relative mb-2">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--th-text-faint)" }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students…"
                className="w-full pl-8 pr-2 py-1.5 rounded-lg border text-xs"
                style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
            </div>
            <p className="text-[10px] uppercase font-bold mb-1.5" style={{ color: "var(--th-text-faint)" }}>Available</p>
            <div className="flex-1 overflow-y-auto rounded-lg border" style={{ borderColor: "var(--th-border)" }}>
              {available.length === 0 ? <p className="p-4 text-xs text-center" style={{ color: "var(--th-text-faint)" }}>No students</p> : available.map((r) => (
                <button key={r.id} disabled={busy} onClick={() => add(r.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 border-b last:border-0 text-left text-xs hover:bg-black/[0.02] dark:hover:bg-white/[0.02] disabled:opacity-50"
                  style={{ borderColor: "var(--th-border)" }}>
                  <Plus size={12} className="text-blue-500 shrink-0" />
                  <span className="flex-1 min-w-0 truncate" style={{ color: "var(--th-text-secondary)" }}>{r.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col min-h-0">
            <p className="text-[10px] uppercase font-bold mb-1.5 mt-[34px] md:mt-0" style={{ color: "var(--th-text-faint)" }}>Enrolled</p>
            <div className="flex-1 overflow-y-auto rounded-lg border" style={{ borderColor: "var(--th-border)" }}>
              {enrolled.length === 0 ? <p className="p-4 text-xs text-center" style={{ color: "var(--th-text-faint)" }}>No students yet</p> : enrolled.map((r) => (
                <div key={r.id} className="flex items-center gap-2 px-3 py-2 border-b last:border-0 text-xs" style={{ borderColor: "var(--th-border)" }}>
                  <Check size={12} className="text-emerald-500 shrink-0" />
                  <span className="flex-1 min-w-0 truncate" style={{ color: "var(--th-text-secondary)" }}>{r.name}</span>
                  <button disabled={busy} onClick={() => remove(r.id)} className="text-rose-500 disabled:opacity-50"><X size={12} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="secondary" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}
