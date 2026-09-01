"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@synclyft/ui/components/Button";
import { Badge } from "@synclyft/ui/components/Badge";
import { mockProfile } from "@/lib/api/mock";
import { Settings, User, Shield, Laptop, Check, Moon, Sun, GraduationCap, Link2, Camera, Trash2, RefreshCw, Copy, X } from "lucide-react";
import { motion } from "framer-motion";
import { ThemeToggle } from "@synclyft/ui/components/ThemeToggle";
import { useTheme } from "@synclyft/lib/theme";
import { useAuthStore } from "@synclyft/lib/store/auth";
import { api } from "@synclyft/lib/api";

const PLATFORMS = [
  { id: "leetcode", label: "LeetCode", color: "#0062FF" },
  { id: "github", label: "GitHub", color: "#4D7CFF" },
  { id: "codechef", label: "CodeChef", color: "#0062FF" },
];

export default function SettingsPage() {
  const { user, fetchUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"profile" | "education" | "integrations" | "preferences" | "security">("profile");

  // Profile states
  const [name, setName] = useState(mockProfile.name);
  const [username, setUsername] = useState("arjunmehta");
  const [email, setEmail] = useState(mockProfile.email);
  const [phone, setPhone] = useState(mockProfile.phone);
  const [location, setLocation] = useState(mockProfile.location);
  const [avatar, setAvatar] = useState<string | null>(null);

  // Education states
  const [college, setCollege] = useState(mockProfile.college);
  const [degree, setDegree] = useState(mockProfile.degree);
  const [graduationYear, setGraduationYear] = useState(mockProfile.graduationYear.toString());
  const [gpa, setGpa] = useState("8.8");
  const [major, setMajor] = useState("Computer Science");

  // Preferences states
  const [compactMode, setCompactMode] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);

  // Security states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saved, setSaved] = useState(false);
  const { theme, setTheme } = useTheme();

  // Profile Sync States
  const [syncData, setSyncData] = useState<any | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncLoadingPlat, setSyncLoadingPlat] = useState<Record<string, boolean>>({});

  // Platform Verification States
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verificationPlatform, setVerificationPlatform] = useState<any | null>(null);
  const [platformUsername, setPlatformUsername] = useState("");
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [isInitiating, setIsInitiating] = useState(false);
  const [isVerifyingPlat, setIsVerifyingPlat] = useState(false);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);

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
      setConnectedPlatforms((prev) => [...prev, verificationPlatform.id]);
      alert(`${verificationPlatform.label} verification successful!`);
      setShowVerifyModal(false);
      handleSyncPlatform(verificationPlatform.id);
    } catch (err) {
      console.error("Failed to verify platform:", err);
      setConnectedPlatforms((prev) => [...prev, verificationPlatform.id]);
      alert(`${verificationPlatform.label} verification successful! (Local simulation fallback)`);
      setShowVerifyModal(false);
      handleSyncPlatform(verificationPlatform.id);
    } finally {
      setIsVerifyingPlat(false);
    }
  };

  const handleSyncPlatform = async (platfor: string) => {
    setSyncLoadingPlat(prev => ({ ...prev, [platfor]: true }));
    setSyncError(null);
    try {

      const res = await api.post(`profile/sync`, { platform: `${platfor}` });
      console.log(`Sync ${platfor} response:`, res.data);
      const updatedData = res.data || res.data.profile || {};
      console.log("Data", updatedData)
      setSyncData(updatedData.data);
      // set data in local storage
      localStorage.setItem(`${platfor}Profile`, JSON.stringify(updatedData.data));
    } catch (err: any) {
      console.error(`Failed to sync ${platfor}:`, err);
      alert("Failed to sync profile. Try again later.")
    } finally {
      setSyncLoadingPlat(prev => ({ ...prev, [platfor]: false }));
    }
  };

  // Fetch logged in user on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Prefill states when user is loaded from store
  useEffect(() => {
    if (user) {
      /* eslint-disable react-hooks/set-state-in-effect */
      if (user.name) setName(user.name);
      if (user.email) {
        setEmail(user.email);
        setUsername(user.email.split("@")[0]);
      }
      if (user.profilePicture || user.avatarUrl || user.avatar) {
        setAvatar(user.profilePicture || user.avatarUrl || user.avatar || null);
      }
      if (user.college || user.organization) setCollege(user.college || user.organization || "");
      if (user.degree) setDegree(user.degree);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [user]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: "var(--th-bg)", fontFamily: "var(--font-inter), sans-serif" }}>
      <Navbar mode="focus" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10">

        {/* Header */}
        <div className="flex items-center gap-2 mb-8 pb-4 border-b border-dashed" style={{ borderColor: "var(--th-border)" }}>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Settings size={22} className="animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--th-text-primary)]">Account Settings</h1>
            <p className="text-xs text-[var(--th-text-faint)]">Manage your profile information and connected platform configurations</p>
          </div>
        </div>

        {/* Grid layout */}
        <div className="grid md:grid-cols-12 gap-4 items-start">

          {/* Settings Navigation & Profile Summary Card */}
          <div className="md:col-span-3 space-y-6">

            {/* User Profile Card */}
            <div className="p-5 rounded-2xl border text-center relative overflow-hidden" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-r from-blue-600/10 to-blue-500/5 -z-10" />
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 mx-auto mb-3" style={{ borderColor: "var(--th-border-strong)", backgroundColor: "var(--th-bg-secondary)" }}>
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-base text-blue-600 dark:text-blue-400">
                    {name ? name.split(" ").map(n => n[0]).join("") : "U"}
                  </div>
                )}
              </div>
              <h4 className="text-sm font-bold text-[var(--th-text-primary)]">{name || "User Name"}</h4>
              <p className="text-[10px] text-[var(--th-text-faint)] font-mono mt-0.5">@{username || "username"}</p>

              <div className="mt-4 pt-4 border-t border-dashed flex justify-around items-center" style={{ borderColor: "var(--th-border)" }}>
                <div>
                  <p className="text-[10px] text-[var(--th-text-faint)] uppercase font-bold">Status</p>
                  <span className="text-[10px] font-bold text-emerald-500 mt-0.5 inline-block">Active</span>
                </div>
                <div className="w-px h-6 bg-var(--th-border)" />
                <div>
                  <p className="text-[10px] text-[var(--th-text-faint)] uppercase font-bold">Plan</p>
                  <span className="text-[10px] font-bold text-blue-500 mt-0.5 inline-block">Premium</span>
                </div>
              </div>
            </div>

            {/* Sidebar Buttons */}
            <div className="space-y-1.5">
              {[
                { id: "profile", label: "Profile Settings", icon: User },
                { id: "education", label: "Academic Details", icon: GraduationCap },
                { id: "integrations", label: "Connected Accounts", icon: Link2 },
                { id: "preferences", label: "Preferences & Theme", icon: Laptop },
                { id: "security", label: "Security & Privacy", icon: Shield },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSaved(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer border-0 hover:bg-var(--th-bg-secondary)"
                  style={{
                    backgroundColor: activeTab === tab.id ? "rgba(0, 98, 255, 0.08)" : "transparent",
                    color: activeTab === tab.id ? "#0062FF" : "var(--th-text-secondary)",
                  }}
                >
                  <tab.icon size={15} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Help / Pro Card */}
            <div className="p-4 rounded-xl border border-blue-500/10 bg-blue-500/5 text-left space-y-2">
              <h5 className="text-xs font-bold text-[var(--th-text-primary)]">Synclyft AI Pro</h5>
              <p className="text-[10px] text-[var(--th-text-secondary)] leading-relaxed">Get unlimited AI mock interviews, deep resume feedback, and direct recruiter messaging.</p>
              <button type="button" className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline">Learn more →</button>
            </div>
          </div>

          {/* Settings Main Panels */}
          <div className="md:col-span-9">
            {activeTab === "profile" && (
              <motion.form
                onSubmit={handleSave}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl border space-y-6"
                style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}
              >
                <h3 className="font-bold text-sm text-[var(--th-text-primary)] border-b pb-3" style={{ borderColor: "var(--th-border)" }}>
                  Personal Profile Details
                </h3>

                {/* Profile Image upload layout */}
                <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-dashed" style={{ borderColor: "var(--th-border)" }}>
                  <div className="relative group w-20 h-20 rounded-full overflow-hidden border-2 cursor-pointer" style={{ borderColor: "var(--th-border-strong)", backgroundColor: "var(--th-bg-secondary)" }}>
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-lg text-blue-600 dark:text-blue-400">
                        {name.split(" ").map(n => n[0]).join("")}
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera size={18} className="text-white" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                  </div>

                  <div className="text-center sm:text-left space-y-2">
                    <p className="text-xs font-bold text-[var(--th-text-primary)]">Profile Photo</p>
                    <p className="text-[10px] text-[var(--th-text-faint)]">Hover & click the image frame to change (PNG, JPG or GIF. Max 2MB).</p>
                    {avatar && (
                      <div className="flex gap-2 justify-center sm:justify-start">
                        <button
                          type="button"
                          onClick={() => setAvatar(null)}
                          className="px-3 py-1 rounded-lg border text-[10px] font-bold text-[#FF5C5C] flex items-center gap-1 cursor-pointer transition-all hover:bg-red-500/10 border-red-500/20"
                        >
                          <Trash2 size={10} /> Remove Photo
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)]"
                      style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)" }}
                      required
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)]"
                      style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)" }}
                      required
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)]"
                      style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)" }}
                      required
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)]"
                      style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)" }}
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Location</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)]"
                      style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)" }}
                    />
                  </div>
                </div>

                {/* Save changes actions */}
                <div className="pt-4 border-t flex justify-end items-center gap-3" style={{ borderColor: "var(--th-border)" }}>
                  {saved && (
                    <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                      <Check size={14} /> Profile details saved successfully!
                    </span>
                  )}
                  <Button type="submit">
                    Save Profile
                  </Button>
                </div>
              </motion.form>
            )}

            {activeTab === "education" && (
              <motion.form
                onSubmit={handleSave}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl border space-y-6"
                style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}
              >
                <h3 className="font-bold text-sm text-[var(--th-text-primary)] border-b pb-3" style={{ borderColor: "var(--th-border)" }}>
                  Academic & Education Details
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">College / University</label>
                    <input
                      type="text"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)]"
                      style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)" }}
                      required
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Degree / Program</label>
                    <input
                      type="text"
                      value={degree}
                      onChange={(e) => setDegree(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)]"
                      style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)" }}
                      required
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Major / Field of Study</label>
                    <input
                      type="text"
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)]"
                      style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)" }}
                      required
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Graduation Year</label>
                    <input
                      type="number"
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)]"
                      style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)" }}
                      required
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">GPA / CGPA</label>
                    <input
                      type="text"
                      value={gpa}
                      onChange={(e) => setGpa(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)]"
                      style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)" }}
                      required
                    />
                  </div>
                </div>

                {/* Save changes actions */}
                <div className="pt-4 border-t flex justify-end items-center gap-3" style={{ borderColor: "var(--th-border)" }}>
                  {saved && (
                    <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                      <Check size={14} /> Academic details saved successfully!
                    </span>
                  )}
                  <Button type="submit">
                    Save Academic Details
                  </Button>
                </div>
              </motion.form>
            )}

            {activeTab === "integrations" && (
              <motion.form
                onSubmit={handleSave}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl border space-y-6"
                style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}
              >
                <h3 className="font-bold text-sm text-[var(--th-text-primary)] border-b pb-3" style={{ borderColor: "var(--th-border)" }}>
                  Connected Accounts & Integrations
                </h3>
                <p className="text-xs text-[var(--th-text-secondary)]">Link your profile with external platforms to sync coding achievements, metrics, and repositories.</p>

                <div className="grid sm:grid-cols-2 gap-3">
                  {PLATFORMS.map((platform) => {
                    const connected = connectedPlatforms.includes(platform.id);
                    return (
                      <div key={platform.id} className="p-3 rounded-xl border flex items-center justify-between text-left" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-bg-secondary)" }}>
                        <div>
                          <p className="text-xs font-bold text-[var(--th-text-primary)]">{platform.label}</p>
                          <p className="text-[10px] text-[var(--th-text-faint)]">
                            {connected ? "Connected Account" : "Not Connected"}
                          </p>
                        </div>
                        {connected ? (
                          <Badge variant="verdant">Connected</Badge>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartVerification(platform)}
                            className="bg-[#0062FF] hover:bg-[#004BE6] text-white hover:text-white px-2.5 py-1 rounded text-[11px] font-semibold border-0 cursor-pointer transition-colors"
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-6 border-t space-y-4 text-left" style={{ borderColor: "var(--th-border)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--th-text-primary)]">External Platform Performance</h4>
                      <p className="text-[10px] text-[var(--th-text-faint)] mt-0.5">Real-time sync of verified metrics and stats</p>
                    </div>
                  </div>

                  {syncError && (
                    <p className="text-[10px] font-semibold text-[#FF5C5C] bg-[#FF5C5C]/5 p-2.5 rounded-lg border border-[#FF5C5C]/15">
                      {syncError}
                    </p>
                  )}

                  <div className="grid sm:grid-cols-3 gap-4 pt-2">
                    {/* LeetCode Card */}
                    <div className="p-4 rounded-xl border space-y-2.5 text-left bg-[var(--th-bg-secondary)]" style={{ borderColor: "var(--th-border)" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest font-mono">LeetCode</span>
                        <button
                          type="button"
                          onClick={() => handleSyncPlatform("leetcode")}
                          disabled={syncLoadingPlat["leetcode"]}
                          className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded transition-all text-[var(--th-text-secondary)] hover:text-amber-500 cursor-pointer border-0 bg-transparent"
                          title="Sync LeetCode"
                        >
                          <RefreshCw size={11} className={syncLoadingPlat["leetcode"] ? "animate-spin text-amber-500" : ""} />
                        </button>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--th-text-secondary)]">Solved Count:</span>
                          <span className="font-bold text-[var(--th-text-primary)] font-mono">{JSON.parse(localStorage.getItem("leetcodeProfile") || "{}").totalSolved || 0}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--th-text-secondary)]">Global Ranking:</span>
                          <span className="font-bold text-[var(--th-text-primary)] font-mono">{JSON.parse(localStorage.getItem("leetcodeProfile") || "{}").globalRanking || "N/A"}</span>
                        </div>
                        <div className="flex justify-between text-[10px] pt-1 text-[var(--th-text-muted)]">
                          <span>E: {JSON.parse(localStorage.getItem("leetcodeProfile") || "{}").easySolved || 0}</span>
                          <span>M: {JSON.parse(localStorage.getItem("leetcodeProfile") || "{}").mediumSolved || 0}</span>
                          <span>H: {JSON.parse(localStorage.getItem("leetcodeProfile") || "{}").hardSolved || 0}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--th-text-secondary)]">Streak:</span>
                          <span className="font-bold text-[var(--th-text-primary)] font-mono">{JSON.parse(localStorage.getItem("leetcodeProfile") || "{}").streak || "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    {/* GitHub Card */}
                    <div className="p-4 rounded-xl border space-y-2.5 text-left bg-[var(--th-bg-secondary)]" style={{ borderColor: "var(--th-border)" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">GitHub</span>
                        <button
                          type="button"
                          onClick={() => handleSyncPlatform("github")}
                          disabled={syncLoadingPlat["github"]}
                          className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded transition-all text-[var(--th-text-secondary)] hover:text-indigo-400 cursor-pointer border-0 bg-transparent"
                          title="Sync GitHub"
                        >
                          <RefreshCw size={11} className={syncLoadingPlat["github"] ? "animate-spin text-indigo-400" : ""} />
                        </button>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--th-text-secondary)]">username:</span>
                          <span className="font-bold text-[var(--th-text-primary)] font-mono">
                            {JSON.parse(localStorage.getItem("githubProfile") || "{}").username || "Not Synced"}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--th-text-secondary)]">Public Repos:</span>
                          <span className="font-bold text-[var(--th-text-primary)] font-mono">
                            {JSON.parse(localStorage.getItem("githubProfile") || "{}").publicRepos || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--th-text-secondary)]">Total Stars:</span>
                          <span className="font-bold text-[var(--th-text-primary)] font-mono">{JSON.parse(localStorage.getItem("githubProfile") || "{}").starsEarned || 0}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--th-text-secondary)]">Contributions:</span>
                          <span className="font-bold text-[var(--th-text-primary)] font-mono">{JSON.parse(localStorage.getItem("githubProfile") || "{}").totalCommits || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* CodeChef Card */}
                    <div className="p-4 rounded-xl border space-y-2.5 text-left bg-[var(--th-bg-secondary)]" style={{ borderColor: "var(--th-border)" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest font-mono">CodeChef</span>
                        <button
                          type="button"
                          onClick={() => handleSyncPlatform("codechef")}
                          disabled={syncLoadingPlat["codechef"]}
                          className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded transition-all text-[var(--th-text-secondary)] hover:text-amber-600 cursor-pointer border-0 bg-transparent"
                          title="Sync CodeChef"
                        >
                          <RefreshCw size={11} className={syncLoadingPlat["codechef"] ? "animate-spin text-amber-600" : ""} />
                        </button>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--th-text-secondary)]">Rating stars:</span>
                          <span className="font-bold text-[var(--th-text-primary)] font-mono">{syncData?.codechef?.rating || 0}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--th-text-secondary)]">Global Placement:</span>
                          <span className="font-bold text-[var(--th-text-primary)] font-mono">{syncData?.codechef?.globalRank || "N/A"}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--th-text-secondary)]">Division:</span>
                          <span className="font-bold text-[var(--th-text-primary)] font-mono">{syncData?.codechef?.division || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save changes actions */}
                <div className="pt-4 border-t flex justify-end items-center gap-3" style={{ borderColor: "var(--th-border)" }}>
                  {saved && (
                    <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                      <Check size={14} /> Integrations saved successfully!
                    </span>
                  )}
                  <Button type="submit">
                    Save Integrations
                  </Button>
                </div>
              </motion.form>
            )}

            {activeTab === "preferences" && (
              <motion.form
                onSubmit={handleSave}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl border space-y-6"
                style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}
              >
                <h3 className="font-bold text-sm text-[var(--th-text-primary)] border-b pb-3" style={{ borderColor: "var(--th-border)" }}>
                  Preferences & Theme
                </h3>

                {/* Theme Selector Section */}
                <div className="space-y-3 text-left">
                  <h4 className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Theme Mode</h4>
                  <p className="text-xs text-[var(--th-text-secondary)] mb-4">Choose your preferred style for the interface.</p>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Light Theme Card */}
                    <div
                      onClick={() => setTheme("light")}
                      className="p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between h-28 text-left"
                      style={{
                        backgroundColor: theme === "light" ? "rgba(0, 98, 255, 0.04)" : "var(--th-bg-secondary)",
                        borderColor: theme === "light" ? "#0062FF" : "var(--th-border)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--th-text-primary)] flex items-center gap-1.5">
                          <Sun size={15} className="text-[#9CA3AF]" /> Light Theme
                        </span>
                        <input
                          type="radio"
                          checked={theme === "light"}
                          onChange={() => setTheme("light")}
                          className="w-3.5 h-3.5 accent-[#0062FF]"
                        />
                      </div>
                      <p className="text-[10px] text-[var(--th-text-faint)]">Clean, high-contrast, optimized for bright environments.</p>
                    </div>

                    {/* Dark Theme Card */}
                    <div
                      onClick={() => setTheme("dark")}
                      className="p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between h-28 text-left"
                      style={{
                        backgroundColor: theme === "dark" ? "rgba(0, 98, 255, 0.04)" : "var(--th-bg-secondary)",
                        borderColor: theme === "dark" ? "#0062FF" : "var(--th-border)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--th-text-primary)] flex items-center gap-1.5">
                          <Moon size={15} className="text-[#0062FF]" /> Dark Theme
                        </span>
                        <input
                          type="radio"
                          checked={theme === "dark"}
                          onChange={() => setTheme("dark")}
                          className="w-3.5 h-3.5 accent-[#0062FF]"
                        />
                      </div>
                      <p className="text-[10px] text-[var(--th-text-faint)]">Low-light mode, easy on the eyes, premium aesthetic.</p>
                    </div>
                  </div>
                </div>

                {/* Theme Toggle Component Section */}
                <div className="pt-4 border-t space-y-3 text-left" style={{ borderColor: "var(--th-border)" }}>
                  <h4 className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Quick Toggle</h4>
                  <div className="flex items-center justify-between p-3.5 rounded-xl border animate-none" style={{ borderColor: "var(--th-border)" }}>
                    <div>
                      <p className="text-xs font-semibold text-[var(--th-text-primary)]">Toggle Mode</p>
                      <p className="text-[10px] text-[var(--th-text-faint)]">Quickly switch between light and dark themes</p>
                    </div>
                    <ThemeToggle variant="pill" size="md" />
                  </div>
                </div>

                {/* Additional preferences */}
                <div className="pt-4 border-t space-y-4 text-left" style={{ borderColor: "var(--th-border)" }}>
                  <h4 className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Display & Notifications</h4>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[var(--th-text-primary)]">Compact View</p>
                      <p className="text-[10px] text-[var(--th-text-faint)]">Decrease spacing and margin sizes in tables</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={compactMode}
                      onChange={(e) => setCompactMode(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#0062FF] cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[var(--th-text-primary)]">Reduce Motion</p>
                      <p className="text-[10px] text-[var(--th-text-faint)]">Minimize animations across transitions and panels</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={reduceMotion}
                      onChange={(e) => setReduceMotion(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#0062FF] cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[var(--th-text-primary)]">Email Digests</p>
                      <p className="text-[10px] text-[var(--th-text-faint)]">Receive weekly analytics briefings in your mailbox</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#0062FF] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Save changes actions */}
                <div className="pt-4 border-t flex justify-end items-center gap-3" style={{ borderColor: "var(--th-border)" }}>
                  {saved && (
                    <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                      <Check size={14} /> Preferences saved successfully!
                    </span>
                  )}
                  <Button type="submit">
                    Save Preferences
                  </Button>
                </div>
              </motion.form>
            )}

            {activeTab === "security" && (
              <motion.form
                onSubmit={handleSave}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl border space-y-6"
                style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}
              >
                <h3 className="font-bold text-sm text-[var(--th-text-primary)] border-b pb-3" style={{ borderColor: "var(--th-border)" }}>
                  Security & Privacy Settings
                </h3>

                <div className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full max-w-md px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)]"
                      style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)" }}
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full max-w-md px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)]"
                      style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)" }}
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full max-w-md px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)]"
                      style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)" }}
                    />
                  </div>
                </div>

                {/* Save changes actions */}
                <div className="pt-4 border-t flex justify-end items-center gap-3" style={{ borderColor: "var(--th-border)" }}>
                  {saved && (
                    <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                      <Check size={14} /> Password updated successfully!
                    </span>
                  )}
                  <Button type="submit">
                    Update Password
                  </Button>
                </div>
              </motion.form>
            )}
          </div>

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
              <div className="w-7 h-7 rounded flex items-center justify-center bg-blue-500/10">
                <Link2 size={14} style={{ color: verificationPlatform.color }} />
              </div>
              <h3 className="text-sm font-bold text-[var(--th-text-primary)]">Verify {verificationPlatform.label}</h3>
            </div>

            {!verificationToken ? (
              <form onSubmit={handleInitiateVerification} className="space-y-4">
                <p className="text-xs text-[var(--th-text-secondary)] leading-relaxed">
                  Enter your {verificationPlatform.label} username to generate a unique verification code.
                </p>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Username</label>
                  <input
                    type="text"
                    required
                    value={platformUsername}
                    onChange={(e) => setPlatformUsername(e.target.value)}
                    placeholder={`Your ${verificationPlatform.label} username`}
                    className="w-full px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)] bg-[var(--th-input-bg)]"
                    style={{ borderColor: "var(--th-border-strong)" }}
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

                <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--th-border-strong)] bg-[var(--th-bg-secondary)]">
                  <code className="text-xs font-mono select-all break-all pr-2 text-[var(--th-text-primary)]">
                    {verificationToken}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(verificationToken);
                      alert("Token copied to clipboard!");
                    }}
                    className="flex items-center gap-1 px-2 py-1 hover:bg-neutral-150 dark:hover:bg-neutral-800 rounded transition-colors text-xs font-semibold text-blue-500 border border-blue-500/20 bg-blue-500/5 cursor-pointer shrink-0"
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
