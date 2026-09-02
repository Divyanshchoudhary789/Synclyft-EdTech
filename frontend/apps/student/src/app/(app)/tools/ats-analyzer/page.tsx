"use client";

import toast from "react-hot-toast";
import { useState, useEffect } from "react";
import { Button } from "@synclyft/ui/components/Button";
import {
  RefreshCw, Download, X, Save, Sparkles, 
  Code2, Check, FileCheck, Trash2, Plus,
  ArrowUp, ArrowDown, FileSpreadsheet
} from "lucide-react";
import { cn } from "@synclyft/lib/utils";
import { useAuthStore } from "@synclyft/lib/store/auth";
import {api} from "@synclyft/lib/api"

import {
  ResumeTemplate,
  paperBgStyles,
  TemplateType,
  PaperColorType,
  SectionType,
  ProfileState,
  ExpItem,
  EduItem,
  ProjectItem,
  CertItem
} from "./ResumeTemplate";


type ActiveTab = "profile" | "experience" | "education" | "projects" | "certificates" | "sections";

// Thick Glowing blue circular gauge component
function SimpleBlueGauge({ value, max = 100 }: { value: number; max?: number }) {
  const pct = value / max;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <div className="relative w-32 h-32 flex items-center justify-center mx-auto">
      <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="var(--th-bg-secondary)" strokeWidth="12" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="#0062FF"
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-[var(--th-text-primary)] font-mono leading-none">{value}%</span>
        <span className="text-[8px] uppercase tracking-wider font-bold mt-1 text-[var(--th-text-faint)]">ATS Rating</span>
      </div>
    </div>
  );
}

