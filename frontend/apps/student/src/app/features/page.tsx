"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Brain, Code2, Mic2, Shield, BarChart3, Users, 
  CheckCircle, ArrowRight, Sparkles, Terminal
} from "lucide-react";
import { useTheme } from "@synclyft/lib/theme";
import FirstNav from "@/components/layout/Firstnav";
import Footer from "@/components/layout/Footer";

const features = [
  {
    id: "adaptive",
    icon: Brain,
    title: "Adaptive Intelligence Engine",
    tag: "AI Core",
    desc: "The SyncLyft platform dynamically adjusts question difficulty based on your performance. It calibrates difficulty in real-time, delivering harder questions as you excel and targeted practice when you hit obstacles.",
    bullets: [
      "Dynamic difficulty adjustment (Aptitude, Coding, and Technical questions)",
      "Targeted focus on weak concepts like Dynamic Programming or System Design",
      "Calibrated pacing to simulate the pressure of real placement rounds",
      "Instant concept-level hints when you are stuck"
    ],
    color: "#7C3AED",
    bg: "rgba(124, 58, 237, 0.08)",
    border: "rgba(124, 58, 237, 0.2)"
  },
  {
    id: "coding",
    icon: Code2,
    title: "Monaco Coding Environment",
    tag: "Coding Round",
    desc: "Code inside a full-featured IDE powered by the Monaco Editor—the same engine behind VS Code. Write, compile, and run your solutions against sandboxed test suites with instant feedback.",
    bullets: [
      "Supports C++, Java, Python, and JavaScript out of the box",
      "Autocompletion, syntax highlighting, and keyboard shortcuts",
      "Comprehensive test case runner showing execution speed and memory usage",
      "Edge case identification and optimal complexity suggestions"
    ],
    color: "#0062FF",
    bg: "rgba(0, 98, 255, 0.08)",
    border: "rgba(0, 98, 255, 0.2)"
  },
  {
    id: "hr",
    icon: Mic2,
    title: "Voice-First HR Round",
    tag: "HR Round",
    desc: "Practice behavioral and HR rounds with a conversational AI interviewer. Respond verbally using your microphone, view real-time voice waveform tracking, and receive instant audits of your delivery.",
    bullets: [
      "Real-time audio waveform visualization and silence detection",
      "Audits for pacing (words per minute), tone, and vocabulary choice",
      "Evaluation based on standard behavioral frameworks (STAR methodology)",
      "Comprehensive transcript generation with actionable improvement recommendations"
    ],
    color: "#10B981",
    bg: "rgba(16, 185, 129, 0.08)",
    border: "rgba(16, 185, 129, 0.2)"
  },
  {
    id: "proctoring",
    icon: Shield,
    title: "Intelligent Proctoring System",
    tag: "Proctoring",
    desc: "A proctoring engine that ensures mock test integrity without invasive tracking. It parses environmental inputs to keep candidate feedback fair and authentic.",
    bullets: [
      "Tab change and window focus tracking",
      "Browser context safety alerts",
      "Non-intrusive logging of irregularities",
      "Detailed session reports for college placement officers"
    ],
    color: "#EF4444",
    bg: "rgba(239, 68, 68, 0.08)",
    border: "rgba(239, 68, 68, 0.2)"
  },
  {
    id: "analytics",
    icon: BarChart3,
    title: "Readiness Analytics Dashboard",
    tag: "Analytics",
    desc: "SyncLyft generates an in-depth readiness profile with clear visual benchmarks. Understand your placement index, compare against cohort percentiles, and follow step-by-step optimization recommendations.",
    bullets: [
      "Placement readiness index out of 100 calculated from mock rounds",
      "Interactive radar charts mapping core competencies (DS, Algo, OOPs)",
      "Historical score tracking over 8-week cycles with trend lines",
      "AI-generated candidate reports detailing strengths and improvement areas"
    ],
    color: "#0EA5E9",
    bg: "rgba(14, 165, 233, 0.08)",
    border: "rgba(14, 165, 233, 0.2)"
  },
  {
    id: "officer",
    icon: Users,
    title: "Placement Officer Portal",
    tag: "Cohort Management",
    desc: "Designed for administrators and placement cells to manage mock drives at scale. Review batch analytics, audit individual student reports, and generate custom placement lists.",
    bullets: [
      "Consolidated student readiness indices across entire classes",
      "Filter candidates by readiness bands, skills, or mock test activity",
      "Natural language querying interface to ask questions about cohort metrics",
      "Direct CSV/PDF export of student placement readiness stats"
    ],
    color: "#F59E0B",
    bg: "rgba(245, 158, 11, 0.08)",
    border: "rgba(245, 158, 11, 0.2)"
  }
];

