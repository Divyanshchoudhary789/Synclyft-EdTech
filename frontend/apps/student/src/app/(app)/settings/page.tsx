"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@synclyft/ui/components/Button";
import { Badge } from "@synclyft/ui/components/Badge";
import { ThemeToggle } from "@synclyft/ui/components/ThemeToggle";
import { SkeletonBlock } from "@synclyft/ui/components/SkeletonBlock";
import { Modal } from "@synclyft/ui/components/Modal";
import { useTheme } from "@synclyft/lib/theme";
import { useAuthStore } from "@synclyft/lib/store/auth";
import { studentService, notificationService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { useStudentProfile } from "@synclyft/lib/api/hooks";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Settings as SettingsIcon, User, Shield, Laptop, Check, GraduationCap, Link2,
  Camera, RefreshCw, Copy, Sun, Moon, CheckCircle2, ExternalLink,
} from "lucide-react";

type Tab = "profile" | "education" | "integrations" | "preferences" | "security";

const VERIFIABLE = [
  { id: "github", label: "GitHub" },
  { id: "leetcode", label: "LeetCode" },
  { id: "codeforces", label: "Codeforces" },
  { id: "hackerrank", label: "HackerRank" },
] as const;

const STAT_LABEL: Record<string, string> = {
  publicRepos: "Repos", starsEarned: "Stars", followers: "Followers", following: "Following",
  totalSolved: "Solved", easySolved: "Easy", mediumSolved: "Medium", hardSolved: "Hard",
  contestRating: "Rating", globalRanking: "Rank", streak: "Streak", totalActiveDays: "Active days",
  attendedContestsCount: "Contests", rating: "Rating", maxRating: "Peak rating",
  contribution: "Contribution", friendOfCount: "Friends", totalSubmissions: "Submissions",
  badgesCount: "Badges", followersCount: "Followers",
};

