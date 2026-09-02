"use client";

import { useEffect, useState } from "react";
import { collegeAdminService } from "@synclyft/lib/api/services";
import { API_BASE_URL, toApiError } from "@synclyft/lib/api";
import { CountUp } from "@synclyft/ui/components/CountUp";
import { SkeletonCard } from "@synclyft/ui/components/SkeletonBlock";
import { Button } from "@synclyft/ui/components/Button";
import { getGradeBand, getGradeColor } from "@synclyft/lib/utils";
import { FileText, Download, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

interface Summary {
  activeStudents?: number; activeBatches?: number; totalBatches?: number;
  averageReadinessScore?: number; averageInterviewScore?: number; averageRiskScore?: number;
}
interface StudentRow { name: string; email?: string; branch?: string; placementReadinessScore?: number; averageScore?: number }
interface BatchRow { batchName: string; department?: string; graduationYear?: number; studentCount?: number; averageScore?: number; readinessBand?: string }

interface DashboardReport {
  entity?: { organization?: { name?: string }; summary?: Summary };
  topStudents?: StudentRow[];
  atRiskStudents?: StudentRow[];
  batchSeries?: BatchRow[];
}

export default function OfficerReportsPage() {
  const [data, setData] = useState<DashboardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<"csv" | "pdf" | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData((await collegeAdminService.reportsDashboard()) as DashboardReport);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const download = async (format: "csv" | "pdf") => {
    setDownloading(format);
    try {
      const res = await fetch(`${API_BASE_URL}/college-admin/reports/dashboard?format=${format}`, { credentials: "include" });
      if (!res.ok) throw new Error("Report export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `placement-report.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setDownloading(null);
    }
  };

  const s = data?.entity?.summary ?? {};
  const top = data?.topStudents ?? [];
  const risk = data?.atRiskStudents ?? [];
  const batchRows = data?.batchSeries ?? [];

  const kpis = [
    { label: "Active students", value: Number(s.activeStudents ?? 0) },
    { label: "Active batches", value: Number(s.activeBatches ?? 0) },
    { label: "Avg readiness", value: Math.round(Number(s.averageReadinessScore ?? 0)) },
    { label: "Avg interview score", value: Math.round(Number(s.averageInterviewScore ?? 0)) },
  ];

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>Placement reports</h1>
          <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>Board-ready summary of your cohort&apos;s interview readiness</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" loading={downloading === "csv"} onClick={() => download("csv")} icon={<Download size={13} />}>CSV</Button>
          <Button loading={downloading === "pdf"} onClick={() => download("pdf")} icon={<Download size={13} />}>PDF</Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
          <AlertCircle size={16} className="text-amber-500" /> {error}
          <button onClick={load} className="ml-auto text-blue-600 dark:text-blue-400 text-xs">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-4"><SkeletonCard className="h-24" /><SkeletonCard className="h-24" /><SkeletonCard className="h-24" /><SkeletonCard className="h-24" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-2xl border p-5" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--th-text-faint)" }}>{k.label}</p>
                <p className="mt-2 text-2xl font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}><CountUp end={k.value} /></p>
              </div>
            ))}
          </div>

          {batchRows.length > 0 && (
            <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <div className="px-6 py-3 border-b text-xs font-bold" style={{ borderColor: "var(--th-border)", color: "var(--th-text-primary)" }}>Batch performance</div>
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr] px-6 py-2 text-[10px] font-bold uppercase" style={{ color: "var(--th-text-faint)" }}>
                <span>Batch</span><span>Students</span><span>Avg score</span><span>Band</span>
              </div>
              {batchRows.map((b, i) => (
                <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr] px-6 py-2.5 border-t text-xs items-center" style={{ borderColor: "var(--th-border)", color: "var(--th-text-secondary)" }}>
                  <span className="truncate">{b.batchName} <span style={{ color: "var(--th-text-faint)" }}>· {b.department} · {b.graduationYear}</span></span>
                  <span className="font-mono">{b.studentCount ?? 0}</span>
                  <span className="font-mono">{Math.round(Number(b.averageScore ?? 0))}</span>
                  <span className="capitalize">{b.readinessBand ?? "—"}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <ReportList title="Top candidates" rows={top} />
            <ReportList title="Students needing intervention" rows={risk} />
          </div>

          {top.length === 0 && risk.length === 0 && batchRows.length === 0 && (
            <div className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-muted)" }}>
              <FileText size={26} className="mx-auto mb-2" />
              <p className="text-sm">No interview data yet. Once students start completing mock interviews, this report populates automatically.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReportList({ title, rows }: { title: string; rows: StudentRow[] }) {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
      <div className="px-5 py-3 border-b text-xs font-bold" style={{ borderColor: "var(--th-border)", color: "var(--th-text-primary)" }}>{title}</div>
      {rows.length === 0 ? (
        <p className="p-6 text-center text-xs" style={{ color: "var(--th-text-faint)" }}>No data yet.</p>
      ) : (
        rows.map((r, i) => {
          const score = Math.round(Number(r.placementReadinessScore ?? 0));
          const color = getGradeColor(getGradeBand(score));
          return (
            <div key={i} className="flex items-center gap-3 px-5 py-2.5 border-b last:border-0 text-xs" style={{ borderColor: "var(--th-border)" }}>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate" style={{ color: "var(--th-text-primary)" }}>{r.name}</p>
                <p className="text-[10px] truncate" style={{ color: "var(--th-text-faint)" }}>{r.branch || r.email || ""}</p>
              </div>
              <span className="font-mono font-bold" style={{ color }}>{score}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
