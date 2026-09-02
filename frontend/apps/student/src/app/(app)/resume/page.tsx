"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@synclyft/ui/components/Badge";
import { Button } from "@synclyft/ui/components/Button";
import { getGradeBand, getGradeColor, isPdfFile } from "@synclyft/lib/utils";
import { resumeService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import type { ResumeAnalysis } from "@synclyft/lib/api/models";
import toast from "react-hot-toast";
import {
  Upload, FileText, Sparkles, CheckCircle2, XCircle, RefreshCw, X, ArrowRight, Lightbulb,
} from "lucide-react";

type View = "upload" | "form" | "scanning" | "results";

function Gauge({ value }: { value: number }) {
  const r = 58;
  const c = 2 * Math.PI * r;
  const band = getGradeBand(value);
  const color = getGradeColor(band);
  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
      <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--th-bg-secondary)" strokeWidth="14" />
        <circle cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1)" }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-black" style={{ color, fontFamily: "var(--font-inter-tight), sans-serif" }}>{value}</span>
        <span className="text-[9px] font-bold tracking-wider" style={{ color: "var(--th-text-faint)" }}>ATS SCORE</span>
      </div>
    </div>
  );
}

// Must match the backend enum (validationSchemas.analyzeResume).
const EXPERIENCE = ["Fresher", "Intermediate", "Experienced"];

