"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { collegeAdminService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { Button } from "@synclyft/ui/components/Button";
import { Badge } from "@synclyft/ui/components/Badge";
import { SkeletonBlock } from "@synclyft/ui/components/SkeletonBlock";
import Link from "next/link";
import { Plus, Layers, X, AlertCircle, Users, Archive, ArchiveRestore, Trash2, Search, Check, Loader2, Lock } from "lucide-react";
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
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>Batches</h1>
          <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>Group students by department and graduation year, then run campaigns against them</p>
        </div>
        <Button icon={<Plus size={14} />} onClick={() => setModal(true)}>New batch</Button>
      </div>

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
    </div>
  );
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
