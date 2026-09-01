"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Badge } from "@synclyft/ui/components/Badge";
import { Button } from "@synclyft/ui/components/Button";
import { mockResumeData } from "@/lib/api/mock";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, Sparkles, CheckCircle2, AlertCircle, RefreshCw,
  Database, Download, X, HelpCircle, ArrowRight, Lightbulb, XCircle
} from "lucide-react";
import { cn } from "@synclyft/lib/utils";

type ViewState = "upload" | "scanning" | "ready" | "results";

// Beautified Radial Gauge Component (Thick, Glowing, Animated Leader Dot)
function CustomRadialGauge({ value, max = 100 }: { value: number; max?: number }) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    // Smooth initial count animation
    const timer = setTimeout(() => setAnimatedValue(value), 400);
    return () => clearTimeout(timer);
  }, [value]);

  const pct = animatedValue / max;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  // Math to position the glowing leader dot at the tip of the progress arc
  const angle = -Math.PI / 2 + pct * 2 * Math.PI;
  const dotX = 88 + radius * Math.cos(angle);
  const dotY = 88 + radius * Math.sin(angle);

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      {/* Background glow ring */}
      <div className="absolute inset-4 bg-blue-500/5 dark:bg-blue-600/10 rounded-full blur-2xl -z-10" />
      
      <svg width="176" height="176" viewBox="0 0 176 176" className="-rotate-90">
        <defs>
          {/* Rich Cobalt blue gradient */}
          <linearGradient id="blueGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93C5FD" /> {/* Light blue */}
            <stop offset="50%" stopColor="#3B82F6" /> {/* Brand blue */}
            <stop offset="100%" stopColor="#1D4ED8" /> {/* Deep cobalt */}
          </linearGradient>
          
          {/* Glow filter for the SVG elements */}
          <filter id="svgGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer decorative dashboard dashed ring */}
        <circle cx="88" cy="88" r="74" fill="none" stroke="var(--th-border-strong)" strokeWidth="1" strokeDasharray="4, 6" className="opacity-40" />
        
        {/* Track Ring */}
        <circle cx="88" cy="88" r={radius} fill="none" stroke="var(--th-bg-secondary)" strokeWidth="16" className="opacity-80" />
        
        {/* Progress Ring with Glow */}
        <circle
          cx="88"
          cy="88"
          r={radius}
          fill="none"
          stroke="url(#blueGlowGrad)"
          strokeWidth="16"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ 
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />

        {/* Glowing Leader Dot at the leading edge */}
        {pct > 0 && (
          <circle
            cx={dotX}
            cy={dotY}
            r="9"
            fill="#93C5FD"
            stroke="#1D4ED8"
            strokeWidth="2.5"
            style={{ 
              filter: "drop-shadow(0 0 6px #2563EB)",
              transition: "cx 1.2s cubic-bezier(0.16, 1, 0.3, 1), cy 1.2s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          />
        )}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-4xl font-black tracking-tight"
          style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}
        >
          {Math.round(animatedValue)}%
        </span>
        <span className="text-[9px] uppercase tracking-widest font-black mt-1" style={{ color: "var(--th-text-faint)" }}>
          ATS Score
        </span>
      </div>
    </div>
  );
}

// Custom Segmented Progress Indicator for Keyword Match (Blue Theme)
function SegmentedProgress({ percent }: { percent: number }) {
  const totalBars = 16;
  const activeBars = Math.round(totalBars * (percent / 100));

  return (
    <div className="flex items-center gap-1.5 w-full max-w-xs py-2">
      {[...Array(totalBars)].map((_, i) => {
        const isActive = i < activeBars;
        return (
          <div
            key={i}
            className={cn(
              "w-2 h-6 rounded-full transition-all duration-500",
              isActive 
                ? "bg-blue-600 dark:bg-blue-400 scale-y-110 shadow-sm shadow-blue-500/20" 
                : "bg-gray-200 dark:bg-gray-800"
            )}
            style={{ 
              transitionDelay: `${i * 30}ms`
            }}
          />
        );
      })}
    </div>
  );
}

