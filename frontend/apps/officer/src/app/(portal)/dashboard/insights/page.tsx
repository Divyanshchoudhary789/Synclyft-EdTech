"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collegeAdminService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { getGradeBand, getGradeColor } from "@synclyft/lib/utils";
import { Badge } from "@synclyft/ui/components/Badge";
import { SkeletonBlock } from "@synclyft/ui/components/SkeletonBlock";
import { Sparkles, AlertCircle, Trophy, TrendingDown, BookOpen, ArrowDown, CalendarX, CheckCircle2, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

interface Candidate {
  id?: string; studentId?: string; name?: string; email?: string; branch?: string;
  graduationYear?: number; cgpa?: number; placementReadinessScore?: number;
  skills?: string[]; latestInterviewScore?: number | null; latestGrade?: string | null;
  batch?: { batchName?: string } | null;
}
interface Declining {
  studentId?: string; name?: string; email?: string; branch?: string;
  currentScore?: number; previousScore?: number; scoreDrop?: number; skillGaps?: string[];
}
interface Workshop { _id?: string; title?: string; description?: string; priority?: string; targetType?: string }

const PRIORITY: Record<string, "coral" | "amber" | "neutral"> = { high: "coral", medium: "amber", low: "neutral" };

export default function OfficerInsightsPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [declining, setDeclining] = useState<Declining[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [missed, setMissed] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [c, d, w, m] = await Promise.allSettled([
        collegeAdminService.topCandidates({ limit: 15, minReadinessScore: 55 }),
        collegeAdminService.decliningStudents({ limit: 15 }),
        collegeAdminService.workshopRecommendations(),
        collegeAdminService.missedAptitude({ limit: 30 }),
      ]);
      if (c.status === "fulfilled") setCandidates(c.value as unknown as Candidate[]);
      if (d.status === "fulfilled") setDeclining(d.value as unknown as Declining[]);
      if (w.status === "fulfilled") setWorkshops(w.value as unknown as Workshop[]);
      if (m.status === "fulfilled") setMissed(m.value as Record<string, unknown>[]);
      if (c.status === "rejected" && d.status === "rejected") setError(toApiError(c.reason).message);
      setLoading(false);
    })();
  }, []);

  const openStudent = (id?: string) => id && router.push(`/dashboard/students?student=${id}`);

  return (
    <div className="p-5 sm:p-6 md:p-8 space-y-6 sm:space-y-7">
      <PageHeader
        eyebrow="Intelligence"
        icon={<Sparkles size={18} className="text-blue-500" />}
        title="Placement intelligence"
        subtitle="Who to put forward, who needs help, and what to run next quarter"
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
          <AlertCircle size={16} className="text-amber-500" /> {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4"><SkeletonBlock height="h-40" /><SkeletonBlock height="h-40" /></div>
      ) : (
        <>
          {/* Top candidates */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--th-text-primary)" }}>
              <Trophy size={15} className="text-emerald-500" /> Placement-ready candidates
            </h2>
            {candidates.length === 0 ? (
              <p className="text-xs rounded-xl border p-4" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-faint)" }}>
                No students have crossed the readiness threshold yet.
              </p>
            ) : (
              <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                <div className="min-w-[620px]">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr] px-5 py-2.5 text-[10px] font-bold uppercase border-b" style={{ borderColor: "var(--th-border)", color: "var(--th-text-faint)" }}>
                  <span>Student</span><span>Readiness</span><span>Latest score</span><span>CGPA</span><span>Skills</span>
                </div>
                {candidates.map((c, i) => {
                  const rs = Math.round(c.placementReadinessScore ?? 0);
                  const color = getGradeColor(getGradeBand(rs));
                  return (
                    <button key={c.id ?? c.studentId ?? i} onClick={() => openStudent(String(c.id ?? c.studentId ?? ""))}
                      className="w-full grid grid-cols-[2fr_1fr_1fr_1fr_2fr] px-5 py-3 items-center border-b last:border-0 text-left text-xs transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                      style={{ borderColor: "var(--th-border)" }}>
                      <div className="min-w-0">
                        <p className="font-medium truncate" style={{ color: "var(--th-text-primary)" }}>{c.name}</p>
                        <p className="text-[10px] truncate" style={{ color: "var(--th-text-faint)" }}>{c.branch}{c.batch?.batchName ? ` · ${c.batch.batchName}` : ""}</p>
                      </div>
                      <span className="font-mono font-bold" style={{ color }}>{rs}</span>
                      <span className="font-mono" style={{ color: "var(--th-text-secondary)" }}>{c.latestInterviewScore != null ? Math.round(c.latestInterviewScore) : "—"} {c.latestGrade ? `(${c.latestGrade})` : ""}</span>
                      <span className="font-mono" style={{ color: "var(--th-text-secondary)" }}>{c.cgpa ?? "—"}</span>
                      <span className="truncate" style={{ color: "var(--th-text-faint)" }}>{(c.skills ?? []).slice(0, 5).join(", ") || "—"}</span>
                    </button>
                  );
                })}
                </div>
              </div>
            )}
          </section>

          {/* Declining students */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--th-text-primary)" }}>
              <TrendingDown size={15} className="text-rose-500" /> Students in decline
            </h2>
            {declining.length === 0 ? (
              <p className="text-xs rounded-xl border p-4 flex items-center gap-2" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-faint)" }}>
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> No students showing a downward readiness trend.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {declining.map((d, i) => (
                  <button key={d.studentId ?? i} onClick={() => openStudent(d.studentId)}
                    className="rounded-2xl border p-4 text-left transition-colors hover:border-[color:var(--th-primary)]"
                    style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold truncate" style={{ color: "var(--th-text-primary)" }}>{d.name}</p>
                      <span className="flex items-center gap-0.5 text-[11px] font-bold text-rose-500">
                        <ArrowDown size={11} /> {Math.round(d.scoreDrop ?? 0)}
                      </span>
                    </div>
                    <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: "var(--th-text-faint)" }}>
                      {d.branch} · {Math.round(d.previousScore ?? 0)} <ArrowRight size={9} /> {Math.round(d.currentScore ?? 0)}
                    </p>
                    {(d.skillGaps ?? []).length > 0 && (
                      <p className="text-[10px] mt-1.5" style={{ color: "var(--th-text-muted)" }}>Gaps: {(d.skillGaps ?? []).slice(0, 4).join(", ")}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Students who haven't attempted an aptitude round */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--th-text-primary)" }}>
              <CalendarX size={15} className="text-amber-500" /> Yet to attempt aptitude
            </h2>
            {missed.length === 0 ? (
              <p className="text-xs rounded-xl border p-4 flex items-center gap-2" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-faint)" }}>
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> Every student has attempted at least one aptitude round.
              </p>
            ) : (
              <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                <div className="min-w-[420px]">
                  <div className="grid grid-cols-[2fr_1fr_1fr] px-5 py-2.5 text-[10px] font-bold uppercase border-b" style={{ borderColor: "var(--th-border)", color: "var(--th-text-faint)" }}>
                    <span>Student</span><span>Branch</span><span>Grad year</span>
                  </div>
                  {missed.map((s, i) => (
                    <button key={String(s.id ?? i)} onClick={() => openStudent(String(s.id ?? ""))}
                      className="w-full grid grid-cols-[2fr_1fr_1fr] px-5 py-3 items-center border-b last:border-0 text-left text-xs transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                      style={{ borderColor: "var(--th-border)" }}>
                      <div className="min-w-0">
                        <p className="font-medium truncate" style={{ color: "var(--th-text-primary)" }}>{String(s.name ?? "—")}</p>
                        <p className="text-[10px] truncate" style={{ color: "var(--th-text-faint)" }}>{String(s.email ?? "")}</p>
                      </div>
                      <span style={{ color: "var(--th-text-secondary)" }}>{String(s.branch ?? "—")}</span>
                      <span style={{ color: "var(--th-text-secondary)" }}>{s.graduationYear ? String(s.graduationYear) : "—"}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Workshop recommendations */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--th-text-primary)" }}>
              <BookOpen size={15} className="text-blue-500" /> Recommended interventions
            </h2>
            {workshops.length === 0 ? (
              <p className="text-xs rounded-xl border p-4" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-faint)" }}>
                Recommendations appear once there is enough interview data to spot patterns.
              </p>
            ) : (
              <div className="space-y-2">
                {workshops.map((w, i) => (
                  <div key={w._id ?? i} className="rounded-2xl border p-4 flex items-start gap-3" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                    <BookOpen size={14} className="mt-0.5 shrink-0 text-blue-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: "var(--th-text-primary)" }}>{w.title}</p>
                      {w.description && <p className="text-[11px] mt-0.5" style={{ color: "var(--th-text-faint)" }}>{w.description}</p>}
                    </div>
                    {w.priority && <Badge variant={PRIORITY[w.priority] ?? "neutral"}>{w.priority}</Badge>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