export default function FeaturesPage() {
  const [activeTab, setActiveTab] = useState(features[0].id);
  const currentFeature = features.find((f) => f.id === activeTab) || features[0];
  const FeatureIcon = currentFeature.icon;
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Dynamic background style based on active module color
  const dynamicBgStyle = {
    background: isDark 
      ? `radial-gradient(circle at 80% 20%, ${currentFeature.color}15 0%, var(--th-bg) 70%)`
      : `radial-gradient(circle at 80% 20%, ${currentFeature.color}0A 0%, var(--th-bg) 70%)`,
    transition: "background 500ms ease"
  };

  return (
    <div 
      className="min-h-screen pb-20 transition-all duration-500" 
      style={{ 
        ...dynamicBgStyle,
        color: "var(--th-text-primary)", 
        fontFamily: "var(--font-inter), sans-serif" 
      }}
    >
      {/* Navbar */}
      <FirstNav />

      {/* Main Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 space-y-12 animate-fadeInUp">
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0062FF]/10 text-[#0062FF] text-xs font-bold uppercase tracking-wider">
              <Sparkles size={12} /> Platform Features
            </span>
          </div>
          <h1 
            className="text-[2.5rem] font-bold tracking-tight leading-none"
            style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}
          >
            AI-powered preparation, built for campus placements.
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
            SyncLyft is a comprehensive preparation suite designed to close the prep-to-placement gap. Practice across Aptitude, Coding, Technical, and behavioral HR rounds in a single unified environment.
          </p>
        </div>

        {/* Feature grid with sidebar tabs */}
        <div className="grid md:grid-cols-12 gap-8 items-stretch pt-6">
          {/* Tabs */}
          <div className="md:col-span-4 space-y-2">
            {features.map((f) => {
              const Icon = f.icon;
              const isActive = f.id === activeTab;
              return (
                <motion.button
                  key={f.id}
                  onClick={() => setActiveTab(f.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-left text-xs font-bold transition-all border-0 cursor-pointer"
                  style={{
                    backgroundColor: isActive 
                      ? (isDark ? "rgba(255, 255, 255, 0.06)" : "var(--th-bg-secondary)")
                      : "transparent",
                    color: "var(--th-text-secondary)",
                    borderLeft: isActive ? `4px solid ${f.color}` : "4px solid transparent",
                    boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.02)" : "none",
                  }}
                >
                  <motion.div 
                    className="p-1.5 rounded-lg shrink-0" 
                    style={{ 
                      backgroundColor: isActive ? `${f.color}20` : "var(--th-bg-secondary)", 
                      color: isActive ? f.color : "var(--th-text-muted)" 
                    }}
                    animate={isActive ? { rotate: [0, -10, 15, 0], scale: [1, 1.2, 0.95, 1] } : { rotate: 0, scale: 1 }}
                    transition={{ 
                      rotate: { duration: 0.5, ease: "easeInOut" },
                      scale: { duration: 0.5, ease: "easeOut" }
                    }}
                  >
                    <Icon size={15} />
                  </motion.div>
                  <span style={{ color: "var(--th-text-primary)" }}>{f.title}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Details Panel */}
          <div className="md:col-span-8">
            <motion.div 
              key={currentFeature.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="p-8 rounded-2xl border flex flex-col justify-between h-full text-left"
              style={{ 
                backgroundColor: isDark ? "var(--th-card-bg)" : "var(--th-card-bg-alt)", 
                borderColor: "var(--th-card-border)",
              }}
            >
              <div className="space-y-6">
                {/* Header info */}
                <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--th-border)" }}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl text-white" style={{ backgroundColor: currentFeature.color }}>
                      <FeatureIcon size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base" style={{ color: "var(--th-text-primary)" }}>{currentFeature.title}</h3>
                      <p className="text-[10px] uppercase tracking-wider text-left mt-0.5" style={{ color: "var(--th-text-faint)" }}>{currentFeature.tag}</p>
                    </div>
                  </div>
                  <span 
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border" 
                    style={{ 
                      backgroundColor: "var(--th-bg-secondary)", 
                      borderColor: "var(--th-border)", 
                      color: "var(--th-text-secondary)"
                    }}
                  >
                    {currentFeature.tag}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
                  {currentFeature.desc}
                </p>

                {/* Bullets */}
                <div className="space-y-3.5 pt-2">
                  <h4 className="text-[10px] uppercase font-bold tracking-widest" style={{ color: "var(--th-text-faint)" }}>Key Capabilities</h4>
                  <ul className="space-y-2.5">
                    {currentFeature.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-xs" style={{ color: "var(--th-text-secondary)" }}>
                        <CheckCircle size={14} className="text-[#3DDC84] shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action */}
              <div className="pt-8 border-t mt-8 flex justify-between items-center" style={{ borderColor: "var(--th-border)" }}>
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-faint)" }}>
                  SyncLyft AI Platform
                </span>
                <Link href="/register">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0062FF] hover:gap-2 transition-all cursor-pointer">
                    Try this round now <ArrowRight size={13} />
                  </span>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Console Demo Panel */}
        <div 
          className="p-8 rounded-2xl border flex flex-col md:flex-row items-center gap-8 text-left" 
          style={{ 
            backgroundColor: isDark ? "var(--th-card-bg)" : "var(--th-card-bg-alt)", 
            borderColor: "var(--th-border)" 
          }}
        >
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 hidden sm:block self-start mt-1">
            <Terminal size={22} />
          </div>
          <div className="space-y-4 flex-1">
            <h3 className="font-bold text-sm" style={{ color: "var(--th-text-primary)" }}>Ready to test your alignment?</h3>
            <p className="text-xs leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
              SyncLyft registers your coding profiles (GitHub, LeetCode) to automatically audit and parse your portfolio. Start practicing adaptive mock tests to elevate your readiness percentile before companies arrive on campus.
            </p>
            <div className="pt-2">
              <Link href="/register">
                <span className="inline-flex items-center gap-1.5 bg-[#0062FF] hover:bg-[#004BE6] text-white px-5 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer">
                  Create a Free Candidate Account <ArrowRight size={13} />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
