"use client";

import toast from "react-hot-toast";
import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, Check, Link as LinkIcon, ArrowRight, Plus, X, Copy } from "lucide-react";
import { Logo } from "@synclyft/ui/components/Logo";
import { Button } from "@synclyft/ui/components/Button";
import { api } from "@synclyft/lib/api";
import { useAuthStore } from "@synclyft/lib/store/auth";
import { useStudentProfile } from "@synclyft/lib/api/hooks";

const PLATFORMS = [
  { id: "leetcode", label: "LeetCode", color: "#0062FF" },
  { id: "github", label: "GitHub", color: "#4D7CFF" },
  { id: "codeforces", label: "Codeforces", color: "#0062FF" },
  { id: "hackerrank", label: "HackerRank", color: "#3DDC84" },
];
type Platform = (typeof PLATFORMS)[number];

const STEPS = [
  { id: 1, label: "Profile" },
  { id: 2, label: "Resume" },
  { id: 3, label: "Platforms" },
  { id: 4, label: "Preferences" },
];

const QUICK_LANGS = ["Python", "Java", "C++", "JavaScript", "TypeScript", "Go", "Rust", "Swift", "Ruby", "PHP"];

const profileSchema = z.object({
  branch: z.string().min(1, "Branch is required"),
  graduationYear: z.string(),
  preferredInterviewLanguage: z.string(),
  bio: z.string().optional(),
  cgpa: z.string().min(1, "CGPA is required"),
  attendance: z.string().min(1, "Attendance is required"),
});
type ProfileForm = z.infer<typeof profileSchema>;

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  fontSize: "14px",
  borderRadius: "10px",
  outline: "none",
  border: "1px solid var(--th-input-border)",
  backgroundColor: "var(--th-input-bg)",
  color: "var(--th-text-primary)",
};