export default function ResumePage() {
  const data = mockResumeData;
  const [viewState, setViewState] = useState<ViewState>("upload");
  const [scanProgress, setScanProgress] = useState(0);

  // Dynamic values parsed from data
  const atsScore = data.atsScore || 72;
  const jdMatchScore = data.jdMatchScore || 78;
  
  // Dynamically map checklist feedback from categories (if score >= 80 success, else warning)
  const feedbackItems = data.atsBreakdown?.flatMap((cat) => {
    const isSuccess = cat.score >= 80;
    return cat.suggestions.map((sug) => ({
      text: sug,
      type: isSuccess ? ("success" as const) : ("warning" as const)
    }));
  }) || [];

  // Dynamically fetch missing keys from Keyword category
  const missingKeys = data.atsBreakdown?.find(b => b.category === "Keywords Match" || b.category === "Keywords")?.suggestions || ["Docker", "Kubernetes", "CI/CD", "Microservices", "GraphQL"];

  // Simulate file selection and scan progress
  const triggerScan = () => {
    setViewState("scanning");
    setScanProgress(0);
  };

  useEffect(() => {
    if (viewState !== "scanning") return;

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setViewState("ready");
          return 100;
        }
        return prev + 10;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [viewState]);

  const handleAnalyze = () => {
    setViewState("results");
  };

  const handleReset = () => {
    setViewState("upload");
    setScanProgress(0);
  };

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: "var(--th-bg)", fontFamily: "var(--font-inter), sans-serif" }}>
      <Navbar mode="intelligence" />

      {/* Main Layout Area - Stretched to max-w-7xl for full dashboard experience */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10">
        
        {/* Header Section */}
        <div className="flex items-center justify-between gap-4 flex-wrap mb-10">
          <div>
            <p className="label-caption mb-1" style={{ color: "var(--th-text-faint)" }}>
              Applicant Tracking System Simulator
            </p>
            <h1 className="text-[2rem] font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", color: "var(--th-text-primary)" }}>
              Resume Analyzer
            </h1>
          </div>
          {viewState === "results" && (
            <button
              onClick={handleReset}
              className="btn-secondary !rounded-full !px-5 !py-2 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={13} /> Re-upload
            </button>
          )}
        </div>

        {/* State Machine Container */}
        <AnimatePresence mode="wait">
          
          {/* 1. INITIAL UPLOAD CARD STATE */}
          {viewState === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-xl mx-auto"
            >
              <div 
                className="p-8 md:p-12 text-center rounded-2xl border transition-all duration-300 relative overflow-hidden"
                style={{ 
                  backgroundColor: "var(--th-card-bg)", 
                  borderColor: "var(--th-card-border)" 
                }}
              >
                {/* Background soft glow */}
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#0062FF]/5 rounded-full blur-3xl pointer-events-none" />

                <h2 className="text-xl md:text-2xl font-bold mb-2 tracking-tight" style={{ color: "var(--th-text-primary)" }}>
                  Upload Your Resume
                </h2>
                <p className="text-xs md:text-sm mb-8 max-w-sm mx-auto" style={{ color: "var(--th-text-muted)" }}>
                  Get instant ATS score and personalized feedback. Supported PDF (.pdf), Word (.docx). Maximum file size: 5MB
                </p>

                {/* Dotted dropzone */}
                <div 
                  onClick={triggerScan}
                  className="border-2 border-dashed border-[#D4D0C5] dark:border-[#334155] rounded-2xl p-10 cursor-pointer hover:border-[#0062FF] dark:hover:border-[#0062FF] transition-all bg-black/[0.01] hover:bg-blue-500/[0.02]"
                >
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Upload size={20} />
                    </div>
                    <p className="text-sm font-semibold" style={{ color: "var(--th-text-secondary)" }}>
                      Drag & drop your file here, or <span className="text-[#0062FF] underline">browse</span>
                    </p>
                    <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-faint)" }}>
                      Clicking simulate upload of {data.fileName}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-around gap-6 mt-8 pt-8 border-t border-dashed" style={{ borderColor: "var(--th-border)" }}>
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-600 text-xs font-bold">1</span>
                    <div className="text-left">
                      <h4 className="text-xs font-bold" style={{ color: "var(--th-text-primary)" }}>ATS Compatibility</h4>
                      <p className="text-[10px]" style={{ color: "var(--th-text-muted)" }}>How well your resume parses</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 text-xs font-bold">2</span>
                    <div className="text-left">
                      <h4 className="text-xs font-bold" style={{ color: "var(--th-text-primary)" }}>Keyword Matching</h4>
                      <p className="text-[10px]" style={{ color: "var(--th-text-muted)" }}>Industry-relevant keys check</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 2. SCANNING LOADER STATE */}
          {viewState === "scanning" && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="max-w-xl mx-auto"
            >
              <div 
                className="p-10 text-center rounded-2xl border flex flex-col items-center justify-center space-y-6"
                style={{ 
                  backgroundColor: "var(--th-card-bg)", 
                  borderColor: "var(--th-card-border)" 
                }}
              >
                <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--th-text-primary)" }}>
                  Uploading Your Resume
                </h2>
                <p className="text-xs" style={{ color: "var(--th-text-muted)" }}>
                  Scanning sections, headers, keywords, and quantified metrics...
                </p>

                {/* Animated dash scanner spinner */}
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-dashed border-blue-500/20 animate-[spin_10s_linear_infinite]" />
                  <div className="absolute inset-2 rounded-full border-4 border-green-500 border-t-transparent animate-[spin_1s_linear_infinite]" />
                  <div className="text-sm font-mono font-bold text-green-500">
                    {scanProgress}%
                  </div>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-var(--th-bg-secondary) border" style={{ borderColor: "var(--th-border)" }}>
                  <FileText size={15} className="text-[#FF5C5C]" />
                  <span className="text-xs font-semibold" style={{ color: "var(--th-text-secondary)" }}>
                    {data.fileName}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* 3. READY STATE (File selected, analyze button active) */}
          {viewState === "ready" && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-xl mx-auto"
            >
              <div 
                className="p-8 md:p-10 text-center rounded-2xl border relative overflow-hidden"
                style={{ 
                  backgroundColor: "var(--th-card-bg)", 
                  borderColor: "var(--th-card-border)" 
                }}
              >
                {/* Close X mark */}
                <button 
                  onClick={handleReset} 
                  className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X size={16} style={{ color: "var(--th-text-muted)" }} />
                </button>

                <h2 className="text-xl md:text-2xl font-bold mb-1 tracking-tight" style={{ color: "var(--th-text-primary)" }}>
                  Upload Your Resume
                </h2>
                <p className="text-xs md:text-sm mb-6" style={{ color: "var(--th-text-muted)" }}>
                  Supported PDF(.pdf), Word (.docx) Maximum file size: 5MB
                </p>

                {/* Checkmark box */}
                <div 
                  className="border border-[#3DDC84]/20 rounded-2xl p-8 mb-6 flex flex-col items-center justify-center space-y-3 bg-[#3DDC84]/5"
                >
                  <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/20">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--th-text-secondary)" }}>
                      File Selected
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--th-text-faint)" }}>
                      {data.fileName}
                    </p>
                  </div>
                </div>

                {/* What We'll Analyze list block */}
                <div className="text-left space-y-4 mb-8">
                  <h4 className="text-xs uppercase tracking-wider font-bold" style={{ color: "var(--th-text-faint)" }}>
                    What We&apos;ll Analyze
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-xl border flex items-start gap-2.5" style={{ borderColor: "var(--th-border)" }}>
                      <span className="w-2 h-2 rounded-full bg-[#0062FF] shrink-0 mt-1.5" />
                      <div className="space-y-0.5">
                        <h5 className="text-xs font-bold" style={{ color: "var(--th-text-primary)" }}>ATS Compatibility</h5>
                        <p className="text-[10px]" style={{ color: "var(--th-text-muted)" }}>Formatting and structural health</p>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl border flex items-start gap-2.5" style={{ borderColor: "var(--th-border)" }}>
                      <span className="w-2 h-2 rounded-full bg-[#0062FF] shrink-0 mt-1.5" />
                      <div className="space-y-0.5">
                        <h5 className="text-xs font-bold" style={{ color: "var(--th-text-primary)" }}>Keyword Matching</h5>
                        <p className="text-[10px]" style={{ color: "var(--th-text-muted)" }}>Targeted skills and vocabulary</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Glowing Blue Button */}
                <button
                  onClick={handleAnalyze}
                  className="w-full justify-center flex items-center gap-2 py-3 rounded-xl text-white font-bold transition-all text-sm bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-xl shadow-blue-600/10 hover:shadow-blue-600/20 active:scale-[0.99] cursor-pointer"
                >
                  Analyze Resume <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* 4. RESULTS DASHBOARD STATE */}
          {viewState === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4, type: "spring", stiffness: 80, damping: 15 }}
              className="space-y-8 w-full"
            >
              {/* ── TOP SECTION: Main cards (grid layout stretched to max-w-7xl) ── */}
              <div className="grid lg:grid-cols-12 gap-8 items-start">
                
                {/* ── LEFT COLUMN: ATS Score Overview (col-span-5) ── */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* ATS Analysis Score Card */}
                  <div 
                    className="p-6 text-center rounded-2xl border relative overflow-hidden"
                    style={{ 
                      backgroundColor: "var(--th-card-bg)", 
                      borderColor: "var(--th-card-border)" 
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--th-text-faint)" }}>
                        ATS Analysis Score
                      </span>
                      <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <HelpCircle size={15} />
                      </button>
                    </div>

                    {/* Circular progress display */}
                    <div className="flex justify-center my-6">
                      <CustomRadialGauge value={atsScore} />
                    </div>

                    {/* File descriptions */}
                    <div className="space-y-1 mb-8">
                      <h3 className="text-lg font-bold tracking-tight" style={{ color: "var(--th-text-primary)" }}>
                        New CV: {data.fileName}
                      </h3>
                      <p className="text-xs" style={{ color: "var(--th-text-muted)" }}>
                        Your resume has been analyzed and graded
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        className="btn-secondary !rounded-xl !py-3 justify-center text-xs font-semibold hover:bg-gray-100 flex items-center gap-1.5 border cursor-pointer"
                        style={{ color: "var(--th-text-primary)", borderColor: "var(--th-border-strong)" }}
                      >
                        <Download size={13} /> Download Report
                      </button>
                      <button 
                        onClick={handleReset}
                        className="btn-primary !rounded-xl !py-3 justify-center text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw size={13} /> Upload New
                      </button>
                    </div>
                  </div>

                  {/* Quick Tips Box */}
                  <div 
                    className="p-6 rounded-2xl border space-y-4"
                    style={{ 
                      backgroundColor: "var(--th-card-bg)", 
                      borderColor: "var(--th-card-border)" 
                    }}
                  >
                    <div className="flex items-center gap-2 text-amber-500">
                      <Lightbulb size={16} />
                      <h4 className="text-xs uppercase font-bold tracking-widest">
                        Quick Tips to Improve
                      </h4>
                    </div>
                    <ul className="text-xs space-y-2.5 text-left leading-relaxed animate-none" style={{ color: "var(--th-text-secondary)" }}>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                        <span>Quantify metrics in your work experience bullet points (e.g. state latency reductions, speed-ups, or user scales).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                        <span>Add missing high-value keywords to trigger correct parsing in automated HR screeners.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* ── RIGHT COLUMN: Score breakdowns & detailed checklist (col-span-7) ── */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* 1. Keyword Match Card */}
                  <div 
                    className="p-6 rounded-2xl border"
                    style={{ 
                      backgroundColor: "var(--th-card-bg)", 
                      borderColor: "var(--th-card-border)" 
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          <Database size={15} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--th-text-faint)" }}>
                          Keyword Match
                        </span>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <HelpCircle size={14} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
                      <div>
                        <h4 className="font-semibold text-sm" style={{ color: "var(--th-text-primary)" }}>
                          Keyword Match
                        </h4>
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--th-text-faint)" }}>
                          Industry-relevant terms found in resume
                        </p>
                      </div>
                      
                      <div className="text-right flex items-center gap-4 flex-wrap">
                        <span className="text-xs" style={{ color: "var(--th-text-muted)" }}>
                          Your resume match
                        </span>
                        <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono leading-none">
                          {jdMatchScore}%
                        </span>
                        
                        {/* Dynamic Segmented indicator display */}
                        <SegmentedProgress percent={jdMatchScore} />
                      </div>
                    </div>
                  </div>

                  {/* 2. Formatting Feedback Checklist (Dynamic) */}
                  <div 
                    className="p-6 rounded-2xl border space-y-4"
                    style={{ 
                      backgroundColor: "var(--th-card-bg)", 
                      borderColor: "var(--th-card-border)" 
                    }}
                  >
                    <h4 className="text-xs uppercase font-bold tracking-wider" style={{ color: "var(--th-text-faint)" }}>
                      Formatting & Section Feedback
                    </h4>

                    <div className="grid sm:grid-cols-2 gap-3">
                      {feedbackItems.length > 0 ? (
                        feedbackItems.slice(0, 4).map((item, index) => (
                          <div 
                            key={index}
                            className={cn(
                              "p-3 rounded-xl border flex items-start gap-2.5 text-xs font-semibold",
                              item.type === "success"
                                ? "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/15 text-emerald-800 dark:text-emerald-400"
                                : "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/15 text-amber-800 dark:text-amber-400"
                            )}
                          >
                            {item.type === "success" ? (
                              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-500" />
                            ) : (
                              <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-500" />
                            )}
                            <span>{item.text}</span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="p-3.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/15 flex items-start gap-2.5 text-emerald-850 dark:text-emerald-400">
                            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-500" />
                            <span className="text-xs font-semibold">Clean, ATS-friendly format</span>
                          </div>
                          <div className="p-3.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/15 flex items-start gap-2.5 text-emerald-850 dark:text-emerald-400">
                            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-500" />
                            <span className="text-xs font-semibold">Standard section headings used</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 3. Skill tags side-by-side blocks (Dynamic) */}
                  <div className="grid sm:grid-cols-2 gap-6">
                    
                    {/* Extracted Skills */}
                    <div 
                      className="p-6 rounded-2xl border space-y-4"
                      style={{ 
                        backgroundColor: "var(--th-card-bg)", 
                        borderColor: "var(--th-card-border)" 
                      }}
                    >
                      <h4 className="text-xs uppercase font-bold tracking-wider" style={{ color: "var(--th-text-faint)" }}>
                        Extracted Skills
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {data.parsedSkills.slice(0, 12).map((skill) => (
                          <span
                            key={skill}
                            className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/15"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Missing High-Value Key */}
                    <div 
                      className="p-6 rounded-2xl border space-y-4"
                      style={{ 
                        backgroundColor: "var(--th-card-bg)", 
                        borderColor: "var(--th-card-border)" 
                      }}
                    >
                      <h4 className="text-xs uppercase font-bold tracking-wider" style={{ color: "var(--th-text-faint)" }}>
                        Missing High-Value Keys
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {missingKeys.slice(0, 8).map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/15 cursor-pointer hover:bg-amber-500/10 transition-colors"
                          >
                            + {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                  </div>

                </div>

              </div>

              {/* ── BOTTOM SECTION: Full-Width AI Line-by-Line Suggestions Card ── */}
              {data.suggestions && (
                <div 
                  className="p-6 md:p-8 rounded-2xl border space-y-6"
                  style={{ 
                    backgroundColor: "var(--th-card-bg)", 
                    borderColor: "var(--th-card-border)" 
                  }}
                >
                  <div className="flex items-center gap-2 border-b pb-4" style={{ borderColor: "var(--th-border)" }}>
                    <div className="p-1.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base md:text-lg" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
                        AI Line-by-Line Improvements
                      </h3>
                      <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>
                        Optimized content edits to increase ATS read rate and recruiters&apos; first-glance impact.
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {data.suggestions.map((sug, i) => {
                      const impactColor = sug.impact === "high" ? "coral" : sug.impact === "medium" ? "amber" : "neutral";
                      return (
                        <div 
                          key={i} 
                          className="p-5 rounded-xl border space-y-4 transition-all duration-300 hover:shadow-md" 
                          style={{ 
                            backgroundColor: "var(--th-bg-secondary)", 
                            borderColor: "var(--th-border)" 
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <Badge variant={impactColor}>{sug.impact} impact</Badge>
                          </div>

                          <div className="space-y-3">
                            {/* Original line */}
                            <div className="flex items-start gap-2.5">
                              <XCircle size={14} className="shrink-0 mt-0.5 text-rose-500" />
                              <span className="text-xs md:text-sm line-through leading-relaxed" style={{ color: "var(--th-text-faint)" }}>
                                &quot;{sug.original}&quot;
                              </span>
                            </div>
                            
                            {/* Suggested line */}
                            <div className="flex items-start gap-2.5">
                              <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-emerald-500" />
                              <span className="text-xs md:text-sm font-semibold leading-relaxed" style={{ color: "var(--th-text-primary)" }}>
                                &quot;{sug.suggested}&quot;
                              </span>
                            </div>
                          </div>

                          {/* Rationale callout */}
                          <div className="p-3 rounded-lg border-l-2 bg-blue-500/5 text-[11px] leading-relaxed" style={{ borderColor: "var(--th-primary)", color: "var(--th-text-secondary)" }}>
                            <span className="font-bold text-[#0062FF] mr-1">AI Rationale:</span>
                            {sug.reason}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