export default function ResumeAnalyzerPage() {
  const [view, setView] = useState<View>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [targetJD, setTargetJD] = useState("");
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = useCallback((f: File | undefined | null) => {
    if (!f) return;
    if (!isPdfFile(f)) return toast.error("Please upload a PDF file");
    if (f.size > 5 * 1024 * 1024) return toast.error("PDF must be under 5MB");
    setFile(f);
    setView("form");
  }, []);

  const analyze = async () => {
    if (!file) return;
    if (!targetRole.trim()) return toast.error("Enter your target role");
    if (!experienceLevel) return toast.error("Select your experience level");
    setView("scanning");
    try {
      const res = await resumeService.analyze(file, { targetRole: targetRole.trim(), experienceLevel, targetJD });
      setAnalysis(res);
      setView("results");
    } catch (err) {
      toast.error(toApiError(err).message);
      setView("form");
    }
  };

  const reset = () => {
    setFile(null); setAnalysis(null); setTargetRole(""); setExperienceLevel(""); setTargetJD("");
    setView("upload");
  };

  const band = analysis ? getGradeBand(analysis.atsScoreEstimate) : "low";

  return (
    <div style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <div className="space-y-0">
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="label-caption mb-1" style={{ color: "var(--th-text-faint)" }}>Resume tools</p>
            <h1 className="text-[1.65rem] sm:text-[2rem] font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
              ATS resume analyzer
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--th-text-faint)" }}>
              Upload your resume and get an AI-scored, keyword-level breakdown against your target role
            </p>
          </div>
          <Link href="/tools/resumehistory" className="text-xs font-semibold shrink-0" style={{ color: "var(--th-primary)" }}>
            View past analyses →
          </Link>
        </div>

        <>
          {/* UPLOAD */}
          {view === "upload" && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}
              className="rounded-2xl border-2 border-dashed p-14 text-center cursor-pointer"
              style={{ borderColor: "var(--th-border-strong)", backgroundColor: "var(--th-card-bg)" }}
              onClick={() => inputRef.current?.click()}>
              <input ref={inputRef} type="file" accept="application/pdf" className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0])} />
              <Upload size={34} className="mx-auto mb-3" style={{ color: "var(--th-primary)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--th-text-primary)" }}>Drop your resume PDF here</p>
              <p className="text-xs mt-1" style={{ color: "var(--th-text-faint)" }}>or click to browse · PDF only · max 5MB</p>
            </div>
          )}

          {/* FORM */}
          {view === "form" && (
            <div
              className="rounded-2xl border p-6 space-y-5" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
              <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: "var(--th-border)" }}>
                <FileText size={18} style={{ color: "var(--th-primary)" }} />
                <span className="text-sm font-semibold flex-1 truncate" style={{ color: "var(--th-text-primary)" }}>{file?.name}</span>
                <button onClick={reset}><X size={16} style={{ color: "var(--th-text-faint)" }} /></button>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Target role</label>
                  <input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Backend Engineer"
                    className="w-full px-3 py-2 rounded-lg border text-xs"
                    style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Experience level</label>
                  <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-xs"
                    style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }}>
                    <option value="">Select…</option>
                    {EXPERIENCE.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Job description (optional — improves keyword matching)</label>
                <textarea value={targetJD} onChange={(e) => setTargetJD(e.target.value)} rows={4} placeholder="Paste the job description…"
                  className="w-full px-3 py-2 rounded-lg border text-xs resize-none"
                  style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={reset}>Change file</Button>
                <Button onClick={analyze} icon={<Sparkles size={14} />}>Analyze resume</Button>
              </div>
            </div>
          )}

          {/* SCANNING */}
          {view === "scanning" && (
            <div
              className="rounded-2xl border p-16 text-center" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
              <RefreshCw size={30} className="mx-auto mb-4 animate-spin" style={{ color: "var(--th-primary)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--th-text-primary)" }}>Analyzing your resume…</p>
              <p className="text-xs mt-1" style={{ color: "var(--th-text-faint)" }}>Extracting text, matching keywords and scoring against ATS rules. This takes ~15 seconds.</p>
            </div>
          )}

          {/* RESULTS */}
          {view === "results" && analysis && (
            <div className="space-y-6">
              <div className="rounded-2xl border p-6 flex flex-col sm:flex-row items-center gap-6"
                style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                <Gauge value={analysis.atsScoreEstimate} />
                <div className="flex-1 text-center sm:text-left">
                  <Badge variant={band === "high" ? "verdant" : band === "mid" ? "amber" : "coral"}>
                    {band === "high" ? "Strong" : band === "mid" ? "Needs work" : "At risk"}
                  </Badge>
                  <p className="text-sm mt-3" style={{ color: "var(--th-text-secondary)" }}>
                    {analysis.matchedKeywords.length} matched keyword{analysis.matchedKeywords.length !== 1 ? "s" : ""} ·{" "}
                    {analysis.missingKeywords.length} missing
                  </p>
                  <Button variant="secondary" className="mt-4" onClick={reset} icon={<Upload size={13} />}>Analyze another</Button>
                </div>
              </div>

              {analysis.summarySuggestion && (
                <div className="rounded-2xl border p-6" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={15} className="text-blue-500" />
                    <h3 className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>Suggested professional summary</h3>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>{analysis.summarySuggestion}</p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-2xl border p-6" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--th-text-primary)" }}>
                    <CheckCircle2 size={15} className="text-emerald-500" /> Strengths
                  </h3>
                  <ul className="space-y-2">
                    {analysis.strengths.map((s, i) => (
                      <li key={i} className="text-xs flex gap-2" style={{ color: "var(--th-text-secondary)" }}>
                        <span className="text-emerald-500 mt-0.5">✓</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border p-6" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--th-text-primary)" }}>
                    <XCircle size={15} className="text-rose-500" /> Weaknesses
                  </h3>
                  <ul className="space-y-2">
                    {analysis.weaknesses.map((s, i) => (
                      <li key={i} className="text-xs flex gap-2" style={{ color: "var(--th-text-secondary)" }}>
                        <span className="text-rose-500 mt-0.5">!</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {(analysis.matchedKeywords.length > 0 || analysis.missingKeywords.length > 0) && (
                <div className="rounded-2xl border p-6 space-y-4" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                  {analysis.matchedKeywords.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold mb-3" style={{ color: "var(--th-text-primary)" }}>Keywords already covered ({analysis.matchedKeywords.length})</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.matchedKeywords.map((k) => (
                          <span key={k} className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">{k}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {analysis.missingKeywords.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold mb-3" style={{ color: "var(--th-text-primary)" }}>Missing keywords to add ({analysis.missingKeywords.length})</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.missingKeywords.map((k) => (
                          <span key={k} className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/15">{k}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {[
                ["Experience bullet improvements", analysis.experienceImprovements],
                ["Project improvements", analysis.projectImprovements],
                ["Certification improvements", analysis.certificationImprovements],
                ["General tips", analysis.generalTips],
              ].map(([title, items]) => {
                const list = items as string[];
                if (!list?.length) return null;
                return (
                  <div key={title as string} className="rounded-2xl border p-6" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--th-text-primary)" }}>
                      <Lightbulb size={15} className="text-amber-500" /> {title as string}
                    </h3>
                    <ul className="space-y-2">
                      {list.map((s, i) => (
                        <li key={i} className="text-xs flex gap-2" style={{ color: "var(--th-text-secondary)" }}>
                          <ArrowRight size={12} className="mt-0.5 shrink-0 text-blue-500" /> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </>
      </div>
    </div>
  );
}
