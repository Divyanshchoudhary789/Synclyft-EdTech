"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from "recharts";
import { Navbar } from "@/components/layout/Navbar";
import { CountUp } from "@synclyft/ui/components/CountUp";
import { Badge } from "@synclyft/ui/components/Badge";
import { Button } from "@synclyft/ui/components/Button";
import { mockReport } from "@/lib/api/mock";
import { getGradeColor, getGradeBand } from "@synclyft/lib/utils";
import {
  Download, Share2, TrendingUp, TrendingDown,
  BookOpen, ChevronRight, AlertTriangle, CheckCircle,
  Brain, Code2, Cpu, Mic2,
} from "lucide-react";
import { cn } from "@synclyft/lib/utils";

const ROUND_ICONS = { aptitude: Brain, coding: Code2, technical: Cpu, hr: Mic2 };
const ROUND_LABELS = { aptitude: "Aptitude", coding: "Coding", technical: "Technical", hr: "HR" };

export default function ReportPage() {
  const [revealed, setRevealed] = useState(false);
  const report = mockReport;

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 300);
    return () => clearTimeout(t);
  }, []);

  const band = report.gradeBand;
  const gradeColor = getGradeColor(band);
  const bandVariant = band === "high" ? "verdant" : band === "mid" ? "amber" : "coral";

  const roundScoreEntries = Object.entries(report.roundScores) as [keyof typeof report.roundScores, number][];

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{
        backgroundColor: "var(--th-bg)",
        color: "var(--th-text-primary)",
        fontFamily: "var(--font-inter), sans-serif",
      }}
    >
      <Navbar mode="intelligence" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label-caption mb-1" style={{ color: "var(--th-text-muted)" }}>
              Post-Interview Report
            </p>
            <h1
              className="text-[2rem] font-bold tracking-tight"
              style={{
                fontFamily: "var(--font-inter-tight), sans-serif",
                color: "var(--th-text-primary)",
              }}
            >
              Session {report.sessionId}
            </h1>
            <p className="text-sm mt-0.5 font-mono" style={{ color: "var(--th-text-muted)" }}>
              {new Date(report.completedAt).toLocaleDateString("en-IN", {
                day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              icon={<Share2 size={14} />}
              style={{ borderColor: "var(--th-border)", color: "var(--th-text-primary)" }}
            >
              Share
            </Button>
            <Button icon={<Download size={14} />} data-testid="export-pdf-btn">
              Export PDF
            </Button>
          </div>
        </div>

        {/* HERO — Grade + Score */}
        <div
          className="relative overflow-hidden rounded-[8px] border transition-colors duration-300"
          style={{
            backgroundColor: "var(--th-card-bg-alt)",
            borderColor: "var(--th-card-border)",
          }}
        >
          {/* Background glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 60% 80% at 50% 0%, ${gradeColor}12 0%, transparent 70%)`,
            }}
          />

          <div className="relative p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              {/* Grade badge */}
              <div className="text-center">
                <div
                  className="inline-flex items-center justify-center w-28 h-28 rounded-full border-2 text-[3rem] font-bold"
                  style={{
                    borderColor: gradeColor + "40",
                    backgroundColor: gradeColor + "12",
                    color: gradeColor,
                    fontFamily: "var(--font-inter-tight), sans-serif",
                  }}
                  data-testid="grade-badge"
                >
                  {revealed ? report.overallGrade : "—"}
                </div>
                <div
                  className="mt-2 text-xs font-mono uppercase tracking-wider"
                  style={{ color: "var(--th-text-secondary)" }}
                >
                  Overall grade
                </div>
              </div>

              {/* Score + percentile */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-baseline gap-3 justify-center md:justify-start">
                  <span
                    className="font-bold leading-none"
                    style={{
                      fontFamily: "var(--font-inter-tight), sans-serif",
                      fontSize: "3rem",
                      color: gradeColor,
                    }}
                    data-testid="overall-score"
                  >
                    {revealed ? (
                      <CountUp end={report.overallScore} duration={900} />
                    ) : 0}
                  </span>
                  <span className="text-xl" style={{ color: "var(--th-text-secondary)" }}>/100</span>
                </div>

                <div className="flex items-center gap-3 mt-3 justify-center md:justify-start flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-[#3DDC84]" />
                    <span className="text-sm" style={{ color: "var(--th-text-muted)" }}>
                      Top <span className="text-[#3DDC84] font-mono font-medium">{100 - report.percentile}%</span> of candidates
                    </span>
                  </div>
                  <div style={{ color: "var(--th-border)" }}>·</div>
                  <div className="text-sm" style={{ color: "var(--th-text-muted)" }}>
                    <span className="font-mono font-medium" style={{ color: "var(--th-primary)" }}>
                      + {report.benchmarkComparison}
                    </span> vs. batch avg
                  </div>
                  {report.proctoringFlags > 0 && (
                    <>
                      <div style={{ color: "var(--th-border)" }}>·</div>
                      <div className="flex items-center gap-1 text-sm">
                        <AlertTriangle size={12} style={{ color: "var(--th-primary)" }} />
                        <span style={{ color: "var(--th-text-muted)" }}>
                          {report.proctoringFlags} proctoring flag
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Round score pills */}
                <div className="flex flex-wrap gap-3 mt-6 justify-center md:justify-start">
                  {roundScoreEntries.map(([round, score]) => {
                    const Icon = ROUND_ICONS[round];
                    const roundBand = getGradeBand(score);
                    const roundColor = getGradeColor(roundBand);
                    return (
                      <div
                        key={round}
                        className="flex items-center gap-2 px-3 py-1.5 rounded border"
                        style={{
                          borderColor: roundColor + "30",
                          backgroundColor: roundColor + "0C",
                        }}
                        data-testid={`round-score-${round}`}
                      >
                        <Icon size={12} style={{ color: roundColor }} />
                        <span className="text-xs" style={{ color: "var(--th-text-muted)" }}>
                          {ROUND_LABELS[round]}
                        </span>
                        <span className="font-mono text-xs font-medium" style={{ color: roundColor }}>
                          {revealed ? <CountUp end={score} duration={900} /> : 0}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid md:grid-cols-2 gap-5">
          {/* Radar chart */}
          <div className="card-light p-6 min-w-0">
            <p className="label-caption mb-4" style={{ color: "var(--th-text-muted)" }}>
              Competency radar
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={report.radarData}>
                <PolarGrid stroke="var(--th-border)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fontSize: 11, fill: "var(--th-text-secondary)", fontFamily: "var(--font-inter)" }}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke={gradeColor}
                  fill={gradeColor}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Round breakdown bar chart */}
          <div className="card-light p-6 min-w-0">
            <p className="label-caption mb-4" style={{ color: "var(--th-text-muted)" }}>
              Round scores
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={roundScoreEntries.map(([round, score]) => ({
                  round: ROUND_LABELS[round],
                  score,
                }))}
                margin={{ left: 0, right: 0 }}
              >
                <XAxis
                  dataKey="round"
                  tick={{ fontSize: 11, fill: "var(--th-text-secondary)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  contentStyle={{
                    background: "var(--th-surface)",
                    border: "1px solid var(--th-border)",
                    borderRadius: 6,
                    fontSize: 12,
                    color: "var(--th-text-primary)",
                  }}
                  cursor={{ fill: "var(--th-hover-bg)" }}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {roundScoreEntries.map(([round, score]) => (
                    <Cell key={round} fill={getGradeColor(getGradeBand(score))} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Narrative */}
        <div className="card-light p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded flex items-center justify-center border"
              style={{
                backgroundColor: "color-mix(in srgb, var(--th-primary) 8%, transparent)",
                borderColor: "color-mix(in srgb, var(--th-primary) 15%, transparent)",
              }}
            >
              <Brain size={14} style={{ color: "var(--th-primary)" }} />
            </div>
            <p className="label-caption" style={{ color: "var(--th-text-muted)" }}>
              AI performance narrative
            </p>
          </div>
          <p
            className="text-base leading-relaxed"
            style={{ color: "var(--th-text-secondary)" }}
            data-testid="ai-narrative"
          >
            {report.aiNarrative}
          </p>
        </div>

        {/* Strengths + Improvements */}
        <div className="grid md:grid-cols-2 gap-5">
          <div className="card-light p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-[#3DDC84]" />
              <p className="label-caption" style={{ color: "var(--th-text-muted)" }}>
                Strengths
              </p>
            </div>
            <ul className="space-y-3">
              {report.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3DDC84] mt-1.5 shrink-0" />
                  <span className="text-sm leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
                    {s}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card-light p-6 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingDown size={14} style={{ color: "var(--th-primary)" }} />
              <p className="label-caption" style={{ color: "var(--th-text-muted)" }}>
                Areas to improve
              </p>
            </div>
            <ul className="space-y-3">
              {report.improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: "var(--th-primary)" }}
                  />
                  <span className="text-sm leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
                    {s}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Learning recommendations */}
        <div className="card-light p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={14} style={{ color: "var(--th-primary)" }} />
              <p className="label-caption" style={{ color: "var(--th-text-muted)" }}>
                Learning recommendations
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {report.recommendations.map((rec, i) => {
              const priorityVariant = rec.priority === "high" ? "coral" : rec.priority === "medium" ? "amber" : "neutral";
              return (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[8px]"
                  style={{ backgroundColor: "var(--th-bg-secondary)" }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-7 h-7 rounded border flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--th-primary) 10%, transparent)",
                        borderColor: "color-mix(in srgb, var(--th-primary) 15%, transparent)",
                      }}
                    >
                      <BookOpen size={12} style={{ color: "var(--th-primary)" }} />
                    </div>
                    <div>
                      <div className="font-medium text-sm" style={{ color: "var(--th-text-primary)" }}>
                        {rec.title}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--th-text-muted)" }}>
                        {rec.platform} · {rec.type}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={priorityVariant as "coral" | "amber" | "neutral"}>{rec.priority}</Badge>
                    <a
                      href={rec.url}
                      className="p-1.5 transition-colors"
                      style={{ color: "var(--th-text-muted)" }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "var(--th-primary)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "var(--th-text-muted)"}
                    >
                      <ChevronRight size={14} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 justify-end pt-2">
          <Link href="/interview/setup">
            <Button
              variant="secondary"
              style={{ borderColor: "var(--th-border)", color: "var(--th-text-primary)" }}
            >
              Start new session
            </Button>
          </Link>
          <Button icon={<Download size={14} />} data-testid="export-pdf-footer">
            Download report PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