export default function OnboardingPage() {
  const router = useRouter();
  const { fetchUser } = useAuthStore();
  const { data: existing } = useStudentProfile();

  const [step, setStep] = useState(1);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("SDE-1");
  const [expectedCTC, setExpectedCTC] = useState("");
  const [projects, setProjects] = useState<Array<{ title: string; description: string; githubLink?: string; liveLink?: string }>>([]);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectGithub, setProjectGithub] = useState("");
  const [projectLive, setProjectLive] = useState("");
  const [codingLanguageChoices, setCodingLanguageChoices] = useState<string[]>([]);
  const [newLanguage, setNewLanguage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prefilled = useRef(false);

  // Platform verification modal
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verificationPlatform, setVerificationPlatform] = useState<Platform | null>(null);
  const [platformUsername, setPlatformUsername] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [isInitiating, setIsInitiating] = useState(false);
  const [isVerifyingPlat, setIsVerifyingPlat] = useState(false);

  const { register, trigger, getValues, reset, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      graduationYear: "2026",
      preferredInterviewLanguage: "English",
    },
  });

  useEffect(() => {
    (async () => {
      const u = await fetchUser();
      if (!u) router.push("/login");
    })();
  }, [fetchUser, router]);

  // Prefill from any profile data that already exists (returning users).
  useEffect(() => {
    if (prefilled.current || !existing) return;
    const p = existing as unknown as Record<string, unknown>;
    prefilled.current = true;
    reset({
      branch: (p.branch as string) || "",
      graduationYear: p.graduationYear ? String(p.graduationYear) : "2026",
      preferredInterviewLanguage: (p.preferredInterviewLanguage as string) || "English",
      bio: (p.bio as string) || "",
      cgpa: p.cgpa != null ? String(p.cgpa) : "",
      attendance: p.attendance != null ? String(p.attendance) : "",
    });
    if (Array.isArray(p.skills) && p.skills.length) setSkills(p.skills as string[]);
    if (Array.isArray(p.projects) && p.projects.length) setProjects(p.projects as typeof projects);
    if (Array.isArray(p.codingLanguageChoices) && p.codingLanguageChoices.length)
      setCodingLanguageChoices(p.codingLanguageChoices as string[]);
    if (p.targetRole) setTargetRole(p.targetRole as string);
    const ctc = p.expectedCTC as { min?: number } | undefined;
    if (ctc?.min) setExpectedCTC(String(Math.round(ctc.min / 100000)));
  }, [existing, reset]);

  const addSkill = () => {
    const v = newSkill.trim();
    if (v && !skills.includes(v)) setSkills((s) => [...s, v]);
    setNewSkill("");
  };
  const addLanguage = (v: string) => {
    const t = v.trim();
    if (t && !codingLanguageChoices.includes(t)) setCodingLanguageChoices((l) => [...l, t]);
    setNewLanguage("");
  };

  const startVerification = (platform: Platform) => {
    setVerificationPlatform(platform);
    setPlatformUsername("");
    setVerificationToken(null);
    setShowVerifyModal(true);
  };

  const initiateVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformUsername.trim() || !verificationPlatform) return;
    setIsInitiating(true);
    try {
      const res = await api.post("/profile/initiate", {
        username: platformUsername.trim(),
        platform: verificationPlatform.id,
      });
      const token = res.data.token || res.data.verificationToken || res.data.verificationCode || "";
      if (!token) throw new Error("No verification token returned");
      setVerificationToken(token);
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Couldn't start verification. Check the username.");
    } finally {
      setIsInitiating(false);
    }
  };

  const confirmVerification = async () => {
    if (!verificationPlatform) return;
    setIsVerifyingPlat(true);
    try {
      await api.post("/profile/verify", { platform: verificationPlatform.id });
      setConnectedPlatforms((prev) => [...new Set([...prev, verificationPlatform.id])]);
      toast.success(`${verificationPlatform.label} verified`);
      setShowVerifyModal(false);
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || `Couldn't verify ${verificationPlatform.label}. Make sure the token is in your bio.`);
    } finally {
      setIsVerifyingPlat(false);
    }
  };

  const addProject = () => {
    if (!projectTitle.trim() || !projectDesc.trim()) {
      toast("Add both a title and description for the project.");
      return;
    }
    setProjects((prev) => [
      ...prev,
      { title: projectTitle.trim(), description: projectDesc.trim(), githubLink: projectGithub.trim() || "", liveLink: projectLive.trim() || "" },
    ]);
    setProjectTitle(""); setProjectDesc(""); setProjectGithub(""); setProjectLive("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") return toast("Please select a PDF file.");
    if (file.size > 3 * 1024 * 1024) return toast("File must be under 3 MB.");
    setUploadedFile(file);
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!(await trigger())) return toast("Fill all required profile fields.");
      if (skills.length === 0) return toast("Add at least one skill.");
    }
    if (step === 2 && !uploadedFile) return toast("Upload your PDF resume to continue.");
    if (step === 3 && connectedPlatforms.length === 0) return toast("Verify at least one platform to continue.");
    if (step < 4) setStep((s) => s + 1);
  };

  const handleFinish = async () => {
    if (!expectedCTC.trim()) return toast("Enter your expected CTC.");
    if (projects.length === 0) return toast("Add at least one project.");
    if (codingLanguageChoices.length === 0) return toast("Add at least one coding language.");

    const data = getValues();
    const parsedMin = parseFloat(expectedCTC.replace(/[^0-9.]/g, "")) || 5;
    const minVal = parsedMin < 100 ? parsedMin * 100000 : parsedMin;
    const maxVal = Math.round(minVal * 1.5);

    const fd = new FormData();
    fd.append("branch", data.branch);
    fd.append("graduationYear", data.graduationYear);
    fd.append("targetRole", targetRole);
    fd.append("expectedCTC", JSON.stringify({ min: minVal, max: maxVal }));
    fd.append("projects", JSON.stringify(projects));
    fd.append("preferredInterviewLanguage", data.preferredInterviewLanguage);
    fd.append("cgpa", data.cgpa);
    fd.append("attendance", data.attendance);
    fd.append("codingLanguageChoices", JSON.stringify(codingLanguageChoices));
    fd.append("skills", JSON.stringify(skills));
    if (data.bio) fd.append("bio", data.bio);
    if (uploadedFile) fd.append("resume", uploadedFile);

    setSubmitting(true);
    try {
      await api.post("/profile/add/profile-details", fd);
      toast.success("Profile completed");
      router.push("/dashboard");
    } catch (error) {
      toast.error((error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Couldn't save your profile. Check the fields and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "var(--th-bg)", color: "var(--th-text-primary)", fontFamily: "var(--font-inter), sans-serif" }}>
      {/* progress bar */}
      <div className="relative h-[3px] w-full" style={{ backgroundColor: "var(--th-border)" }}>
        <div className="absolute left-0 top-0 h-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: "var(--th-primary)" }} />
      </div>

      {/* top nav */}
      <nav className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6" style={{ borderColor: "var(--th-border)" }}>
        <Link href="/" className="flex items-center gap-2">
          <Logo size={26} />
          <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>Synclyft AI</span>
        </Link>
        {/* stepper */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:gap-2 sm:pb-0">
          {STEPS.map((s, i) => {
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{
                    backgroundColor: done ? "#3DDC84" : active ? "var(--th-primary)" : "var(--th-bg-secondary)",
                    color: done || active ? "#fff" : "var(--th-text-faint)",
                    border: `1px solid ${done ? "#3DDC84" : active ? "var(--th-primary)" : "var(--th-border)"}`,
                  }}
                >
                  {done ? <Check size={12} /> : s.id}
                </span>
                <span className="hidden text-xs font-medium sm:block" style={{ color: active ? "var(--th-text-primary)" : "var(--th-text-faint)" }}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && <span className="hidden h-px w-6 sm:block" style={{ backgroundColor: done ? "#3DDC84" : "var(--th-border)" }} />}
              </div>
            );
          })}
        </div>
      </nav>

      {/* content */}
      <div className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
        <div
          className="relative w-full max-w-xl space-y-6 overflow-hidden rounded-2xl border p-6 shadow-xl sm:p-8 md:p-10"
          style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}
        >
          <div className="absolute left-0 top-0 h-1 w-full" style={{ background: "linear-gradient(90deg, var(--th-primary), #4D7CFF)" }} />

          {/* STEP 1 — Profile */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>Set up your profile</h2>
                <p className="mt-1 text-sm" style={{ color: "var(--th-text-muted)" }}>This helps Synclyft calibrate your interview experience precisely.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="label-caption">Graduation year</label>
                  <select {...register("graduationYear")} style={fieldStyle}>
                    {[2024, 2025, 2026, 2027, 2028].map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="label-caption">Interview language</label>
                  <select {...register("preferredInterviewLanguage")} style={fieldStyle}>
                    {["English", "Hindi", "HinEnglish"].map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label-caption">Branch / Specialization</label>
                <input {...register("branch")} style={fieldStyle} placeholder="e.g. Computer Science" />
                {errors.branch && <p className="text-xs text-[#FF5C5C]">{errors.branch.message}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="label-caption">CGPA</label>
                  <input {...register("cgpa")} style={fieldStyle} placeholder="e.g. 8.5" />
                  {errors.cgpa && <p className="text-xs text-[#FF5C5C]">{errors.cgpa.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="label-caption">Attendance (%)</label>
                  <input {...register("attendance")} style={fieldStyle} placeholder="e.g. 85" />
                  {errors.attendance && <p className="text-xs text-[#FF5C5C]">{errors.attendance.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="label-caption">Skills</label>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span key={skill} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{ backgroundColor: "color-mix(in srgb, var(--th-primary) 12%, transparent)", color: "var(--th-primary)", border: "1px solid color-mix(in srgb, var(--th-primary) 25%, transparent)" }}>
                        {skill}
                        <button type="button" onClick={() => setSkills((s) => s.filter((x) => x !== skill))} className="hover:opacity-70"><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                    style={{ ...fieldStyle, flex: 1 }}
                    placeholder="Add a skill (e.g. Python, React)…"
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={addSkill} icon={<Plus size={12} />}>Add</Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="label-caption">Short bio (optional)</label>
                <textarea {...register("bio")} style={{ ...fieldStyle, height: 80, resize: "none" }} placeholder="A sentence about your focus areas…" />
              </div>

              <Button onClick={handleNext} className="w-full justify-center" iconRight={<ArrowRight size={14} />}>Continue</Button>
            </div>
          )}

          {/* STEP 2 — Resume */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>Upload your resume</h2>
                <p className="mt-1 text-sm" style={{ color: "var(--th-text-muted)" }}>Synclyft parses your resume to extract skills and experience and match it against job descriptions.</p>
              </div>

              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed p-10 text-center transition-colors"
                style={{
                  borderColor: uploadedFile ? "#3DDC84" : "var(--th-border-strong)",
                  backgroundColor: uploadedFile ? "rgba(61,220,132,0.06)" : "transparent",
                }}
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: uploadedFile ? "rgba(61,220,132,0.14)" : "var(--th-bg-secondary)" }}>
                  {uploadedFile ? <Check size={22} className="text-[#3DDC84]" /> : <Upload size={22} style={{ color: "var(--th-text-muted)" }} />}
                </div>
                {uploadedFile ? (
                  <>
                    <p className="text-sm font-medium text-[#3DDC84]">{uploadedFile.name}</p>
                    <p className="mt-1 text-xs" style={{ color: "var(--th-text-faint)" }}>{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB · click to replace</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm" style={{ color: "var(--th-text-primary)" }}>Click to upload your resume</p>
                    <p className="mt-1 text-xs" style={{ color: "var(--th-text-muted)" }}>PDF only · max 3 MB</p>
                  </>
                )}
              </button>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(1)}>← Back</Button>
                <Button onClick={handleNext} className="flex-1 justify-center" iconRight={<ArrowRight size={14} />} disabled={!uploadedFile}>Continue</Button>
              </div>
            </div>
          )}

          {/* STEP 3 — Platforms */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>Link your platforms</h2>
                <p className="mt-1 text-sm" style={{ color: "var(--th-text-muted)" }}>Connect your coding profiles to get a unified readiness score.</p>
              </div>

              <div className="space-y-3">
                {PLATFORMS.map((platform) => {
                  const connected = connectedPlatforms.includes(platform.id);
                  return (
                    <div key={platform.id} className="flex items-center justify-between rounded-xl border p-4"
                      style={{ backgroundColor: "var(--th-card-bg-alt)", borderColor: "var(--th-card-border)" }}>
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: platform.color + "1a" }}>
                          <LinkIcon size={14} style={{ color: platform.color }} />
                        </span>
                        <p className="text-sm font-medium" style={{ color: "var(--th-text-primary)" }}>{platform.label}</p>
                      </div>
                      <button
                        onClick={() => startVerification(platform)}
                        disabled={connected}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-default"
                        style={
                          connected
                            ? { backgroundColor: "rgba(61,220,132,0.12)", color: "#3DDC84", border: "1px solid rgba(61,220,132,0.25)" }
                            : { backgroundColor: "var(--th-primary)", color: "#fff" }
                        }
                      >
                        {connected ? <><Check size={11} /> Verified</> : "Verify"}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(2)}>← Back</Button>
                <Button onClick={handleNext} className="flex-1 justify-center" iconRight={<ArrowRight size={14} />} disabled={connectedPlatforms.length === 0}>Continue</Button>
              </div>
            </div>
          )}

          {/* STEP 4 — Preferences */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>Interview preferences</h2>
                <p className="mt-1 text-sm" style={{ color: "var(--th-text-muted)" }}>Tell Synclyft AI what you&apos;re targeting so it can calibrate your sessions.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="label-caption">Target role</label>
                  <select style={fieldStyle} value={targetRole} onChange={(e) => setTargetRole(e.target.value)}>
                    {["SDE-1", "SDE-2", "ML Engineer", "Data Analyst", "Product Manager", "DevOps"].map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="label-caption">Expected CTC</label>
                  <input style={fieldStyle} placeholder="e.g. 12 LPA" value={expectedCTC} onChange={(e) => setExpectedCTC(e.target.value)} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="label-caption">Projects</label>
                {projects.length > 0 && (
                  <div className="space-y-2">
                    {projects.map((proj, idx) => (
                      <div key={idx} className="flex items-start justify-between rounded-lg border p-3"
                        style={{ backgroundColor: "var(--th-card-bg-alt)", borderColor: "var(--th-card-border)" }}>
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-semibold" style={{ color: "var(--th-text-primary)" }}>{proj.title}</p>
                          <p className="text-xs" style={{ color: "var(--th-text-muted)" }}>{proj.description}</p>
                          <div className="mt-1 flex gap-3 font-mono text-[10px]" style={{ color: "var(--th-primary)" }}>
                            {proj.githubLink && <a href={proj.githubLink} target="_blank" rel="noreferrer" className="hover:underline">GitHub</a>}
                            {proj.liveLink && <a href={proj.liveLink} target="_blank" rel="noreferrer" className="hover:underline">Live</a>}
                          </div>
                        </div>
                        <button type="button" onClick={() => setProjects((prev) => prev.filter((_, i) => i !== idx))} className="text-rose-500 hover:opacity-75"><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="space-y-3 rounded-lg border border-dashed p-4" style={{ borderColor: "var(--th-border-strong)" }}>
                  <p className="text-xs font-semibold" style={{ color: "var(--th-text-secondary)" }}>Add a project</p>
                  <input style={fieldStyle} placeholder="Project title" value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} />
                  <textarea style={{ ...fieldStyle, height: 64, resize: "none" }} placeholder="Project description" value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input style={{ ...fieldStyle, fontSize: 12 }} placeholder="GitHub link (optional)" value={projectGithub} onChange={(e) => setProjectGithub(e.target.value)} />
                    <input style={{ ...fieldStyle, fontSize: 12 }} placeholder="Live link (optional)" value={projectLive} onChange={(e) => setProjectLive(e.target.value)} />
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={addProject} className="w-full justify-center">Add project</Button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="label-caption">Coding languages</label>
                {codingLanguageChoices.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {codingLanguageChoices.map((lang) => (
                      <span key={lang} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{ backgroundColor: "color-mix(in srgb, var(--th-primary) 12%, transparent)", color: "var(--th-primary)", border: "1px solid color-mix(in srgb, var(--th-primary) 25%, transparent)" }}>
                        {lang}
                        <button type="button" onClick={() => setCodingLanguageChoices((prev) => prev.filter((p) => p !== lang))} className="text-rose-500 hover:opacity-75"><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    style={{ ...fieldStyle, flex: 1 }}
                    placeholder="Type a language (e.g. Kotlin)…"
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLanguage(newLanguage); } }}
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={() => addLanguage(newLanguage)}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_LANGS.filter((l) => !codingLanguageChoices.includes(l)).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setCodingLanguageChoices((prev) => [...prev, lang])}
                      className="rounded border px-2.5 py-0.5 text-[10px] transition-colors hover:opacity-80"
                      style={{ borderColor: "var(--th-input-border)", backgroundColor: "var(--th-bg-secondary)", color: "var(--th-text-secondary)" }}
                    >
                      + {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(3)}>← Back</Button>
                <Button onClick={handleFinish} loading={submitting} className="flex-1 justify-center" iconRight={<ArrowRight size={14} />}>Enter Synclyft AI</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* verification modal */}
      {showVerifyModal && verificationPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md space-y-5 rounded-2xl border p-6 text-left shadow-2xl"
            style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
            <button type="button" onClick={() => setShowVerifyModal(false)} className="absolute right-4 top-4 p-1 transition-colors hover:opacity-70" style={{ color: "var(--th-text-faint)" }}>
              <X size={18} />
            </button>
            <div className="flex items-center gap-2.5 border-b pb-3" style={{ borderColor: "var(--th-border)" }}>
              <span className="flex h-7 w-7 items-center justify-center rounded" style={{ backgroundColor: verificationPlatform.color + "1a" }}>
                <LinkIcon size={14} style={{ color: verificationPlatform.color }} />
              </span>
              <h3 className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>Verify {verificationPlatform.label}</h3>
            </div>

            {!verificationToken ? (
              <form onSubmit={initiateVerification} className="space-y-4">
                <p className="text-xs leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
                  Enter your {verificationPlatform.label} username to begin.
                </p>
                <div className="space-y-1.5">
                  <label className="label-caption">{verificationPlatform.label} username</label>
                  <input type="text" value={platformUsername} onChange={(e) => setPlatformUsername(e.target.value)} style={fieldStyle} placeholder="e.g. my_username" required autoFocus />
                </div>
                <div className="flex justify-end gap-2.5 pt-1">
                  <Button type="button" variant="secondary" onClick={() => setShowVerifyModal(false)}>Cancel</Button>
                  <Button type="submit" loading={isInitiating}>Get token</Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-xs leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
                  Add this token to your {verificationPlatform.label} profile bio, then confirm.
                </p>
                <div className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: "var(--th-input-border)", backgroundColor: "var(--th-bg-secondary)" }}>
                  <code className="select-all break-all pr-2 font-mono text-xs" style={{ color: "var(--th-text-primary)" }}>{verificationToken}</code>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(verificationToken); toast("Token copied"); }}
                    className="flex shrink-0 items-center gap-1 rounded border px-2 py-1 text-xs font-semibold"
                    style={{ color: "var(--th-primary)", borderColor: "color-mix(in srgb, var(--th-primary) 20%, transparent)", backgroundColor: "color-mix(in srgb, var(--th-primary) 6%, transparent)" }}
                  >
                    <Copy size={12} /> Copy
                  </button>
                </div>
                <div className="flex justify-end gap-2.5 pt-1">
                  <Button type="button" variant="secondary" onClick={() => setVerificationToken(null)}>← Back</Button>
                  <Button onClick={confirmVerification} loading={isVerifyingPlat}>Confirm</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
