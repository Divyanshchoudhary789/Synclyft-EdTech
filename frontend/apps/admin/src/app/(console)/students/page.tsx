"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { superAdminService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { getGradeBand, getGradeColor } from "@synclyft/lib/utils";
import { Badge } from "@synclyft/ui/components/Badge";
import { Button } from "@synclyft/ui/components/Button";
import { SkeletonBlock } from "@synclyft/ui/components/SkeletonBlock";
import { Search, AlertCircle, GraduationCap, Ban, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/PageHeader";

interface Student {
  _id: string;
  name: string;
  email: string;
  organization?: string;
  status?: string;
  branch?: string | null;
  graduationYear?: number | null;
  placementReadinessScore?: number;
  mockHistoryCount?: number;
  createdAt?: string;
}

const STATUS: Record<string, "verdant" | "amber" | "coral" | "neutral"> = {
  Approved: "verdant", Pending: "amber", Suspended: "coral", Rejected: "coral",
};

const PAGE_SIZE = 40;

export default function AdminStudentsPage() {
  const [rows, setRows] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (opts: { page: number; q: string; status: string }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminService.students({
        page: opts.page, limit: PAGE_SIZE,
        search: opts.q || undefined, status: opts.status || undefined,
      });
      setRows(res.items as unknown as Student[]);
      setTotal(res.total);
      setPage(opts.page);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load({ page: 1, q: "", status: "" }); }, [load]);
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load({ page: 1, q, status }), 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [q, status, load]);

  const setUserStatus = async (id: string, next: string, msg: string) => {
    setBusy(id);
    try {
      await superAdminService.updateUserStatus(id, next);
      toast.success(msg);
      load({ page, q, status });
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setBusy(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Directory"
        title="Students"
        subtitle={`${total} students across every institution`}
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:w-60 sm:flex-none">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--th-text-faint)" }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, institute…"
                className="w-full rounded-lg border py-2 pl-8 pr-3 text-xs"
                style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
            </div>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border px-2 py-2 text-xs"
              style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }}>
              {["", "Approved", "Suspended", "Pending"].map((s) => <option key={s} value={s}>{s || "All statuses"}</option>)}
            </select>
          </div>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
          <AlertCircle size={16} className="text-amber-500" /> {error}
          <button onClick={() => load({ page, q, status })} className="ml-auto text-blue-600 dark:text-blue-400 text-xs">Retry</button>
        </div>
      )}

      <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[2fr_1.5fr_1fr_0.8fr_0.8fr_1.2fr] px-6 py-3 text-[10px] font-bold uppercase tracking-wider border-b" style={{ borderColor: "var(--th-border)", color: "var(--th-text-faint)" }}>
            <span>Student</span><span>Institute</span><span>Branch</span><span>Readiness</span><span>Status</span><span>Actions</span>
          </div>
          {loading ? (
            <div className="p-6 space-y-3"><SkeletonBlock height="h-8" /><SkeletonBlock height="h-8" /><SkeletonBlock height="h-8" /></div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-xs" style={{ color: "var(--th-text-faint)" }}>
              <GraduationCap size={22} className="mx-auto mb-2 opacity-40" /> No students match.
            </div>
          ) : (
            rows.map((s) => {
              const color = getGradeColor(getGradeBand(Number(s.placementReadinessScore ?? 0)));
              return (
                <div key={s._id} className="grid grid-cols-[2fr_1.5fr_1fr_0.8fr_0.8fr_1.2fr] px-6 py-3.5 items-center border-b last:border-0 text-sm" style={{ borderColor: "var(--th-border)" }}>
                  <div className="min-w-0">
                    <p className="font-medium truncate" style={{ color: "var(--th-text-primary)" }}>{s.name}</p>
                    <p className="text-[11px] font-mono truncate" style={{ color: "var(--th-text-faint)" }}>{s.email}</p>
                  </div>
                  <span className="text-xs truncate" style={{ color: "var(--th-text-secondary)" }}>{s.organization ?? "—"}</span>
                  <span className="text-xs" style={{ color: "var(--th-text-muted)" }}>{s.branch ?? "—"}{s.graduationYear ? ` · ${s.graduationYear}` : ""}</span>
                  <span className="font-mono font-bold text-sm" style={{ color }}>{Math.round(Number(s.placementReadinessScore ?? 0))}</span>
                  <Badge variant={STATUS[s.status ?? ""] ?? "neutral"}>{s.status ?? "—"}</Badge>
                  <div className="flex gap-1.5">
                    {s.status === "Suspended" ? (
                      <button disabled={busy === s._id} onClick={() => setUserStatus(s._id, "Approved", "Student reactivated")}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border disabled:opacity-50" style={{ borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }}>
                        <RotateCcw size={11} /> Reactivate
                      </button>
                    ) : (
                      <button disabled={busy === s._id} onClick={() => setUserStatus(s._id, "Suspended", "Student suspended")}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-rose-500 text-white disabled:opacity-50">
                        <Ban size={11} /> Suspend
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => load({ page: page - 1, q, status })}>Previous</Button>
          <span className="text-xs" style={{ color: "var(--th-text-faint)" }}>Page {page} of {totalPages}</span>
          <Button variant="secondary" disabled={page >= totalPages || loading} onClick={() => load({ page: page + 1, q, status })}>Next</Button>
        </div>
      )}
    </div>
  );
}