export default function SettingsPage() {
  const { user, fetchUser } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("profile");

  const { data: profile, isLoading, refetch } = useStudentProfile();

  // ── Editable academic form ──
  const [form, setForm] = useState({
    branch: "", graduationYear: "", cgpa: "", attendance: "", targetRole: "",
    skills: "", preferredInterviewLanguage: "",
  });
  const [savingForm, setSavingForm] = useState(false);

  useEffect(() => { fetchUser(); }, [fetchUser]);
  useEffect(() => {
    if (!profile) return;
    setForm({
      branch: profile.branch ?? "",
      graduationYear: profile.graduationYear ? String(profile.graduationYear) : "",
      cgpa: profile.cgpa ? String(profile.cgpa) : "",
      attendance: profile.attendance ? String(profile.attendance) : "",
      targetRole: profile.targetRole ?? "",
      skills: (profile.skills ?? []).join(", "),
      preferredInterviewLanguage: profile.preferredInterviewLanguage ?? "",
    });
  }, [profile]);

  const avatar = profile?.profilePicture || user?.profilePicture || null;

  const saveAcademic = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingForm(true);
    try {
      const fd = new FormData();
      if (form.branch) fd.append("branch", form.branch);
      if (form.graduationYear) fd.append("graduationYear", form.graduationYear);
      if (form.cgpa) fd.append("cgpa", form.cgpa);
      if (form.attendance) fd.append("attendance", form.attendance);
      if (form.targetRole) fd.append("targetRole", form.targetRole);
      if (form.preferredInterviewLanguage) fd.append("preferredInterviewLanguage", form.preferredInterviewLanguage);
      if (form.skills) fd.append("skills", form.skills);
      await studentService.updateProfile(fd);
      toast.success("Profile updated");
      refetch();
      qc.invalidateQueries({ queryKey: ["student"] });
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setSavingForm(false);
    }
  };

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("Image must be under 2MB");
    const t = toast.loading("Uploading photo…");
    try {
      await studentService.updateProfilePicture(file);
      toast.success("Photo updated", { id: t });
      await fetchUser(true);
      refetch();
    } catch (err) {
      toast.error(toApiError(err).message, { id: t });
    }
  };

  // ── Platform verification ──
  const [modal, setModal] = useState<null | { id: string; label: string }>(null);
  const [pUsername, setPUsername] = useState("");
  const [pToken, setPToken] = useState<string | null>(null);
  const [pBusy, setPBusy] = useState(false);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

  const initiate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal || !pUsername.trim()) return;
    setPBusy(true);
    try {
      const res = await studentService.initiatePlatform(modal.id, pUsername.trim());
      setPToken((res as { token?: string }).token ?? null);
      toast.success("Verification token generated");
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setPBusy(false);
    }
  };

  const verify = async () => {
    if (!modal) return;
    setPBusy(true);
    try {
      await studentService.verifyPlatform(modal.id);
      toast.success(`${modal.label} verified`);
      setModal(null); setPToken(null); setPUsername("");
      refetch();
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setPBusy(false);
    }
  };

  const sync = async (id: string) => {
    setSyncing((s) => ({ ...s, [id]: true }));
    try {
      await studentService.syncPlatform(id);
      toast.success(`Synced ${id}`);
      refetch();
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setSyncing((s) => ({ ...s, [id]: false }));
    }
  };

  const metrics = useMemo(
    () => (profile?.externalMetrics ?? {}) as unknown as Record<string, Record<string, unknown>>,
    [profile]
  );

  // ── Notification preferences (backend shape: { globalChannels: { inApp, email } }) ──
  const [prefs, setPrefs] = useState<{ email: boolean; inApp: boolean }>({ email: false, inApp: true });
  useEffect(() => {
    notificationService.getPreferences().then((r: unknown) => {
      const p = ((r as { data?: Record<string, unknown> })?.data ?? r) as Record<string, unknown>;
      const gc = (p?.globalChannels ?? {}) as { inApp?: boolean; email?: boolean };
      setPrefs({ email: gc.email ?? false, inApp: gc.inApp ?? true });
    }).catch(() => {});
  }, []);
  const savePrefs = async (next: typeof prefs) => {
    setPrefs(next);
    try {
      await notificationService.updatePreferences({ globalChannels: { inApp: next.inApp, email: next.email } });
      toast.success("Preferences saved");
    } catch (err) {
      toast.error(toApiError(err).message);
    }
  };

  const field = (label: string, key: keyof typeof form, type = "text") => (
    <div className="space-y-1.5 text-left">
      <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full px-3 py-2 rounded-lg border text-xs"
        style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }}
      />
    </div>
  );

  return (
    <div style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <div>
        <div className="flex items-center gap-2 mb-6 sm:mb-8 pb-4 border-b border-dashed" style={{ borderColor: "var(--th-border)" }}>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400"><SettingsIcon size={22} /></div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: "var(--th-text-primary)" }}>Account settings</h1>
            <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>Profile, connected platforms and preferences</p>
          </div>
        </div>

        <div className="grid md:grid-cols-12 gap-4 md:gap-6 items-start">
          <div className="md:col-span-3 flex md:flex-col gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible">
            {([
              ["profile", "Profile", User],
              ["education", "Academics", GraduationCap],
              ["integrations", "Connected accounts", Link2],
              ["preferences", "Preferences", Laptop],
              ["security", "Security", Shield],
            ] as const).map(([id, label, Icon]) => (
              <button key={id} type="button" onClick={() => setTab(id)}
                className="shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3.5 md:px-4 py-2 md:py-2.5 rounded-xl text-left text-xs font-semibold transition-all whitespace-nowrap border md:border-0"
                style={{
                  backgroundColor: tab === id ? "rgba(0,98,255,0.08)" : "transparent",
                  color: tab === id ? "#0062FF" : "var(--th-text-secondary)",
                  borderColor: tab === id ? "rgba(0,98,255,0.25)" : "var(--th-card-border)",
                }}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

          <div className="md:col-span-9 min-w-0">
            {/* PROFILE */}
            {tab === "profile" && (
              <div
                className="p-6 rounded-2xl border space-y-6" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                <h3 className="font-bold text-sm border-b pb-3" style={{ color: "var(--th-text-primary)", borderColor: "var(--th-border)" }}>Personal profile</h3>
                <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-dashed" style={{ borderColor: "var(--th-border)" }}>
                  <div className="relative group w-20 h-20 rounded-full overflow-hidden border-2" style={{ borderColor: "var(--th-border-strong)", backgroundColor: "var(--th-bg-secondary)" }}>
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-lg text-blue-600 dark:text-blue-400">
                        {(user?.name ?? "U").split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera size={18} className="text-white" />
                      <input type="file" accept="image/*" className="hidden" onChange={onAvatar} />
                    </label>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>{user?.name ?? "—"}</p>
                    <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>{user?.email ?? "—"}</p>
                    <p className="text-[10px] mt-1" style={{ color: "var(--th-text-faint)" }}>Hover the photo to change it (PNG/JPG, max 2MB)</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Name</label>
                    <input disabled value={user?.name ?? ""} className="w-full px-3 py-2 rounded-lg border text-xs opacity-60"
                      style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Organization</label>
                    <input disabled value={user?.organization ?? ""} className="w-full px-3 py-2 rounded-lg border text-xs opacity-60"
                      style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
                  </div>
                </div>
                <p className="text-[11px]" style={{ color: "var(--th-text-faint)" }}>Editable academic details are under the Academics tab.</p>
              </div>
            )}

            {/* EDUCATION */}
            {tab === "education" && (
              <form onSubmit={saveAcademic}
                className="p-6 rounded-2xl border space-y-6" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                <h3 className="font-bold text-sm border-b pb-3" style={{ color: "var(--th-text-primary)", borderColor: "var(--th-border)" }}>Academic details</h3>
                {isLoading ? (
                  <div className="space-y-3"><SkeletonBlock height="h-9" /><SkeletonBlock height="h-9" /><SkeletonBlock height="h-9" /></div>
                ) : (
                  <>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {field("Branch", "branch")}
                      {field("Graduation year", "graduationYear", "number")}
                      {field("CGPA", "cgpa", "number")}
                      {field("Attendance %", "attendance", "number")}
                      {field("Target role", "targetRole")}
                      {field("Preferred interview language", "preferredInterviewLanguage")}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Skills (comma separated)</label>
                      <input value={form.skills} onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border text-xs"
                        style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
                    </div>
                    <div className="pt-4 border-t flex justify-end" style={{ borderColor: "var(--th-border)" }}>
                      <Button type="submit" loading={savingForm}>Save academic details</Button>
                    </div>
                  </>
                )}
              </form>
            )}

            {/* INTEGRATIONS */}
            {tab === "integrations" && (
              <div
                className="p-6 rounded-2xl border space-y-5" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                <h3 className="font-bold text-sm border-b pb-3" style={{ color: "var(--th-text-primary)", borderColor: "var(--th-border)" }}>Connected coding platforms</h3>
                <p className="text-xs" style={{ color: "var(--th-text-secondary)" }}>
                  Verify a platform by pasting a one-time token into your profile bio, then hit verify. Verified metrics feed your readiness score.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {VERIFIABLE.map((p) => {
                    const m = metrics[p.id];
                    const verified = !!m?.isVerified;
                    const username = String(m?.username ?? "");
                    return (
                      <div key={p.id} className="p-4 rounded-xl border" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-bg-secondary)" }}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold" style={{ color: "var(--th-text-primary)" }}>{p.label}</p>
                            <p className="text-[10px]" style={{ color: "var(--th-text-faint)" }}>{username ? `@${username}` : "Not connected"}</p>
                          </div>
                          {verified ? (
                            <div className="flex items-center gap-1.5">
                              <button type="button" onClick={() => sync(p.id)} disabled={syncing[p.id]} title="Sync">
                                <RefreshCw size={13} className={syncing[p.id] ? "animate-spin" : ""} style={{ color: "var(--th-text-secondary)" }} />
                              </button>
                              <Badge variant="verdant">Verified</Badge>
                            </div>
                          ) : (
                            <button type="button" onClick={() => { setModal(p); setPUsername(username); setPToken(null); }}
                              className="px-2.5 py-1 rounded text-[11px] font-semibold text-white" style={{ backgroundColor: "var(--th-primary)" }}>
                              {username ? "Verify" : "Connect"}
                            </button>
                          )}
                        </div>
                        {verified && (
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px]" style={{ color: "var(--th-text-muted)" }}>
                            {Object.entries(m ?? {})
                              .filter(([k, v]) => typeof v === "number" && v > 0 && (STAT_LABEL[k] !== undefined))
                              .slice(0, 4)
                              .map(([k, v]) => <span key={k}>{STAT_LABEL[k]}: <strong style={{ color: "var(--th-text-secondary)" }}>{Number(v).toLocaleString()}</strong></span>)}
                            {m?.lastSyncedAt ? (
                              <span className="w-full text-[9px]" style={{ color: "var(--th-text-faint)" }}>
                                Synced {new Date(String(m.lastSyncedAt)).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {profile?.githubProfile || profile?.linkedinProfile ? (
                  <div className="pt-3 border-t flex flex-wrap gap-4 text-xs" style={{ borderColor: "var(--th-border)" }}>
                    {profile?.githubProfile && <a href={profile.githubProfile} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 flex items-center gap-1">GitHub <ExternalLink size={10} /></a>}
                    {profile?.linkedinProfile && <a href={profile.linkedinProfile} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 flex items-center gap-1">LinkedIn <ExternalLink size={10} /></a>}
                  </div>
                ) : null}
              </div>
            )}

            {/* PREFERENCES */}
            {tab === "preferences" && (
              <div
                className="p-6 rounded-2xl border space-y-6" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                <h3 className="font-bold text-sm border-b pb-3" style={{ color: "var(--th-text-primary)", borderColor: "var(--th-border)" }}>Preferences</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {(["light", "dark"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setTheme(t)}
                      className="p-4 rounded-xl border text-left flex flex-col justify-between h-24"
                      style={{
                        backgroundColor: theme === t ? "rgba(0,98,255,0.04)" : "var(--th-bg-secondary)",
                        borderColor: theme === t ? "#0062FF" : "var(--th-border)",
                      }}>
                      <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: "var(--th-text-primary)" }}>
                        {t === "light" ? <Sun size={15} /> : <Moon size={15} />} {t === "light" ? "Light" : "Dark"} theme
                      </span>
                      {theme === t && <span className="text-[10px] text-blue-500 flex items-center gap-1"><Check size={11} /> Active</span>}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl border" style={{ borderColor: "var(--th-border)" }}>
                  <span className="text-xs font-semibold" style={{ color: "var(--th-text-primary)" }}>Quick toggle</span>
                  <ThemeToggle variant="pill" size="md" />
                </div>
                <div className="pt-4 border-t space-y-4" style={{ borderColor: "var(--th-border)" }}>
                  <h4 className="text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Notifications</h4>
                  {([["email", "Email notifications"], ["inApp", "In-app notifications"]] as const).map(([k, label]) => (
                    <label key={k} className="flex items-center justify-between cursor-pointer">
                      <span className="text-xs font-semibold" style={{ color: "var(--th-text-primary)" }}>{label}</span>
                      <input type="checkbox" checked={prefs[k]} onChange={(e) => savePrefs({ ...prefs, [k]: e.target.checked })}
                        className="w-4 h-4 rounded accent-[#0062FF]" />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* SECURITY */}
            {tab === "security" && (
              <div
                className="p-6 rounded-2xl border space-y-5" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                <h3 className="font-bold text-sm border-b pb-3" style={{ color: "var(--th-text-primary)", borderColor: "var(--th-border)" }}>Security</h3>
                <div className="rounded-xl border p-4 flex items-start gap-3" style={{ borderColor: "var(--th-border)" }}>
                  <Shield size={16} className="mt-0.5 text-blue-500" />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "var(--th-text-primary)" }}>Change password</p>
                    <p className="text-[11px] mt-1" style={{ color: "var(--th-text-faint)" }}>
                      For security, password changes go through an email link.
                    </p>
                    <a href="/forgot-password" className="mt-2 inline-block text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                      Send me a reset link →
                    </a>
                  </div>
                </div>
                <div className="rounded-xl border p-4 flex items-center gap-3" style={{ borderColor: "var(--th-border)" }}>
                  <CheckCircle2 size={16} className={user?.isEmailVerified ? "text-emerald-500" : "text-amber-500"} />
                  <p className="text-xs" style={{ color: "var(--th-text-secondary)" }}>
                    Email {user?.isEmailVerified ? "verified" : "not verified"} · {user?.email}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verification modal */}
      <Modal
        open={!!modal}
        onClose={() => { setModal(null); setPToken(null); setPUsername(""); }}
        size="sm"
        icon={<div className="grid h-8 w-8 place-items-center rounded-lg" style={{ backgroundColor: "color-mix(in srgb, var(--th-primary) 12%, transparent)" }}><Link2 size={15} style={{ color: "var(--th-primary)" }} /></div>}
        title={`Connect ${modal?.label ?? ""}`}
        subtitle={pToken ? "Step 2 of 2 — verify the token" : "Step 1 of 2 — confirm your username"}
        footer={
          !pToken ? (
            <>
              <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="button" loading={pBusy} onClick={() => initiate({ preventDefault() {} } as React.FormEvent)} disabled={!pUsername.trim()}>Generate token</Button>
            </>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={() => setPToken(null)}>Back</Button>
              <Button type="button" onClick={verify} loading={pBusy}>Verify &amp; connect</Button>
            </>
          )
        }
      >
        {!pToken ? (
          <form onSubmit={initiate} className="space-y-3">
            <p className="text-xs" style={{ color: "var(--th-text-secondary)" }}>
              Enter your {modal?.label} username. We&apos;ll check it exists and give you a one-time token to prove the account is yours.
            </p>
            <input required value={pUsername} onChange={(e) => setPUsername(e.target.value)} placeholder={`${modal?.label ?? ""} username`}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
              style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: "var(--th-text-secondary)" }}>
              Paste this token anywhere in your <strong>{modal?.label}</strong> profile bio or name field, save it, then hit Verify. You can remove it afterwards.
            </p>
            <div className="flex items-center justify-between gap-2 rounded-lg border p-3" style={{ borderColor: "var(--th-border-strong)", backgroundColor: "var(--th-bg-secondary)" }}>
              <code className="select-all break-all pr-2 font-mono text-xs" style={{ color: "var(--th-text-primary)" }}>{pToken}</code>
              <button type="button" onClick={() => { navigator.clipboard?.writeText(pToken); toast.success("Copied"); }}
                className="flex shrink-0 items-center gap-1 rounded border border-blue-500/20 px-2 py-1 text-xs font-semibold text-blue-500">
                <Copy size={12} /> Copy
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
