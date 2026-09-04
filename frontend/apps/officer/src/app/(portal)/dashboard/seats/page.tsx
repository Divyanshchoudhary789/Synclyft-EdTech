"use client";

import { useEffect, useMemo, useState } from "react";
import { collegeAdminService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { CountUp } from "@synclyft/ui/components/CountUp";
import { SkeletonCard } from "@synclyft/ui/components/SkeletonBlock";
import { Search, AlertCircle, Armchair } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/PageHeader";

interface StudentRow {
  id: string;
  name: string;
  email: string;
  hasSeat: boolean;
}

export default function SeatsPage() {
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [seat, roster] = await Promise.all([
        collegeAdminService.seatSummary(),
        collegeAdminService.students({ limit: 300 }),
      ]);
      setSummary(seat as Record<string, unknown>);
      const seatMgmt = ((seat as Record<string, unknown>).seatManagement ?? {}) as Record<string, unknown>;
      const enrolled = (seatMgmt.enrolledStudents ?? []) as Record<string, unknown>[];
      const allocated = new Set(
        enrolled
          .filter((e) => (e.status ?? "active") === "active")
          .map((e) => String((e.student as Record<string, unknown>)?._id ?? e.student ?? ""))
      );
      setStudents(
        roster.items.map((p) => {
          const user = (p.user ?? {}) as Record<string, unknown>;
          const id = String(user._id ?? p._id ?? "");
          return {
            id,
            name: String(user.name ?? p.name ?? "—"),
            email: String(user.email ?? p.email ?? ""),
            hasSeat: allocated.has(id),
          };
        })
      );
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const toggle = async (row: StudentRow) => {
    setBusy(row.id);
    try {
      if (row.hasSeat) await collegeAdminService.releaseSeat(row.id);
      else await collegeAdminService.allocateSeat(row.id);
      toast.success(row.hasSeat ? "Seat released" : "Seat allocated");
      load();
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setBusy(null);
    }
  };

  const seatMgmt = (summary?.seatManagement ?? {}) as Record<string, number>;
  const total = Number(seatMgmt.totalSeatsAllocated ?? 0);
  const used = Number(seatMgmt.usedSeats ?? students.filter((s) => s.hasSeat).length);
  const pct = Number(summary?.usagePercentage ?? (total ? Math.round((used / total) * 100) : 0));

  const filtered = useMemo(
    () => students.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()) || s.email.toLowerCase().includes(q.toLowerCase())),
    [students, q]
  );

  return (
    <div className="p-5 sm:p-6 md:p-8 space-y-6">
      <PageHeader
        eyebrow="Access"
        title="Seat management"
        subtitle="Allocate your subscription seats to students so they can take proctored mock interviews"
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
          <AlertCircle size={16} className="text-amber-500" /> {error}
          <button onClick={load} className="ml-auto text-blue-600 dark:text-blue-400 text-xs">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 grid-cols-3"><SkeletonCard className="h-24" /><SkeletonCard className="h-24" /><SkeletonCard className="h-24" /></div>
      ) : (
        <div className="grid gap-4 grid-cols-3">
          {[
            { label: "Total seats", value: total },
            { label: "Allocated", value: used },
            { label: "Utilisation", value: pct, suffix: "%" },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border p-5" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--th-text-faint)" }}>{k.label}</p>
              <p className="mt-2 text-2xl font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
                <CountUp end={k.value} />{k.suffix ?? ""}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="relative w-64">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--th-text-faint)" }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students…"
          className="pl-9 pr-3 py-2 rounded-lg border text-xs w-full"
          style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
        {loading ? (
          <div className="p-6 space-y-3"><div className="h-8 rounded bg-black/5 dark:bg-white/5" /><div className="h-8 rounded bg-black/5 dark:bg-white/5" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs" style={{ color: "var(--th-text-faint)" }}>
            <Armchair size={22} className="mx-auto mb-2 opacity-40" /> No students found.
          </div>
        ) : (
          filtered.map((s) => (
            <div key={s.id} className="flex items-center gap-4 px-6 py-3.5 border-b last:border-0" style={{ borderColor: "var(--th-border)" }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--th-text-primary)" }}>{s.name}</p>
                <p className="text-[11px] font-mono truncate" style={{ color: "var(--th-text-faint)" }}>{s.email}</p>
              </div>
              <button
                disabled={busy === s.id || (!s.hasSeat && total > 0 && used >= total)}
                onClick={() => toggle(s)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold border disabled:opacity-40"
                style={s.hasSeat
                  ? { borderColor: "rgba(255,92,92,0.2)", color: "#FF5C5C" }
                  : { backgroundColor: "var(--th-primary)", color: "#fff", borderColor: "var(--th-primary)" }}
              >
                {s.hasSeat ? "Release seat" : "Allocate seat"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
