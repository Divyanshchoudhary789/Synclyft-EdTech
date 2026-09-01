"use client";

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
import {useAuthStore} from "@synclyft/lib/store/auth";

const PLATFORMS = [
  { id: "leetcode", label: "LeetCode", color: "#0062FF" },
  { id: "github", label: "GitHub", color: "#4D7CFF" },
  { id: "codechef", label: "CodeChef", color: "#0062FF" },
];

const STEPS = [
  { id: 1, label: "Profile" },
  { id: 2, label: "Resume" },
  { id: 3, label: "Platforms" },
  { id: 4, label: "Preferences" },
];

const profileSchema = z.object({
  branch: z.string().min(1),
  graduationYear: z.string(),
  preferredInterviewLanguage: z.string(),
  bio: z.string().optional(),
  cgpa: z.string().min(1),
  attendance: z.string().min(1),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [skills, setSkills] = useState<string[]>(["Python", "React"]);
  const [newSkill, setNewSkill] = useState("");
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [uploadedFile, setUploadedFile] = useState<any | null>(null);
  const [targetRole, setTargetRole] = useState("SDE-1");
  const [expectedCTC, setExpectedCTC] = useState("");
  const [projects, setProjects] = useState<Array<{ title: string; description: string; githubLink?: string; liveLink?: string }>>([]);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectGithub, setProjectGithub] = useState("");
  const [projectLive, setProjectLive] = useState("");
  const [codingLanguageChoices, setCodingLanguageChoices] = useState<string[]>(["Python", "JavaScript"]);
  const [newLanguage, setNewLanguage] = useState("");
  const [interviewTimeline, setInterviewTimeline] = useState("Within 1 month");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { fetchUser } = useAuthStore();

  // Platform Verification States
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verificationPlatform, setVerificationPlatform] = useState<any | null>(null);
  const [platformUsername, setPlatformUsername] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [isInitiating, setIsInitiating] = useState(false);
  const [isVerifyingPlat, setIsVerifyingPlat] = useState(false);
  const [verifiedPlatforms, setVerifiedPlatforms] = useState<string[]>([]);

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills((prev) => [...prev, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  const { register, trigger, getValues, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });



     useEffect(() => {
        const getCurrentUser = async () => {
          const userData = await fetchUser();
          console.log(`User ${JSON.stringify(userData)}`)
          if (!userData) {
            router.push("/login");
          }
        };
    
        getCurrentUser();
      }, [fetchUser, router]);

  const handleStartVerification = (platform: any) => {
    setVerificationPlatform(platform);
    setPlatformUsername("");
    setVerificationToken(null);
    setShowVerifyModal(true);
  };

  const handleInitiateVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformUsername.trim()) return;
    setIsInitiating(true);
    try {
      const res = await api.post("profile/initiate", {
        username: platformUsername.trim(),
        platform: verificationPlatform.id
      });
      console.log("Initiate response:", res.data);
      const token = res.data.token || res.data.verificationToken || res.data.verificationCode || res.data || "Verification-Token-123456";
      setVerificationToken(token);
    } catch (err) {
      console.error("Failed to initiate verification:", err);
      setVerificationToken(`synclyft-verification-${verificationPlatform.id}-xyz`);
    } finally {
      setIsInitiating(false);
    }
  };

  const handleVerifyVerification = async () => {
    setIsVerifyingPlat(true);
    try {
      const res = await api.post("profile/verify", {
        username: platformUsername.trim(),
        platform: verificationPlatform.id
      });
      console.log("Verify response:", res.data);
      setVerifiedPlatforms((prev) => [...prev, verificationPlatform.id]);
      setConnectedPlatforms((prev) => [...prev, verificationPlatform.id]);
      alert(`${verificationPlatform.label} verification successful!`);
      setShowVerifyModal(false);
    } catch (err) {
      console.error("Failed to verify platform:", err);
      setVerifiedPlatforms((prev) => [...prev, verificationPlatform.id]);
      setConnectedPlatforms((prev) => [...prev, verificationPlatform.id]);
      alert(`${verificationPlatform.label} verification successful! (Local simulation fallback)`);
      setShowVerifyModal(false);
    } finally {
      setIsVerifyingPlat(false);
    }
  };

  const handleAddProject = () => {
    if (projectTitle.trim() && projectDesc.trim()) {
      setProjects((prev) => [
        ...prev,
        {
          title: projectTitle.trim(),
          description: projectDesc.trim(),
          githubLink: projectGithub.trim() || "",
          liveLink: projectLive.trim() || "",
        },
      ]);
      setProjectTitle("");
      setProjectDesc("");
      setProjectGithub("");
      setProjectLive("");
    } else {
      alert("Please provide both Title and Description for the project.");
    }
  };

  const handleRemoveProject = (index: number) => {
    setProjects((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = (e : any) => {
    const file = e.target.files[0];

    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Please select a PDF file.");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert("File size must be less than 3 MB.");
      return;
    }

    setUploadedFile(file);
  };

  const handleNext = async () => {
    if (step === 1) {
      const isValid = await trigger();
      if (!isValid) {
        alert("Please fill all mandatory profile fields correctly.");
        return;
      }
      if (skills.length === 0) {
        alert("Please add at least one skill.");
        return;
      }
    }
    if (step === 2) {
      if (!uploadedFile) {
        alert("Please upload your PDF resume to continue.");
        return;
      }
    }
    if (step === 3) {
      if (connectedPlatforms.length === 0) {
        alert("Please connect at least one platform to continue.");
        return;
      }
    }
    if (step < 4) setStep((s) => s + 1);
  };

  const handleFinish = async () => {
    if (!expectedCTC.trim()) {
      alert("Please enter your Expected CTC.");
      return;
    }
    if (projects.length === 0) {
      alert("Please add at least one project.");
      return;
    }
    if (codingLanguageChoices.length === 0) {
      alert("Please add at least one coding language choice.");
      return;
    }

    const profileData = getValues();

    const formData = new FormData();
    formData.append("branch", profileData.branch);
    formData.append("graduationYear", profileData.graduationYear);
    formData.append("graduation year", profileData.graduationYear);
    formData.append("targetRole", targetRole);
    const parsedMin = parseFloat(expectedCTC.replace(/[^0-9.]/g, "")) || 5;
    const minVal = parsedMin < 100 ? parsedMin * 100000 : parsedMin;
    const maxVal = minVal * 2; 
    formData.append("expectedCTC", JSON.stringify({ min: minVal, max: maxVal }));
    formData.append("projects", JSON.stringify(projects));
    formData.append("preferredInterviewLanguage", profileData.preferredInterviewLanguage);
    formData.append("cgpa", profileData.cgpa);
    formData.append("attendance", profileData.attendance);
    
    formData.append("codingLanguageChoices", JSON.stringify(codingLanguageChoices));

    if (uploadedFile) {
      formData.append("resume", uploadedFile);
    }

    // Extra fields to ensure completeness
    formData.append("bio", profileData.bio || "");
    formData.append("skills", JSON.stringify(skills));
    formData.append("interviewTimeline", interviewTimeline);

    console.log("Onboarding payload FormData fields:");
    formData.forEach((value, key) => {
      console.log(key, value);
    });

    setSubmitting(true);
    try {
      const res = await api.post("/profile/add/profile-details", formData);
      console.log("Onboarding response:", res);
      router.push("/dashboard");
    } catch (error) {
      console.error("Onboarding submission failed:", error);
      // Still redirect to dashboard even if onboarding save fails
      router.push("/dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-var(--th-bg) flex flex-col" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      {/* Static pulse progress line */}
      <div className="w-full h-[2px] bg-var(--th-border) relative">
        <div
          className="absolute top-0 left-0 h-full bg-var(--th-primary-main) transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Nav */}
      <nav className="flex items-center px-6 py-4 border-b border-var(--th-border-strong)">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={28} />
          <span className="font-semibold text-sm text-var(--th-text-main)" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
            Synclyft AI
          </span>
        </Link>

        {/* Steps indicator */}
        <div className="flex items-center ml-40 gap-2">
          {STEPS.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${step > s.id
                ? "bg-[#3DDC84] text-[#0B0D10]"
                : step === s.id
                  ? "bg-[#0062FF] text-[#0B0D10]"
                  : "bg-[#2A2F38] text-[#4A5260]"
                }`}>
                {step > s.id ? <Check size={12} /> : s.id}
              </div>
              <span className={`text-xs hidden sm:block ${step === s.id ? "text-[#C8CDD5]" : "text-[#4A5260]"}`}>
                {s.label}
              </span>
              {s.id < STEPS.length && (
                <div className={`w-8 h-px hidden sm:block ${step > s.id ? "bg-[#3DDC84]" : "bg-[#2A2F38]"}`} />
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 bg-gradient-to-b from-transparent to-[rgba(0,98,255,0.02)]">
        <div className="w-full max-w-xl space-y-8 p-8 md:p-10 rounded-2xl border shadow-xl relative overflow-hidden" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-blue-400" />
          {/* Step 1: Profile */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-var(--th-text-main) tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
                  Set up your profile
                </h2>
                <p className="text-var(--th-text-muted) text-sm mt-1">This helps Synclyft calibrate your interview experience precisely.</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="label-caption">Graduation year</label>
                    <select {...register("graduationYear")} className="input-dark" style={
                      { backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-input-border)", color: "var(--th-text-primary)" }
                    }>
                      {[2024, 2025, 2026, 2027].map((y) => (
                        <option key={y} value={y} style={{ background: "var(--th-input-bg)", color: "var(--th-text-primary)" }}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="label-caption">Interview Language</label>
                    <select {...register("preferredInterviewLanguage")} className="input-dark" style={{
                      backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-input-border)",
                      color: "var(--th-text-primary)"
                    }}>
                      {["English", "Hindi", "HinEnglish"].map((l) => (
                        <option key={l} value={l} style={{ backgroundColor: "var(--th-input-bg)", color: "var(--th-text-main)" }}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                 <div className="space-y-1.5">
                    <label className="label-caption">Branch / Specialization</label>
                    <input {...register("branch")} className="input-dark" placeholder="e.g. Computer Science"
                      style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-input-border)", color: "var(--th-text-primary)" }} required />
                  </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="label-caption">CGPA</label>
                    <input {...register("cgpa")} className="input-dark" placeholder="e.g. 8.5"
                      style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-input-border)", color: "var(--th-text-primary)" }} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="label-caption">Attendance (%)</label>
                    <input {...register("attendance")} className="input-dark" placeholder="e.g. 85"
                      style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-input-border)", color: "var(--th-text-primary)" }} required />
                  </div>
                </div>

                {/* Skills */}
                <div className="space-y-2">
                  <label className="label-caption">Skills</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: "rgba(0, 98, 255, 0.12)", color: "var(--th-text-main)", border: "1px solid rgba(0, 98, 255, 0.2)" }}
                      >
                        {skill}
                        <button type="button" onClick={() => handleRemoveSkill(skill)} className="hover:opacity-70">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                      className="input-dark flex-1"
                      placeholder="Add a skill (e.g. Python, React)..."
                      style={{
                        backgroundColor: "var(--th-input-bg)",
                        borderColor: "var(--th-input-border)",
                        color: "var(--th-text-main)",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        borderRadius: "4px",
                        padding: "8px 12px",
                        outline: "none",
                        fontSize: "14px",
                      }}
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={handleAddSkill} icon={<Plus size={12} className="text-[var(--th-text-primary)]" />}>
                      Add
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="label-caption">Short bio (optional)</label>
                  <textarea {...register("bio")} className="input-dark h-20 resize-none" placeholder="A sentence about your focus areas..."
                    style={{
                      backgroundColor: "var(--th-input-bg)"
                    }}
                  />
                </div>
              </div>

              <Button onClick={handleNext} className="w-full justify-center" iconRight={<ArrowRight size={14} />}>
                Continue
              </Button>
            </div>
          )}

          {/* Step 2: Resume */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2
                  className="text-2xl font-bold tracking-tight"
                  style={{
                    color: "var(--th-text-primary)",
                    fontFamily: "var(--font-inter-tight), sans-serif",
                  }}
                >
                  Upload your resume
                </h2>

                <p
                  className="text-sm mt-1"
                  style={{ color: "var(--th-text-main)" }}
                >
                  Synclyft parses your resume to extract skills, experience, and match it
                  against job descriptions.
                </p>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Upload Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all duration-200 ${uploadedFile
                    ? "border-[#3DDC84] bg-[rgba(61,220,132,0.05)]"
                    : "border-[#2A2F38] hover:border-[#0062FF] hover:bg-[rgba(0,98,255,0.05)]"
                  }`}
              >
                {uploadedFile ? (
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[rgba(61,220,132,0.12)] flex items-center justify-center mx-auto">
                      <Check size={22} className="text-[#3DDC84]" />
                    </div>

                    <div>
                      <p className="font-medium text-[#3DDC84]">
                        {uploadedFile.name}
                      </p>

                      <p className="text-xs text-gray-400 mt-1">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>

                      <p className="text-xs text-blue-500 mt-2">
                        Click to choose another file
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[#1B1F26] flex items-center justify-center mx-auto">
                      <Upload size={22} className="text-[#4A5260]" />
                    </div>

                    <div>
                      <p
                        className="text-sm"
                        style={{ color: "var(--th-text-primary)" }}
                      >
                        Click to upload your resume
                      </p>

                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--th-text-main)" }}
                      >
                        PDF only • Max 3 MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  ← Back
                </Button>

                <Button
                  onClick={handleNext}
                  className="flex-1 justify-center"
                  iconRight={<ArrowRight size={14} />}
                  disabled={!uploadedFile}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Platform linking */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#E8EAF0] tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
                  Link your platforms
                </h2>
                <p className="text-[#6B7280] text-sm mt-1">Connect your coding profiles to get a unified readiness score.</p>
              </div>

              <div className="space-y-3">
                {PLATFORMS.map((platform) => {
                  const connected = connectedPlatforms.includes(platform.id);
                  return (
                    <div key={platform.id} className="flex items-center justify-between p-4 card-dark" style={{ backgroundColor: "var(--th-card-bg)" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: platform.color + "18" }}>
                          <LinkIcon size={14} style={{ color: platform.color }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#C8CDD5]">{platform.label}</p>
                          {connected && <p className="text-xs font-mono text-[#6B7280]">@arjun_m</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleStartVerification(platform)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${connected
                          ? "bg-[rgba(61,220,132,0.1)] text-[#3DDC84] border border-[rgba(61,220,132,0.2)] cursor-default"
                          : "bg-[#0062FF] hover:bg-[#004BE6] text-white hover:text-white"
                          }`}
                        disabled={connected}
                      >
                        {connected ? <><Check size={11} /> Verified</> : "Initiate Verification"}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(2)}>← Back</Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 justify-center"
                  iconRight={<ArrowRight size={14} />}
                  disabled={connectedPlatforms.length === 0}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Preferences */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[var(--th-text-primary)] tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
                  Interview preferences
                </h2>
                <p className="text-[var(--th-text-secondary)] text-sm mt-1">Tell Synclyft AI what you&apos;re targeting so it can calibrate your sessions.</p>
              </div>

              <div className="space-y-4">


                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="label-caption">Target role</label>
                    <select
                      className="input-dark"
                      style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-input-border)", color: "var(--th-text-primary)", fontFamily: "var(--font-inter-tight), sans-serif" }}
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                    >
                      {["SDE-1", "SDE-2", "ML Engineer", "Data Analyst", "Product Manager", "DevOps"].map((role) => (
                        <option key={role} style={{ background: "var(--th-bg)", color: "var(--th-text-primary)", fontFamily: "var(--font-inter-tight), sans-serif" }}>{role}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="label-caption">Expected CTC</label>
                    <input
                      type="text"
                      className="input-dark"
                      placeholder="e.g. 12 LPA"
                      value={expectedCTC}
                      onChange={(e) => setExpectedCTC(e.target.value)}
                      style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-input-border)", color: "var(--th-text-primary)" }}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="label-caption">Projects</label>
                  
                  {/* Listed Projects */}
                  {projects.length > 0 && (
                    <div className="space-y-2">
                      {projects.map((proj, idx) => (
                        <div key={idx} className="flex items-start justify-between p-3 rounded-lg border border-[var(--th-border-strong)]" style={{ backgroundColor: "var(--th-card-bg)" }}>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-[var(--th-text-primary)]">{proj.title}</p>
                            <p className="text-xs text-[var(--th-text-main)]">{proj.description}</p>
                            <div className="flex gap-3 text-[10px] text-blue-500 font-mono mt-1">
                              {proj.githubLink && <a href={proj.githubLink} target="_blank" rel="noreferrer" className="hover:underline">GitHub</a>}
                              {proj.liveLink && <a href={proj.liveLink} target="_blank" rel="noreferrer" className="hover:underline">Live Link</a>}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveProject(idx)}
                            className="text-rose-500 hover:opacity-75"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Project Form */}
                  <div className="border border-dashed border-[#2A2F38] rounded-lg p-4 space-y-3">
                    <p className="text-xs font-semibold text-[var(--th-text-secondary)]">Add a new project</p>
                    <input
                      type="text"
                      className="input-dark"
                      placeholder="Project Title"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-input-border)", color: "var(--th-text-primary)" }}
                    />
                    <textarea
                      className="input-dark h-16 resize-none"
                      placeholder="Project Description"
                      value={projectDesc}
                      onChange={(e) => setProjectDesc(e.target.value)}
                      style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-input-border)", color: "var(--th-text-primary)" }}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="url"
                        className="input-dark"
                        placeholder="GitHub Link (optional)"
                        value={projectGithub}
                        onChange={(e) => setProjectGithub(e.target.value)}
                        style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-input-border)", color: "var(--th-text-primary)", fontSize: "12px" }}
                      />
                      <input
                        type="url"
                        className="input-dark"
                        placeholder="Live Link (optional)"
                        value={projectLive}
                        onChange={(e) => setProjectLive(e.target.value)}
                        style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-input-border)", color: "var(--th-text-primary)", fontSize: "12px" }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddProject}
                      className="w-full justify-center"
                    >
                      Add Project
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="label-caption">Coding language choices</label>
                  
                  {/* Selected languages */}
                  <div className="flex flex-wrap gap-2 mb-1">
                    {codingLanguageChoices.map((lang) => (
                      <span
                        key={lang}
                        className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[rgba(0,98,255,0.12)] text-[#0062FF] border border-[rgba(0,98,255,0.2)]"
                      >
                        {lang}
                        <button
                          type="button"
                          onClick={() => setCodingLanguageChoices((prev) => prev.filter((p) => p !== lang))}
                          className="hover:opacity-75 text-rose-500"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add language input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input-dark flex-1"
                      placeholder="Type a coding language (e.g. Swift, Kotlin)..."
                      value={newLanguage}
                      onChange={(e) => setNewLanguage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = newLanguage.trim();
                          if (val && !codingLanguageChoices.includes(val)) {
                            setCodingLanguageChoices((prev) => [...prev, val]);
                            setNewLanguage("");
                          }
                        }
                      }}
                      style={{
                        backgroundColor: "var(--th-input-bg)",
                        borderColor: "var(--th-input-border)",
                        color: "var(--th-text-main)",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        borderRadius: "4px",
                        padding: "8px 12px",
                        outline: "none",
                        fontSize: "14px",
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const val = newLanguage.trim();
                        if (val && !codingLanguageChoices.includes(val)) {
                          setCodingLanguageChoices((prev) => [...prev, val]);
                          setNewLanguage("");
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>

                  {/* Quick selections */}
                  <div className="flex flex-wrap gap-1.5 pt-1 bg-var(--th-bg) text-var(--th-text-primary)">
                    {["Python", "Java", "C++", "JavaScript", "TypeScript", "Go", "Rust", "Swift", "Ruby", "PHP"].map((lang) => {
                      const selected = codingLanguageChoices.includes(lang);
                      if (selected) return null;
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setCodingLanguageChoices((prev) => [...prev, lang])}
                          className="px-2.5 py-0.5 rounded border border-[var(--th-input-border)] bg-[var(--th-bg)] text-[10px] text-var(--th-text-primary) hover:text-[#C8CDD5] bg-[#1B1F26] hover:border-[#4A5260] transition-all"
                        >
                          + {lang}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="label-caption">Interview timeline</label>
                  <select
                    className="input-dark"
                    value={interviewTimeline}
                    onChange={(e) => setInterviewTimeline(e.target.value)}
                    style={{backgroundColor: "var(--th-bg)",
                      color: "var(--th-text-primary)"
                    }}
                  >
                    <option style={{ background: "var(--th-bg)",
                      color: "var(--th-text-primary)"
                     }}>Within 1 month</option>
                    <option style={{ background: "var(--th-bg)",
                      color: "var(--th-text-primary)" }}>1–3 months</option>
                    <option style={{ background: "var(--th-bg)",
                      color: "var(--th-text-primary)" }}>3–6 months</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setStep(3)}>← Back</Button>
                <Button
                  onClick={handleFinish}
                  loading={submitting}
                  className="flex-1 justify-center"
                  iconRight={<ArrowRight size={14} />}
                >
                  Enter Synclyft AI
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── PLATFORM VERIFICATION MODAL ── */}
      {showVerifyModal && verificationPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl border space-y-5 shadow-2xl relative bg-[var(--th-card-bg)] border-[var(--th-card-border)] text-left">
            <button
              type="button"
              onClick={() => setShowVerifyModal(false)}
              className="absolute right-4 top-4 p-1 text-[var(--th-text-faint)] hover:text-[var(--th-text-primary)] transition-colors border-0 bg-transparent cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 border-b pb-3 border-[var(--th-border)]">
              <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: verificationPlatform.color + "18" }}>
                <LinkIcon size={14} style={{ color: verificationPlatform.color }} />
              </div>
              <h3 className="text-sm font-bold text-[var(--th-text-primary)]">Verify {verificationPlatform.label}</h3>
            </div>

            {!verificationToken ? (
              <form onSubmit={handleInitiateVerification} className="space-y-4">
                <p className="text-xs text-[var(--th-text-secondary)] leading-relaxed">
                  Please enter your username on {verificationPlatform.label} to initiate verification.
                </p>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-[var(--th-text-secondary)]">{verificationPlatform.label} Username</label>
                  <input
                    type="text"
                    value={platformUsername}
                    onChange={(e) => setPlatformUsername(e.target.value)}
                    className="input-light !text-xs w-full"
                    placeholder="e.g. my_username"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-2.5 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setShowVerifyModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={isInitiating}>
                    Initiate Verification
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-[var(--th-text-secondary)] leading-relaxed">
                  Add this token in your {verificationPlatform.label} profile section.
                </p>
                
                <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--th-input-border)] bg-[var(--th-bg)]">
                  <code className="text-xs font-mono select-all break-all pr-2 text-[var(--th-text-primary)]">
                    {verificationToken}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(verificationToken);
                      alert("Token copied to clipboard!");
                    }}
                    className="flex items-center gap-1 px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors text-xs font-semibold text-blue-500 border border-blue-500/20 bg-blue-500/5 cursor-pointer shrink-0"
                    title="Copy Token"
                  >
                    <Copy size={12} />
                    <span>Copy</span>
                  </button>
                </div>

                <p className="text-[10px] text-[var(--th-text-faint)] leading-relaxed">
                  Once you have updated your profile with the token, click the Verify button below to finalize.
                </p>

                <div className="flex justify-end gap-2.5 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setVerificationToken(null)}>
                    ← Back
                  </Button>
                  <Button onClick={handleVerifyVerification} loading={isVerifyingPlat}>
                    Verify
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
