"use client";

import { useEffect, useState } from "react";
import { collegeAdminService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { Sparkles, Loader2, Send, TrendingUp, Users, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import { CountUp } from "@synclyft/ui/components/CountUp";
import { PageHeader } from "@/components/PageHeader";

const SUGGESTIONS = [
  "Which students are at risk and need intervention?",
  "Summarise my cohort's weakest competency areas.",
  "Who are my top 10 placement-ready candidates?",
  "Which batch is performing best and which is lagging?",
];

interface Insights {
  summary?: string;
  overview?: {
    totalStudents: number; totalSessions: number; placementReadyStudents: number;
    atRiskStudents: number; averageReadinessScore: number; averageInterviewScore: number; averageRiskScore: number;
  };
  readinessDistribution?: { excellent: number; good: number; needsFocus: number; atRisk: number };
  batchPerformance?: { batchName: string; department: string; graduationYear: number; studentCount: number; averageReadiness: number; averageScore: number }[];
  recommendations?: { title?: string; description?: string; priority?: string }[];
}

export default function OfficerQueryPage() {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setInsights((await collegeAdminService.universityInsights({ days: 90 })) as Insights);
      } catch {
        /* structured insights are best-effort */
      } finally {
        setInsightsLoading(false);
      }
    })();
  }, []);

  const ask = async (question: string) => {
    if (!question.trim()) return;
    setQ(question);
    setLoading(true);
    setAnswer(null);
    try {
      const res = await collegeAdminService.askInsights(question.trim());
      setAnswer(res.answer);
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const o = insights?.overview;
  const dist = insights?.readinessDistribution;

  return (
    <div className="p-5 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-7">
      <PageHeader
        eyebrow="Assistant"
        icon={<Sparkles size={18} className="text-blue-500" />}
        title="Ask your data"
        subtitle="AI answers grounded in your cohort's real interview and readiness data"
      />

      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about your students…"
          className="flex-1 px-4 py-2.5 rounded-xl border text-sm"
          style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
        <button type="submit" disabled={loading || !q.trim()} className="btn-primary flex items-center gap-2 disabled:opacity-50">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </form>

      {!answer && !loading && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => ask(s)}
              className="px-3 py-1.5 rounded-full text-xs border transition-colors"
              style={{ borderColor: "var(--th-border)", color: "var(--th-text-secondary)", backgroundColor: "var(--th-card-bg)" }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border p-6 flex items-center gap-3 text-sm" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-faint)" }}>
          <Loader2 size={16} className="animate-spin" /> Analysing your cohort data…
        </div>
      )}

      {answer && (
        <div className="rounded-2xl border p-6" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--th-text-secondary)" }}>{answer}</p>
        </div>
      )}

      {/* ── Structured cohort insights ── */}
      {!insightsLoading && insights && (
        <div className="space-y-5">
          <h2 className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>Cohort snapshot</h2>

          {insights.summary && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>{insights.summary}</p>
          )}

          {o && (
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Placement-ready", value: o.placementReadyStudents, icon: Users, color: "#3DDC84" },
                { label: "At risk", value: o.atRiskStudents, icon: ShieldAlert, color: "#FF5C5C" },
                { label: "Avg readiness", value: o.averageReadinessScore, icon: TrendingUp, color: "#0062FF" },
                { label: "Avg interview", value: o.averageInterviewScore, icon: TrendingUp, color: "#4D7CFF" },
              ].map((k) => (
                <div key={k.label} className="rounded-xl border p-4" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--th-text-faint)" }}>{k.label}</span>
                    <k.icon size={12} style={{ color: k.color }} />
                  </div>
                  <p className="mt-1.5 text-xl font-bold" style={{ color: "var(--th-text-primary)" }}><CountUp end={k.value} /></p>
                </div>
              ))}
            </div>
          )}

          {dist && (
            <div className="rounded-2xl border p-5" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <p className="text-xs font-bold mb-3" style={{ color: "var(--th-text-primary)" }}>Readiness bands</p>
              <div className="flex gap-2 h-3 rounded-full overflow-hidden">
                {[
                  { k: "excellent", v: dist.excellent, c: "#3DDC84" },
                  { k: "good", v: dist.good, c: "#0062FF" },
                  { k: "needsFocus", v: dist.needsFocus, c: "#F59E0B" },
                  { k: "atRisk", v: dist.atRisk, c: "#FF5C5C" },
                ].filter((b) => b.v > 0).map((b) => (
                  <div key={b.k} style={{ flexGrow: b.v, backgroundColor: b.c }} title={`${b.k}: ${b.v}`} />
                ))}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px]" style={{ color: "var(--th-text-muted)" }}>
                {[
                  { label: "Excellent", v: dist.excellent, c: "#3DDC84" },
                  { label: "Good", v: dist.good, c: "#0062FF" },
                  { label: "Needs focus", v: dist.needsFocus, c: "#F59E0B" },
                  { label: "At risk", v: dist.atRisk, c: "#FF5C5C" },
                ].map((b) => (
                  <span key={b.label} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.c }} />
                    {b.label} <span className="font-mono" style={{ color: "var(--th-text-secondary)" }}>{b.v}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {(insights.batchPerformance ?? []).length > 0 && (
            <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <div className="px-5 py-3 border-b text-xs font-bold" style={{ borderColor: "var(--th-border)", color: "var(--th-text-primary)" }}>Batch performance</div>
              <div className="overflow-x-auto"><div className="min-w-[440px]">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr] px-5 py-2 text-[10px] font-bold uppercase" style={{ color: "var(--th-text-faint)" }}>
                <span>Batch</span><span>Students</span><span>Avg readiness</span><span>Avg score</span>
              </div>
              {insights.batchPerformance!.map((b, i) => (
                <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr] px-5 py-2.5 border-t text-xs" style={{ borderColor: "var(--th-border)", color: "var(--th-text-secondary)" }}>
                  <span className="truncate">{b.batchName} <span style={{ color: "var(--th-text-faint)" }}>· {b.department}</span></span>
                  <span className="font-mono">{b.studentCount}</span>
                  <span className="font-mono">{b.averageReadiness}</span>
                  <span className="font-mono">{b.averageScore}</span>
                </div>
              ))}
              </div></div>
            </div>
          )}

          {(insights.recommendations ?? []).length > 0 && (
            <div className="rounded-2xl border p-5 space-y-2" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <p className="text-xs font-bold" style={{ color: "var(--th-text-primary)" }}>Recommended workshops</p>
              {insights.recommendations!.map((r, i) => (
                <div key={i} className="text-xs" style={{ color: "var(--th-text-secondary)" }}>
                  <span className="font-semibold">{r.title}</span>{r.description ? ` — ${r.description}` : ""}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