export default function ATSAnalyzerPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("profile");
  const [template, setTemplate] = useState<TemplateType>("minimalist");
  const [paperColor, setPaperColor] = useState<PaperColorType>("white");
  const [atsMode, setAtsMode] = useState(false);
  const { user, fetchUser } = useAuthStore();
  const [targetRole, setTargetRole] = useState("Full Stack Developer");
  const [experienceLevel, setExperienceLevel] = useState("Fresher");

  // Job description modal state
  const [showJobDescModal, setShowJobDescModal] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [title, setTitle] = useState("");
  const [techStack, setTechStack] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Section Ordering preference state
  const [sectionsOrder, setSectionsOrder] = useState<SectionType[]>([
    "education",
    "experience",
    "projects",
    "skills",
    "certificates"
  ]);

  // Editor States
  const [profile, setProfile] = useState<ProfileState>({
    name: "",
    email: "",
    phone: "+91 xxx xxx xxxx",
    location: "Mumbai, India",
    linkedin: "",
    github: "",
    website: "",
    summary: "Full Stack Developer building scalable web apps using React, Node.js, Express and MongoDB. Shipped 10+ production features with focus on performance and clean architecture."
  });

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        setProfile((prev) => ({
          ...prev,
          name: user.name || prev.name,
          email: user.email || prev.email,
          linkedin: (user as any).socialLinks?.linkedin || (user as any).linkedin || prev.linkedin,
          github: (user as any).socialLinks?.github || (user as any).github || prev.github,
        }));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const [skills, setSkills] = useState("Python, React, TypeScript, Node.js, PostgreSQL, Redis");

  // Dynamic Work Experience List
  const [experience, setExperience] = useState<ExpItem[]>([
    {
      id: "exp1",
      role: "SDE Intern",
      company: "Amazon",
      date: "6 months",
      bullet1: "Worked on building microservice for real-time inventory sync",
      bullet2: "Coordinated with senior devs to deploy systems"
    },
    {
      id: "exp2",
      role: "Research Assistant",
      company: "IIT Bombay ML Lab",
      date: "1 year",
      bullet1: "Did research on transformer models for NLP",
      bullet2: "Analyzed model results and compiled findings"
    }
  ]);

  // Dynamic Education List
  const [education, setEducation] = useState<EduItem[]>([
    {
      id: "edu1",
      college: "IIT Bombay",
      degree: "B.Tech Computer Science",
      gradYear: "2025"
    }
  ]);

  // Dynamic Projects List
  const [projects, setProjects] = useState<ProjectItem[]>([
    {
      id: "proj1",
      title: "SyncLyft EdTech Portal",
      technologies: "Next.js, TypeScript, Three.js, Recharts",
      description: "Developed an interactive candidate preparation dashboard featuring 3D visualizations and live resume optimizer mechanics."
    }
  ]);

  // Dynamic Certificates List
  const [certificates, setCertificates] = useState<CertItem[]>([
    {
      id: "cert1",
      title: "AWS Certified Solutions Architect",
      issuer: "Amazon Web Services",
      date: "2025"
    }
  ]);

  // AI Analysis States
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Record<string, boolean>>({});

  // Dynamic ATS Score Calculation (base 68, +10 for each applied phrasing correction)
  const [atsScore, setAtsScore] = useState(68);

  // Suggestions mapping
  const suggestions = [
    {
      id: "sug1",
      expId: "exp1",
      field: "bullet1" as const,
      original: "Worked on building microservice for real-time inventory sync",
      suggested: "Engineered a real-time inventory sync microservice handling 50K req/s, reducing latency by 40%",
      reason: "Adds quantified metrics and stronger action verbs — critical for SDE roles."
    },
    {
      id: "sug2",
      expId: "exp2",
      field: "bullet1" as const,
      original: "Did research on transformer models for NLP",
      suggested: "Fine-tuned BERT-based transformer models achieving 94.2% F1 on domain-specific NER tasks",
      reason: "Adds specific transformer models and performance indicators to signal technical depth."
    },
    {
      id: "sug3",
      type: "skills" as const,
      original: "Docker, Kubernetes, CI/CD",
      suggested: "Docker, Kubernetes, CI/CD",
      reason: "High-value deployment keywords missing in your skills profile section."
    }
  ];

  // Enforce single column and white layout guidelines when ATS Mode is enabled
  useEffect(() => {
    if (atsMode) {
      setTimeout(() => {
        setTemplate("minimalist");
        setPaperColor("white");
      }, 0);
    }
  }, [atsMode]);

  // Opens job description modal first
  const handleRunAnalysis = async () => {
    setShowJobDescModal(true);
  };

  // Real AI analysis result from POST /resume/optimize-ai
  const [aiResult, setAiResult] = useState<{
    atsScoreEstimate: number;
    missingKeywords: string[];
    matchedKeywords?: string[];
    summarySuggestion: string;
    experienceImprovements: string[];
    projectImprovements: string[];
    certificationImprovements: string[];
    generalTips: string[];
  } | null>(null);

  // Called after user submits / skips job description
  const handleStartAnalysis = async () => {
    setShowJobDescModal(false);
    setAnalyzing(true);
    setScanProgress(10);
    try {
      const payload = {
        targetRole,
        experienceLevel,
        targetJD: jobDescription || undefined,
        personalInfo: profile,
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        experience,
        projects,
        certificates,
      };
      setScanProgress(45);
      const res = await api.post("/resume/optimize-ai", payload);
      const data = (res.data?.suggestions ?? res.data?.data ?? res.data) as typeof aiResult;
      setScanProgress(100);
      if (data) {
        setAiResult(data);
        setAtsScore(Math.round(data.atsScoreEstimate ?? atsScore));
      }
      setAnalyzed(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const applySuggestion = (sugId: string) => {
    const sug = suggestions.find((s) => s.id === sugId);
    if (!sug) return;

    if (sug.id === "sug3" && sug.type === "skills") {
      setSkills((prev) => `${prev}, Docker, Kubernetes, CI/CD`);
    } else if (sug.expId && sug.field) {
      setExperience((prev) =>
        prev.map((item) => {
          if (item.id === sug.expId) {
            return { ...item, [sug.field]: sug.suggested };
          }
          return item;
        })
      );
    }

    setAppliedSuggestions((prev) => ({ ...prev, [sugId]: true }));
    setAtsScore((prev) => Math.min(100, prev + 10));
  };

  // Section Ordering Handlers
  const moveSection = (index: number, direction: number) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= sectionsOrder.length) return;
    const newOrder = [...sectionsOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[nextIndex];
    newOrder[nextIndex] = temp;
    setSectionsOrder(newOrder);
  };

  // Field creation handlers
  const addExperience = () => {
    setExperience([
      ...experience,
      {
        id: `exp-${Date.now()}`,
        role: "Software Engineer",
        company: "Company Name",
        date: "2025 - Present",
        bullet1: "Describe key responsibilities and metrics...",
        bullet2: ""
      }
    ]);
  };

  const removeExperience = (id: string) => {
    setExperience(experience.filter((exp) => exp.id !== id));
  };

  const addEducation = () => {
    setEducation([
      ...education,
      {
        id: `edu-${Date.now()}`,
        college: "University Name",
        degree: "B.S. Computer Science",
        gradYear: "2026"
      }
    ]);
  };

  const removeEducation = (id: string) => {
    setEducation(education.filter((edu) => edu.id !== id));
  };

  const addProject = () => {
    setProjects([
      ...projects,
      {
        id: `proj-${Date.now()}`,
        title: "Project Title",
        technologies: "React, Node.js",
        description: "Developed an application solving target problem statements..."
      }
    ]);
  };

  const removeProject = (id: string) => {
    setProjects(projects.filter((proj) => proj.id !== id));
  };

  const addCertificate = () => {
    setCertificates([
      ...certificates,
      {
        id: `cert-${Date.now()}`,
        title: "Certificate Name",
        issuer: "Issuing Organization",
        date: "2026"
      }
    ]);
  };

  const removeCertificate = (id: string) => {
    setCertificates(certificates.filter((cert) => cert.id !== id));
  };

  // ── EXPORT ACTION HANDLERS ──
  const [savingResume, setSavingResume] = useState(false);

  const saveResume = async () => {
    setSavingResume(true);
    try {
      const payload = {
        title: `${profile.name} - ${targetRole}`,
        templateId: template === "modern" ? "template_1" : template === "minimalist" ? "template_2" : "template_3",
        targetRole: targetRole,
        experienceLevel: experienceLevel,
        targetJD: jobDescription,
        personalInfo: {
          fullName: profile.name,
          email: profile.email,
          phone: profile.phone,
          linkedin: profile.linkedin,
          github: profile.github,
          summary: profile.summary
        },
        education: education.map(edu => ({
          institution: edu.college,
          degree: edu.degree,
          startDate: (parseInt(edu.gradYear) - 3 || 2021).toString(),
          endDate: edu.gradYear,
          grade: ""
        })),
        experience: experience.map(exp => ({
          company: exp.company,
          position: exp.role,
          startDate: "2024-01",
          endDate: exp.date,
          description: `${exp.bullet1 || ""} ${exp.bullet2 || ""}`.trim()
        })),
        skills: skills.split(",").map(s => s.trim()).filter(Boolean),
        projects: projects.map(proj => ({
          title: proj.title,
          description: proj.description,
          technologies: proj.technologies.split(",").map(t => t.trim()).filter(Boolean),
          githubUrl: "",
          liveUrl: ""
        })),
        certificates: certificates.map(c => ({
          title: c.title,
          issuer: c.issuer,
          date: c.date
        }))
      };

      console.log("Saving resume payload:", payload);
      await api.post("resume/save", payload);
      toast("Resume saved successfully!");
    } catch (err: any) {
      console.error("Failed to save resume:", err);
      toast("Failed to save resume. Please try again.");
    } finally {
      setSavingResume(false);
    }
  };

  const downloadPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const resumeHtml = document.getElementById("resume-sheet-content")?.innerHTML || "";
    const paperThemeStyles = paperColor === "slate"
      ? "background-color: #0F172A; color: #FFFFFF;"
      : paperColor === "cream"
        ? "background-color: #FDFBF7; color: #2F2A21;"
        : paperColor === "emerald"
          ? "background-color: #F3FAF6; color: #1B3024;"
          : paperColor === "blue"
            ? "background-color: #F0F6FF; color: #1E2E4A;"
            : "background-color: #FFFFFF; color: #333333;";

    printWindow.document.write(`
      <html>
        <head>
          <title>${profile.name} - Resume</title>
          <style>
            @page {
              size: auto;
              margin: 0;
            }
            body { 
              font-family: Georgia, serif; 
              line-height: 1.4; 
              padding: 40px; 
              ${paperThemeStyles}
            }
            h1, h2 { text-align: center; }
            .border-b { border-bottom: 1px solid #bbb; padding-bottom: 4px; }
            ul { padding-left: 20px; }
            @media print {
              body { 
                margin: 1.6cm 2cm; 
                padding: 0;
                ${paperThemeStyles}
              }
            }
          </style>
        </head>
        <body>
          <div>${resumeHtml}</div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{ fontFamily: "var(--font-inter), sans-serif" }}>

      {/* Main Grid Workspace */}
      <div className="space-y-6">

        {/* Top title and Template switcher block */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b" style={{ borderColor: "var(--th-border)" }}>
          <div>
            <p className="label-caption mb-1" style={{ color: "var(--th-text-faint)" }}>Resume Studio</p>
            <h1 className="text-2xl sm:text-[2rem] font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
              Resume builder &amp; AI advisor
            </h1>
          </div>

          {/* Color swatches & Format Switcher Row */}
          <div className="flex items-center gap-3 flex-wrap">

            {/* Color Swatch Selectors */}
            <div className="flex items-center gap-1.5 bg-[var(--th-bg-secondary)] px-2.5 py-1.5 rounded-xl border" style={{ borderColor: "var(--th-border-strong)" }}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--th-text-faint)] mr-1">Paper Theme:</span>
              {[
                { key: "white", color: "bg-white border-gray-300" },
                { key: "cream", color: "bg-[#FDFBF7] border-[#E8E1CE]" },
                { key: "slate", color: "bg-slate-900 border-slate-700" },
                { key: "emerald", color: "bg-[#F3FAF6] border-[#D8EFE0]" },
                { key: "blue", color: "bg-[#F0F6FF] border-[#D1E3FF]" },
              ].map((swatch) => (
                <button
                  key={swatch.key}
                  onClick={() => setPaperColor(swatch.key as any)}
                  className={cn(
                    "w-4 h-4 rounded-full border cursor-pointer transition-transform hover:scale-110",
                    paperColor === swatch.key ? "ring-2 ring-blue-500 scale-110" : ""
                  )}
                  style={{ backgroundColor: swatch.key === "white" ? "#FFFFFF" : swatch.key === "cream" ? "#FDFBF7" : swatch.key === "slate" ? "#1E293B" : swatch.key === "emerald" ? "#DCEFE3" : "#D1E2FF" }}
                  title={`Use ${swatch.key} background`}
                />
              ))}
            </div>

            {/* Template Format Selector */}
            <div className="flex items-center gap-1 bg-[var(--th-bg-secondary)] p-1 rounded-xl border" style={{ borderColor: "var(--th-border-strong)" }}>
              {(["minimalist","executive"] as TemplateType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTemplate(t)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer",
                    template === t
                      ? "bg-[#0062FF] text-white shadow-sm"
                      : "text-[var(--th-text-secondary)] hover:text-[var(--th-text-primary)]"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── 3 COLUMN PANEL WORKSPACE ── */}
        <div className="grid lg:grid-cols-12 gap-4 lg:gap-6 items-start">

          {/* PANEL 1: RESUME EDITOR (col-span-4) */}
          <div className="lg:col-span-4 space-y-4">
            <div
              className="p-5 rounded-2xl border"
              style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}
            >
              <div className="flex items-center gap-2 mb-4 border-b pb-3" style={{ borderColor: "var(--th-border)" }}>
                <Code2 size={16} className="text-[#0062FF]" />
                <h3 className="font-bold text-sm text-[var(--th-text-primary)]">Resume Editor</h3>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b mb-5 overflow-x-auto select-none" style={{ borderColor: "var(--th-border)" }}>
                {(["profile", "experience", "education", "projects", "certificates", "sections"] as ActiveTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "flex-1 pb-2 text-xs font-semibold capitalize border-b-2 transition-all cursor-pointer min-w-[70px]",
                      activeTab === tab
                        ? "border-[#0062FF] text-[#0062FF]"
                        : "border-transparent text-[var(--th-text-faint)]"
                    )}
                  >
                    {tab === "sections" ? "Order" : tab === "certificates" ? "Certs" : tab}
                  </button>
                ))}
              </div>

              {/* Tab Content forms */}
              <div className="space-y-4 text-left">

                {/* A. PROFILE TAB */}
                {activeTab === "profile" && (
                  <div className="space-y-3.5 animate-none">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Full Name</label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)] bg-[var(--th-input-bg)]"
                        style={{ borderColor: "var(--th-border-strong)" }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Email</label>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)] bg-[var(--th-input-bg)]"
                        style={{ borderColor: "var(--th-border-strong)" }}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Phone</label>
                        <input
                          type="text"
                          value={profile.phone}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)] bg-[var(--th-input-bg)]"
                          style={{ borderColor: "var(--th-border-strong)" }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Location</label>
                        <input
                          type="text"
                          value={profile.location}
                          onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)] bg-[var(--th-input-bg)]"
                          style={{ borderColor: "var(--th-border-strong)" }}
                        />
                      </div>
                    </div>

                    {/* Social links creation inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t" style={{ borderColor: "var(--th-border)" }}>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">LinkedIn Link</label>
                        <input
                          type="text"
                          value={profile.linkedin}
                          onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)] bg-[var(--th-input-bg)]"
                          style={{ borderColor: "var(--th-border-strong)" }}
                          placeholder="linkedin.com/in/username"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">GitHub Link</label>
                        <input
                          type="text"
                          value={profile.github}
                          onChange={(e) => setProfile({ ...profile, github: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)] bg-[var(--th-input-bg)]"
                          style={{ borderColor: "var(--th-border-strong)" }}
                          placeholder="github.com/username"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Personal Portfolio URL</label>
                      <input
                        type="text"
                        value={profile.website}
                        onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)] bg-[var(--th-input-bg)]"
                        style={{ borderColor: "var(--th-border-strong)" }}
                        placeholder="portfolio.dev"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t" style={{ borderColor: "var(--th-border)" }}>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Target Role</label>
                        <input
                          type="text"
                          value={targetRole}
                          onChange={(e) => setTargetRole(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)] bg-[var(--th-input-bg)]"
                          style={{ borderColor: "var(--th-border-strong)" }}
                          placeholder="Full Stack Developer"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Experience Level</label>
                        <select
                          value={experienceLevel}
                          onChange={(e) => setExperienceLevel(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)] bg-[var(--th-input-bg)]"
                          style={{ borderColor: "var(--th-border-strong)" }}
                        >
                          {["Fresher", "Intermediate", "Experienced"].map((x) => (
                            <option key={x} value={x}>{x}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Professional Summary</label>
                      <textarea
                        value={profile.summary}
                        onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
                        className="w-full h-20 p-2.5 rounded-lg border text-xs text-[var(--th-text-primary)] bg-[var(--th-input-bg)] resize-none"
                        style={{ borderColor: "var(--th-border-strong)" }}
                      />
                    </div>

                    <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: "var(--th-border)" }}>
                      <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Skills profile (comma separated)</label>
                      <textarea
                        value={skills}
                        onChange={(e) => setSkills(e.target.value)}
                        className="w-full h-20 p-2.5 rounded-lg border text-xs text-[var(--th-text-primary)] bg-[var(--th-input-bg)] resize-none"
                        style={{ borderColor: "var(--th-border-strong)" }}
                      />
                    </div>
                  </div>
                )}

                {/* B. EXPERIENCE TAB */}
                {activeTab === "experience" && (
                  <div className="space-y-5">
                    {experience.map((exp, idx) => (
                      <div key={exp.id} className="p-3.5 rounded-xl border space-y-3 bg-[var(--th-bg-secondary)] relative" style={{ borderColor: "var(--th-border)" }}>
                        <button
                          onClick={() => removeExperience(exp.id)}
                          className="absolute top-3.5 right-3.5 text-rose-500 hover:text-rose-600 cursor-pointer border-none bg-transparent"
                          title="Delete Position"
                        >
                          <Trash2 size={14} />
                        </button>

                        <div className="flex items-center justify-between border-b pb-1.5" style={{ borderColor: "var(--th-border-strong)" }}>
                          <span className="text-[10px] font-bold uppercase text-[var(--th-text-faint)]">Position #{idx + 1}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="space-y-0.5">
                            <label className="text-[8px] uppercase font-bold text-[var(--th-text-faint)]">Role</label>
                            <input
                              type="text"
                              value={exp.role}
                              onChange={(e) => {
                                const newExp = [...experience];
                                newExp[idx].role = e.target.value;
                                setExperience(newExp);
                              }}
                              className="w-full px-2 py-1 rounded border text-[11px] text-[var(--th-text-primary)] bg-[var(--th-input-bg)]"
                              style={{ borderColor: "var(--th-border-strong)" }}
                            />
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-[8px] uppercase font-bold text-[var(--th-text-faint)]">Company</label>
                            <input
                              type="text"
                              value={exp.company}
                              onChange={(e) => {
                                const newExp = [...experience];
                                newExp[idx].company = e.target.value;
                                setExperience(newExp);
                              }}
                              className="w-full px-2 py-1 rounded border text-[11px] text-[var(--th-text-primary)] bg-[var(--th-input-bg)]"
                              style={{ borderColor: "var(--th-border-strong)" }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="space-y-0.5 col-span-2">
                            <label className="text-[8px] uppercase font-bold text-[var(--th-text-faint)]">Dates / Duration</label>
                            <input
                              type="text"
                              value={exp.date}
                              onChange={(e) => {
                                const newExp = [...experience];
                                newExp[idx].date = e.target.value;
                                setExperience(newExp);
                              }}
                              className="w-full px-2 py-1 rounded border text-[11px] text-[var(--th-text-primary)] bg-[var(--th-input-bg)]"
                              style={{ borderColor: "var(--th-border-strong)" }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[8px] uppercase font-bold text-[var(--th-text-faint)]">Key Achievement</label>
                          <textarea
                            value={exp.bullet1}
                            onChange={(e) => {
                              const newExp = [...experience];
                              newExp[idx].bullet1 = e.target.value;
                              setExperience(newExp);
                            }}
                            className="w-full h-12 p-2 rounded border text-[11px] text-[var(--th-text-primary)] bg-[var(--th-input-bg)] resize-none"
                            style={{ borderColor: "var(--th-border-strong)" }}
                          />
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={addExperience}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold border border-dashed rounded-xl hover:bg-gray-155 dark:hover:bg-gray-800 transition-colors text-[var(--th-text-primary)] cursor-pointer bg-transparent"
                      style={{ borderColor: "var(--th-border-strong)" }}
                    >
                      <Plus size={14} /> Add Work Position
                    </button>
                  </div>
                )}

                {/* C. EDUCATION TAB */}
                {activeTab === "education" && (
                  <div className="space-y-5">
                    {education.map((edu, idx) => (
                      <div key={edu.id} className="p-3.5 rounded-xl border space-y-3 bg-[var(--th-bg-secondary)] relative" style={{ borderColor: "var(--th-border)" }}>
                        <button
                          onClick={() => removeEducation(edu.id)}
                          className="absolute top-3.5 right-3.5 text-rose-500 hover:text-rose-600 cursor-pointer border-none bg-transparent"
                          title="Delete Education"
                        >
                          <Trash2 size={14} />
                        </button>

                        <div className="flex items-center justify-between border-b pb-1.5" style={{ borderColor: "var(--th-border-strong)" }}>
                          <span className="text-[10px] font-bold uppercase text-[var(--th-text-faint)]">Education #{idx + 1}</span>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[8px] uppercase font-bold text-[var(--th-text-faint)]">School / College</label>
                          <input
                            type="text"
                            value={edu.college}
                            onChange={(e) => {
                              const newEdu = [...education];
                              newEdu[idx].college = e.target.value;
                              setEducation(newEdu);
                            }}
                            className="w-full px-2 py-1 rounded border text-[11px] text-[var(--th-text-primary)] bg-[var(--th-input-bg)]"
                            style={{ borderColor: "var(--th-border-strong)" }}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="space-y-0.5">
                            <label className="text-[8px] uppercase font-bold text-[var(--th-text-faint)]">Degree</label>
                            <input
                              type="text"
                              value={edu.degree}
                              onChange={(e) => {
                                const newEdu = [...education];
                                newEdu[idx].degree = e.target.value;
                                setEducation(newEdu);
                              }}
                              className="w-full px-2 py-1 rounded border text-[11px] text-[var(--th-text-primary)] bg-[var(--th-input-bg)]"
                              style={{ borderColor: "var(--th-border-strong)" }}
                            />
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-[8px] uppercase font-bold text-[var(--th-text-faint)]">Grad Year</label>
                            <input
                              type="text"
                              value={edu.gradYear}
                              onChange={(e) => {
                                const newEdu = [...education];
                                newEdu[idx].gradYear = e.target.value;
                                setEducation(newEdu);
                              }}
                              className="w-full px-2 py-1 rounded border text-[11px] text-[var(--th-text-primary)] bg-[var(--th-input-bg)]"
                              style={{ borderColor: "var(--th-border-strong)" }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={addEducation}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold border border-dashed rounded-xl hover:bg-gray-155 dark:hover:bg-gray-800 transition-colors text-[var(--th-text-primary)] cursor-pointer bg-transparent"
                      style={{ borderColor: "var(--th-border-strong)" }}
                    >
                      <Plus size={14} /> Add Education
                    </button>
                  </div>
                )}

                {/* D. PROJECTS TAB */}
                {activeTab === "projects" && (
                  <div className="space-y-5">
                    {projects.map((proj, idx) => (
                      <div key={proj.id} className="p-3.5 rounded-xl border space-y-3 bg-[var(--th-bg-secondary)] relative" style={{ borderColor: "var(--th-border)" }}>
                        <button
                          onClick={() => removeProject(proj.id)}
                          className="absolute top-3.5 right-3.5 text-rose-500 hover:text-rose-600 cursor-pointer border-none bg-transparent"
                          title="Delete Project"
                        >
                          <Trash2 size={14} />
                        </button>

                        <div className="flex items-center justify-between border-b pb-1.5" style={{ borderColor: "var(--th-border-strong)" }}>
                          <span className="text-[10px] font-bold uppercase text-[var(--th-text-faint)]">Project #{idx + 1}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="space-y-0.5 text-left">
                            <label className="text-[8px] uppercase font-bold text-[var(--th-text-faint)]">Project Title</label>
                            <input
                              type="text"
                              value={proj.title}
                              onChange={(e) => {
                                const newProj = [...projects];
                                newProj[idx].title = e.target.value;
                                setProjects(newProj);
                              }}
                              className="w-full px-2 py-1 rounded border text-[11px] text-[var(--th-text-primary)] bg-[var(--th-input-bg)]"
                              style={{ borderColor: "var(--th-border-strong)" }}
                            />
                          </div>
                          <div className="space-y-0.5 text-left">
                            <label className="text-[8px] uppercase font-bold text-[var(--th-text-faint)]">Technologies</label>
                            <input
                              type="text"
                              value={proj.technologies}
                              onChange={(e) => {
                                const newProj = [...projects];
                                newProj[idx].technologies = e.target.value;
                                setProjects(newProj);
                              }}
                              className="w-full px-2 py-1 rounded border text-[11px] text-[var(--th-text-primary)] bg-[var(--th-input-bg)]"
                              style={{ borderColor: "var(--th-border-strong)" }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[8px] uppercase font-bold text-[var(--th-text-faint)]">Description</label>
                          <textarea
                            value={proj.description}
                            onChange={(e) => {
                              const newProj = [...projects];
                              newProj[idx].description = e.target.value;
                              setProjects(newProj);
                            }}
                            className="w-full h-12 p-2 rounded border text-[11px] text-[var(--th-text-primary)] bg-[var(--th-input-bg)] resize-none"
                            style={{ borderColor: "var(--th-border-strong)" }}
                          />
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={addProject}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold border border-dashed rounded-xl hover:bg-gray-155 dark:hover:bg-gray-800 transition-colors text-[var(--th-text-primary)] cursor-pointer bg-transparent"
                      style={{ borderColor: "var(--th-border-strong)" }}
                    >
                      <Plus size={14} /> Add Key Project
                    </button>
                  </div>
                )}

                {/* Certificates TAB */}
                {activeTab === "certificates" && (
                  <div className="space-y-5">
                    {certificates.map((cert, idx) => (
                      <div key={cert.id} className="p-3.5 rounded-xl border space-y-3 bg-[var(--th-bg-secondary)] relative" style={{ borderColor: "var(--th-border)" }}>
                        <button
                          type="button"
                          onClick={() => removeCertificate(cert.id)}
                          className="absolute top-3.5 right-3.5 text-rose-500 hover:text-rose-600 cursor-pointer border-none bg-transparent"
                          title="Delete Certificate"
                        >
                          <Trash2 size={14} />
                        </button>

                        <div className="flex items-center justify-between border-b pb-1.5" style={{ borderColor: "var(--th-border-strong)" }}>
                          <span className="text-[10px] font-bold uppercase text-[var(--th-text-faint)]">Certificate #{idx + 1}</span>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[8px] uppercase font-bold text-[var(--th-text-faint)]">Certificate Title</label>
                          <input
                            type="text"
                            value={cert.title}
                            onChange={(e) => {
                              const newCerts = [...certificates];
                              newCerts[idx].title = e.target.value;
                              setCertificates(newCerts);
                            }}
                            className="w-full px-2 py-1 rounded border text-[11px] text-[var(--th-text-primary)] bg-[var(--th-input-bg)]"
                            style={{ borderColor: "var(--th-border-strong)" }}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className="space-y-0.5 text-left">
                            <label className="text-[8px] uppercase font-bold text-[var(--th-text-faint)]">Issuer</label>
                            <input
                              type="text"
                              value={cert.issuer}
                              onChange={(e) => {
                                const newCerts = [...certificates];
                                newCerts[idx].issuer = e.target.value;
                                setCertificates(newCerts);
                              }}
                              className="w-full px-2 py-1 rounded border text-[11px] text-[var(--th-text-primary)] bg-[var(--th-input-bg)]"
                              style={{ borderColor: "var(--th-border-strong)" }}
                            />
                          </div>
                          <div className="space-y-0.5 text-left">
                            <label className="text-[8px] uppercase font-bold text-[var(--th-text-faint)]">Year / Date</label>
                            <input
                              type="text"
                              value={cert.date}
                              onChange={(e) => {
                                const newCerts = [...certificates];
                                newCerts[idx].date = e.target.value;
                                setCertificates(newCerts);
                              }}
                              className="w-full px-2 py-1 rounded border text-[11px] text-[var(--th-text-primary)] bg-[var(--th-input-bg)]"
                              style={{ borderColor: "var(--th-border-strong)" }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addCertificate}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold border border-dashed rounded-xl hover:bg-gray-155 dark:hover:bg-gray-800 transition-colors text-[var(--th-text-primary)] cursor-pointer bg-transparent"
                      style={{ borderColor: "var(--th-border-strong)" }}
                    >
                      <Plus size={14} /> Add Certificate
                    </button>
                  </div>
                )}

                {/* E. SECTIONS ORDER TAB */}
                {activeTab === "sections" && (
                  <div className="space-y-3">
                    <p className="text-[10px] text-[var(--th-text-muted)] mb-2">
                      Adjust the layout hierarchy of sections in the preview. Top sections are placed first.
                    </p>
                    {(["education", "experience", "projects", "skills"] as SectionType[]).map((section) => {
                      const idx = sectionsOrder.indexOf(section);
                      return (
                        <div
                          key={section}
                          className="flex items-center justify-between p-3.5 rounded-xl border bg-[var(--th-bg-secondary)]"
                          style={{ borderColor: "var(--th-border)" }}
                        >
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-bold capitalize text-[var(--th-text-primary)]">{section}</span>
                            <span className="text-[9px] text-[var(--th-text-faint)] mt-0.5">Position: #{idx + 1}</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveSection(idx, -1)}
                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-30 cursor-pointer border-none bg-transparent text-gray-500"
                              title="Move Up"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={idx === sectionsOrder.length - 1}
                              onClick={() => moveSection(idx, 1)}
                              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-30 cursor-pointer border-none bg-transparent text-gray-500"
                              title="Move Down"
                            >
                              <ArrowDown size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* PANEL 2: LIVE PREVIEW SIMULATOR (col-span-5) */}
          <div className="lg:col-span-5 space-y-4">

            {/* Sheet Preview Simulator Card */}
            <div className={cn(
              "border shadow-xl rounded-2xl p-4 sm:p-6 min-h-[460px] sm:min-h-[660px] text-left transition-all duration-300 flex flex-col justify-between relative overflow-x-auto",
              paperBgStyles[paperColor]
            )} id="resume-sheet">

              {/* Floating Toolbar: Save & Download PDF */}
              <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveResume}
                  disabled={savingResume}
                  className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all border-none cursor-pointer disabled:opacity-60"
                  title={savingResume ? "Saving Resume..." : "Save Resume"}
                >
                  <Save size={14} className={savingResume ? "animate-pulse" : ""} />
                </button>
                <button
                  type="button"
                  onClick={downloadPDF}
                  className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all border-none cursor-pointer"
                  title="Download PDF"
                >
                  <Download size={14} />
                </button>
              </div>

              <ResumeTemplate
                template={template}
                paperColor={paperColor}
                profile={profile}
                skills={skills}
                experience={experience}
                education={education}
                projects={projects}
                certificates={certificates}
                sectionsOrder={sectionsOrder}
              />
            </div>
          </div>

          {/* PANEL 3: AI ANALYZER / IMPROVEMENT ADVISOR (col-span-3) */}
          <div className="lg:col-span-3 space-y-4">

            <div
              className="p-5 rounded-2xl border"
              style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}
            >
              <div className="flex items-center gap-2 mb-4 border-b pb-3" style={{ borderColor: "var(--th-border)" }}>
                <Sparkles size={16} className="text-blue-600" />
                <h3 className="font-bold text-sm text-[var(--th-text-primary)]">AI Review Portal</h3>
              </div>

              {/* Initial Analysis CTA or Scanner Loader */}
              {!analyzed && !analyzing && (
                <div className="py-8 text-center space-y-4">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                    <Sparkles size={22} className="animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold" style={{ color: "var(--th-text-primary)" }}>Analyze ATS readiness</h4>
                    <p className="text-[10px] mt-1" style={{ color: "var(--th-text-faint)" }}>
                      Our AI will review formatting, keyword density, and bullet phrasing.
                    </p>
                  </div>
                  <Button
                    onClick={handleRunAnalysis}
                    className="w-full justify-center text-xs font-bold py-2.5"
                  >
                    Analyze with AI
                  </Button>
                </div>
              )}

              {/* Analyzing Scanning Loader */}
              {analyzing && (
                <div className="py-8 text-center space-y-4">
                  <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-dashed border-blue-500/20 animate-spin" />
                    <span className="text-xs font-mono font-bold text-blue-500">{scanProgress}%</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold" style={{ color: "var(--th-text-primary)" }}>Scanning sections</h4>
                    <p className="text-[9px] mt-0.5" style={{ color: "var(--th-text-faint)" }}>Parsing phrasing structures...</p>
                  </div>
                </div>
              )}

              {/* Dynamic Suggestions List */}
              {analyzed && !analyzing && (
                <div className="space-y-4">

                  {/* Gauge */}
                  <SimpleBlueGauge value={atsScore} />

                  <div className="text-left pt-2 space-y-4 max-h-[420px] overflow-y-auto pr-1">
                    {aiResult?.summarySuggestion && (
                      <div>
                        <h4 className="text-[10px] uppercase font-bold tracking-wider mb-2 text-[var(--th-text-faint)]">Suggested summary</h4>
                        <p className="text-[11px] leading-relaxed p-3 rounded-xl bg-[var(--th-bg-secondary)] border border-[var(--th-border)]" style={{ color: "var(--th-text-secondary)" }}>
                          {aiResult.summarySuggestion}
                        </p>
                      </div>
                    )}

                    {aiResult && aiResult.missingKeywords.length > 0 && (
                      <div>
                        <h4 className="text-[10px] uppercase font-bold tracking-wider mb-2 text-[var(--th-text-faint)]">Missing keywords</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {aiResult.missingKeywords.map((k) => (
                            <span key={k} className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/15">{k}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiResult && ([
                      ["Experience improvements", aiResult.experienceImprovements],
                      ["Project improvements", aiResult.projectImprovements],
                      ["Certification improvements", aiResult.certificationImprovements],
                      ["General tips", aiResult.generalTips],
                    ] as const).map(([label, items]) =>
                      items && items.length > 0 ? (
                        <div key={label}>
                          <h4 className="text-[10px] uppercase font-bold tracking-wider mb-2 text-[var(--th-text-faint)]">{label}</h4>
                          <ul className="space-y-1.5">
                            {items.map((t, i) => (
                              <li key={i} className="text-[10.5px] leading-relaxed flex gap-1.5" style={{ color: "var(--th-text-secondary)" }}>
                                <span className="text-blue-500 mt-px">→</span> {t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null
                    )}

                    {!aiResult && (
                      <p className="text-[11px] text-center py-6" style={{ color: "var(--th-text-faint)" }}>
                        No AI feedback returned. Try again with a job description for sharper results.
                      </p>
                    )}
                  </div>

                  {/* Reset analysis button */}
                  <button
                    onClick={() => {
                      setAnalyzed(false);
                      setAppliedSuggestions({});
                      setAtsScore(68);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 mt-4 text-[10px] font-bold uppercase tracking-wider border rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-[var(--th-text-primary)] cursor-pointer"
                    style={{ borderColor: "var(--th-border-strong)" }}
                  >
                    <RefreshCw size={11} /> Reset analysis
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>

      </div>
      {/* ── JOB DESCRIPTION MODAL ── */}
      {showJobDescModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowJobDescModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border p-6 space-y-5 shadow-2xl"
            style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--th-border)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Sparkles size={18} className="text-blue-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>Job Description Match</h3>
                  <p className="text-[10px]" style={{ color: "var(--th-text-faint)" }}>Paste the job description to get a targeted ATS analysis</p>
                </div>
              </div>
              <button
                onClick={() => setShowJobDescModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer border-none bg-transparent"
                style={{ color: "var(--th-text-faint)" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Text Area */}
            <div className="space-y-2 ">
              <form onSubmit={(e) => e.preventDefault()} className="scroll-auto" encType="multipart/form-data">
                <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--th-text-faint)" }}>
                  Job Description
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={8}
                  placeholder="Paste the full job description here — e.g. role responsibilities, required skills, and keywords the recruiter is looking for..."
                  className="w-full rounded-xl border p-3.5 text-xs resize-none leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  style={{
                    backgroundColor: "var(--th-input-bg)",
                    borderColor: "var(--th-border-strong)",
                    color: "var(--th-text-primary)"
                  }}
                  autoFocus
                />
                <p className="text-[9px]" style={{ color: "var(--th-text-faint)" }}>
                  {jobDescription.length} characters · The AI will cross-reference your resume content against these keywords.
                </p>
                <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--th-text-faint)" }}>Title</label> <br />
                <input type="text" placeholder="Enter title of job profile" className="w-full rounded-xl border p-3.5 text-xs resize-none leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" style={{
                  backgroundColor: "var(--th-input-bg)",
                  borderColor: "var(--th-border-strong)",
                  color: "var(--th-text-primary)"
                }} onChange={(e)=> setTitle(e.target.value)} />
                <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--th-text-faint)" }}>Tech Stack</label> <br />
                <input type="text" placeholder="Enter tech stack" className="w-full rounded-xl border p-3.5 text-xs resize-none leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" style={{
                  backgroundColor: "var(--th-input-bg)",
                  borderColor: "var(--th-border-strong)",
                  color: "var(--th-text-primary)"
                }} onChange={(e)=> setTechStack(e.target.value)} />
                <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--th-text-faint)" }}>Required Skills</label> <br />
                <input type="text" placeholder="Enter required skills" className="w-full rounded-xl border p-3.5 text-xs resize-none leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" style={{
                  backgroundColor: "var(--th-input-bg)",
                  borderColor: "var(--th-border-strong)",
                  color: "var(--th-text-primary)"
                }} onChange={(e)=> setRequiredSkills(e.target.value)} />

                <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--th-text-faint)"}}>Resume</label> <br />
                <input type="file" accept=".pdf" onChange={(e: any)=> setResumeFile(e.target.files[0])}
                className="w-full rounded-xl border p-3.5 text-xs resize-none leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" style={{
                  backgroundColor: "var(--th-input-bg)",
                  borderColor: "var(--th-border-strong)",
                  color: "var(--th-text-primary)"
                }} />

              </form>
            </div>

            {/* Tips Row */}
            <div className="flex gap-2 flex-wrap">
              {["SDE", "Data Engineer", "Product Manager", "ML Engineer"].map((role) => (
                <button
                  key={role}
                  onClick={() => setJobDescription(`We are looking for a skilled ${role} to join our team. Strong fundamentals in algorithms, system design, and team collaboration are required.`)}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border cursor-pointer transition-colors hover:bg-blue-600 hover:text-white hover:border-blue-600"
                  style={{ borderColor: "var(--th-border-strong)", color: "var(--th-text-secondary)", backgroundColor: "var(--th-bg-secondary)" }}
                >
                  {role}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => handleStartAnalysis()}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                style={{ borderColor: "var(--th-border-strong)", color: "var(--th-text-secondary)" }}
              >
                Skip — Run General Analysis
              </button>
              <button
                onClick={() => handleStartAnalysis()}
                disabled={jobDescription.trim().length === 0}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Analyze with Job Description
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Custom icon helper
function FileFileSpreadsheetIcon({ size, className }: { size?: number; className?: string }) {
  return <FileCheck size={size} className={className} />;
}
