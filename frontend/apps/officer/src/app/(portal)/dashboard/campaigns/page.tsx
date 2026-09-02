"use client";

import { useCallback, useEffect, useState } from "react";
import { collegeAdminService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { Button } from "@synclyft/ui/components/Button";
import { Badge } from "@synclyft/ui/components/Badge";
import { SkeletonBlock } from "@synclyft/ui/components/SkeletonBlock";
import { Plus, Megaphone, X, AlertCircle, Users, BarChart3, Send, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface Campaign {
  _id: string;
  title: string;
  description?: string;
  isActive?: boolean;
  deadline?: string;
  config?: Record<string, boolean>;
  assignedBatches?: { batch: string; status?: string; studentCount?: number }[];
  createdAt?: string;
}
interface Batch { _id: string; batchName: string; department?: string; graduationYear?: number; status?: string }

const ROUNDS = [
  { key: "hasAptitude", label: "Aptitude" },
  { key: "hasCoding", label: "Coding" },
  { key: "hasTechnical", label: "Technical" },
  { key: "hasHr", label: "HR" },
];

export default function CampaignsPage() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", deadline: "" });
  const [rounds, setRounds] = useState<Record<string, boolean>>({ hasAptitude: true, hasCoding: true, hasTechnical: false, hasHr: false });
  const [assignFor, setAssignFor] = useState<Campaign | null>(null);
  const [resultsFor, setResultsFor] = useState<Campaign | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, b] = await Promise.all([
        collegeAdminService.campaigns(),
        collegeAdminService.batches({ limit: 100 }).catch(() => [] as Record<string, unknown>[]),
      ]);
      setItems(c as unknown as Campaign[]);
      setBatches((b as unknown as Batch[]).filter((x) => x.status !== "archived"));
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");
    setSaving(true);
    try {
      await collegeAdminService.createCampaign({
        title: form.title.trim(),
        description: form.description || undefined,
        deadline: form.deadline || undefined,
        config: rounds,
      });
      toast.success("Campaign created");
      setModal(false);
      setForm({ title: "", description: "", deadline: "" });
      load();
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: Campaign) => {
    try {
      await collegeAdminService.updateCampaign(c._id, { isActive: !c.isActive });
      load();
    } catch (err) {
      toast.error(toApiError(err).message);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>Campaigns</h1>
          <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>Company-style mock drives — create, assign to batches, then review results</p>
        </div>
        <Button icon={<Plus size={14} />} onClick={() => setModal(true)}>New campaign</Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
          <AlertCircle size={16} className="text-amber-500" /> {error}
          <button onClick={load} className="ml-auto text-blue-600 dark:text-blue-400 text-xs">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3"><SkeletonBlock height="h-24" /><SkeletonBlock height="h-24" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border p-12 text-center" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
          <Megaphone size={24} className="mx-auto mb-2" style={{ color: "var(--th-text-faint)" }} />
          <p className="text-sm" style={{ color: "var(--th-text-secondary)" }}>No campaigns yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const assignedCount = (c.assignedBatches ?? []).filter((a) => (a.status ?? "active") === "active").length;
            return (
              <div key={c._id} className="rounded-2xl border p-5" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm" style={{ color: "var(--th-text-primary)" }}>{c.title}</p>
                    {c.description && <p className="text-xs mt-0.5" style={{ color: "var(--th-text-faint)" }}>{c.description}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: "var(--th-text-muted)" }}>
                      {c.deadline && <span>Due {new Date(c.deadline).toLocaleDateString("en-IN")}</span>}
                      <span className="flex items-center gap-1"><Users size={11} /> {assignedCount} batch{assignedCount === 1 ? "" : "es"}</span>
                    </div>
                  </div>
                  <button onClick={() => toggleActive(c)}>
                    <Badge variant={c.isActive ? "verdant" : "neutral"}>{c.isActive ? "Active" : "Draft"}</Badge>
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {ROUNDS.filter((r) => c.config?.[r.key]).map((r) => (
                    <span key={r.key} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/5 text-blue-600 dark:text-blue-400 border border-blue-500/15">{r.label}</span>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setAssignFor(c)}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded border font-semibold" style={{ borderColor: "var(--th-primary)", color: "var(--th-primary)" }}>
                    <Send size={11} /> Assign to batches
                  </button>
                  <button onClick={() => setResultsFor(c)}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded border" style={{ borderColor: "var(--th-border)", color: "var(--th-text-secondary)" }}>
                    <BarChart3 size={11} /> Results
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
            <h3 className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>New campaign</h3>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Title</label>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border text-xs"
                style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Description</label>
              <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border text-xs resize-none"
                style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Deadline (optional)</label>
              <input type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border text-xs"
                style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Rounds</label>
              <div className="flex flex-wrap gap-2">
                {ROUNDS.map((r) => (
                  <button key={r.key} type="button"
                    onClick={() => setRounds((s) => ({ ...s, [r.key]: !s[r.key] }))}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                    style={{
                      backgroundColor: rounds[r.key] ? "var(--th-primary)" : "transparent",
                      color: rounds[r.key] ? "#fff" : "var(--th-text-secondary)",
                      borderColor: rounds[r.key] ? "var(--th-primary)" : "var(--th-border)",
                    }}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
              <Button type="submit" loading={saving}>Create</Button>
            </div>
          </form>
        </div>
      )}

      {assignFor && (
        <AssignModal campaign={assignFor} batches={batches} onClose={() => setAssignFor(null)} onDone={() => { setAssignFor(null); load(); }} />
      )}
      {resultsFor && <ResultsModal campaign={resultsFor} onClose={() => setResultsFor(null)} />}
    </div>
  );
}

function AssignModal({
  campaign, batches, onClose, onDone,
}: { campaign: Campaign; batches: Batch[]; onClose: () => void; onDone: () => void }) {
  const already = new Set((campaign.assignedBatches ?? []).filter((a) => (a.status ?? "active") === "active").map((a) => String(a.batch)));
  const [selected, setSelected] = useState<Set<string>>(new Set(already));
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (selected.size === 0) return toast.error("Select at least one batch");
    setSaving(true);
    try {
      await collegeAdminService.assignCampaignToBatches(campaign._id, [...selected]);
      toast.success("Campaign assigned");
      onDone();
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border p-6 relative" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
        <button onClick={onClose} className="absolute right-4 top-4" style={{ color: "var(--th-text-faint)" }}><X size={18} /></button>
        <h3 className="text-sm font-bold mb-1" style={{ color: "var(--th-text-primary)" }}>Assign · {campaign.title}</h3>
        <p className="text-xs mb-4" style={{ color: "var(--th-text-faint)" }}>Students in the selected batches get this campaign in their portal.</p>

        {batches.length === 0 ? (
          <p className="text-xs py-6 text-center" style={{ color: "var(--th-text-faint)" }}>Create a batch first.</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {batches.map((b) => {
              const on = selected.has(b._id);
              return (
                <button key={b._id} onClick={() => setSelected((s) => { const n = new Set(s); n.has(b._id) ? n.delete(b._id) : n.add(b._id); return n; })}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left text-xs"
                  style={{ borderColor: on ? "var(--th-primary)" : "var(--th-border)", backgroundColor: on ? "color-mix(in srgb, var(--th-primary) 8%, transparent)" : "transparent" }}>
                  <span className="w-3.5 h-3.5 rounded border flex items-center justify-center" style={{ borderColor: on ? "var(--th-primary)" : "var(--th-border-strong)", backgroundColor: on ? "var(--th-primary)" : "transparent" }}>
                    {on && <span className="text-white text-[9px]">✓</span>}
                  </span>
                  <span className="flex-1 min-w-0 truncate" style={{ color: "var(--th-text-primary)" }}>{b.batchName}</span>
                  <span style={{ color: "var(--th-text-faint)" }}>{b.department} · {b.graduationYear}</span>
                </button>
              );
            })}
          </div>
        )}

        <label className="flex items-center gap-2 mt-3 text-xs" style={{ color: "var(--th-text-secondary)" }}>
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Notify students
        </label>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={submit} disabled={batches.length === 0}>Assign</Button>
        </div>
      </div>
    </div>
  );
}

function ResultsModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    collegeAdminService.campaignResults(campaign._id)
      .then((d) => { if (alive) setData(d as Record<string, unknown>); })
      .catch((err) => { if (alive) setError(toApiError(err).message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [campaign._id]);

  const m = (data?.metrics ?? {}) as Record<string, unknown>;
  const grades = (m.gradeDistribution ?? {}) as Record<string, number>;
  const top = (data?.topPerformers ?? []) as Record<string, unknown>[];
  const low = (data?.lowPerformers ?? []) as Record<string, unknown>[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border p-6 relative max-h-[80vh] overflow-y-auto" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
        <button onClick={onClose} className="absolute right-4 top-4" style={{ color: "var(--th-text-faint)" }}><X size={18} /></button>
        <h3 className="text-sm font-bold mb-4" style={{ color: "var(--th-text-primary)" }}>Results · {campaign.title}</h3>

        {loading ? (
          <Loader2 size={20} className="animate-spin" style={{ color: "var(--th-primary)" }} />
        ) : error ? (
          <p className="text-sm" style={{ color: "var(--th-text-secondary)" }}><AlertCircle size={16} className="inline mr-2 text-amber-500" />{error}</p>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Sessions", value: Number(m.totalSessions ?? 0) },
                { label: "Completed", value: Number(m.completedSessions ?? 0) },
                { label: "Avg score", value: Number(m.averageScore ?? 0) },
              ].map((k) => (
                <div key={k.label} className="rounded-xl border p-3" style={{ borderColor: "var(--th-card-border)" }}>
                  <p className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>{k.label}</p>
                  <p className="mt-1 text-lg font-bold" style={{ color: "var(--th-text-primary)" }}>{k.value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 text-[11px]" style={{ color: "var(--th-text-muted)" }}>
              {Object.entries(grades).filter(([, v]) => v > 0).map(([g, v]) => (
                <span key={g} className="px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--th-border)" }}>{g}: {v}</span>
              ))}
            </div>

            {top.length === 0 && low.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>No completed sessions in this campaign yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase font-bold mb-1.5" style={{ color: "var(--th-text-faint)" }}>Top performers</p>
                  {top.map((s, i) => {
                    const st = (s.student ?? {}) as Record<string, unknown>;
                    return <div key={i} className="text-xs flex justify-between py-1" style={{ color: "var(--th-text-secondary)" }}><span className="truncate">{String(st.name ?? "—")}</span><span className="font-mono">{Math.round(Number(s.overallScore ?? 0))}</span></div>;
                  })}
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold mb-1.5" style={{ color: "var(--th-text-faint)" }}>Needs support</p>
                  {low.map((s, i) => {
                    const st = (s.student ?? {}) as Record<string, unknown>;
                    return <div key={i} className="text-xs flex justify-between py-1" style={{ color: "var(--th-text-secondary)" }}><span className="truncate">{String(st.name ?? "—")}</span><span className="font-mono">{Math.round(Number(s.overallScore ?? 0))}</span></div>;
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
