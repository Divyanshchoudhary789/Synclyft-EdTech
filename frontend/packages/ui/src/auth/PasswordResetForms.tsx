"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, MailCheck, ShieldCheck, CheckCircle2,
} from "lucide-react";
import { api } from "@synclyft/lib/api";
import { Logo } from "../components/Logo";

/* ─────────────────────────── shared page frame ─────────────────────────── */

function AuthFrame({
  backHref,
  backLabel,
  rightSlot,
  children,
}: {
  backHref: string;
  backLabel: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{ backgroundColor: "var(--th-bg)", color: "var(--th-text-primary)", fontFamily: "var(--font-inter), sans-serif" }}
    >
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0" style={{ background: "var(--th-hero-grad)" }} />
        <div
          className="absolute -left-24 -top-24 h-96 w-96 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--th-primary) 12%, transparent), transparent 70%)" }}
        />
      </div>

      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-4">
          <a href={backHref} className="flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-80" style={{ color: "var(--th-text-muted)" }}>
            <ArrowLeft size={13} /> {backLabel}
          </a>
          <a href="/" className="flex items-center gap-2.5">
            <Logo size={24} />
            <span className="text-sm font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>Synclyft AI</span>
          </a>
        </div>
        {rightSlot}
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-5 py-8">
        <div
          className="animate-in fade-in slide-in-from-bottom-2 w-full max-w-[420px] rounded-2xl border p-6 shadow-xl backdrop-blur-sm duration-500 sm:p-7"
          style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-surface)" }}
        >
          {children}
        </div>
      </div>

      <div
        className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 text-[0.6rem] font-mono uppercase tracking-widest"
        style={{ color: "var(--th-text-muted)" }}
      >
        <span>© {new Date().getFullYear()} Synclyft AI Technologies</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3DDC84]" /> All systems operational
        </span>
      </div>
    </div>
  );
}

const trust = ["TLS encrypted", "Zero data retention", "SOC 2 aligned"];
function TrustRow() {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
      {trust.map((t) => (
        <span key={t} className="flex items-center gap-1 font-mono text-[0.58rem] uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
          <CheckCircle2 size={9} className="text-[#3DDC84]" /> {t}
        </span>
      ))}
    </div>
  );
}

function IconBadge({ children }: { children: ReactNode }) {
  return (
    <span
      className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl"
      style={{ backgroundColor: "color-mix(in srgb, var(--th-primary) 12%, transparent)", color: "var(--th-primary)" }}
    >
      {children}
    </span>
  );
}

const inputBase = "w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all";
function fieldStyle(active: boolean): React.CSSProperties {
  return {
    backgroundColor: "var(--th-input-bg)",
    borderColor: active ? "var(--th-primary)" : "var(--th-input-border)",
    color: "var(--th-text-primary)",
    boxShadow: active ? "0 0 0 3px color-mix(in srgb, var(--th-primary) 18%, transparent)" : "none",
  };
}

const SubmitBtn = ({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) => (
  <button
    type="submit"
    disabled={loading}
    className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60"
    style={{ backgroundColor: "var(--th-primary)", boxShadow: "0 4px 16px color-mix(in srgb, var(--th-primary) 25%, transparent)" }}
  >
    {loading ? (
      <>
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
        </svg>
        {loadingLabel}
      </>
    ) : (
      <>{label} <ArrowRight size={15} /></>
    )}
  </button>
);

/* ─────────────────────────── Forgot password ─────────────────────────── */

const forgotSchema = z.object({ email: z.string().email("Enter a valid email address") });

export function ForgotPasswordForm({ loginHref = "/login" }: { loginHref?: string }) {
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } =
    useForm<{ email: string }>({ resolver: zodResolver(forgotSchema) });

  const onSubmit = async ({ email }: { email: string }) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await api.post("/password-reset/forgot", { email });
      setSentTo(email);
    } catch (err) {
      setErrorMsg((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Couldn't send the reset link. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame
      backHref={loginHref}
      backLabel="Back to sign in"
      rightSlot={
        <p className="text-xs" style={{ color: "var(--th-text-muted)" }}>
          Remembered?{" "}
          <a href={loginHref} className="font-semibold hover:underline" style={{ color: "var(--th-primary)" }}>Sign in</a>
        </p>
      }
    >
      <>
        {!sentTo ? (
          <div>
            <IconBadge><KeyRound size={20} /></IconBadge>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
              Forgot your password?
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--th-text-secondary)" }}>
              Enter your account email and we&apos;ll send a secure reset link.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-3.5">
              <div className="space-y-1">
                <label className="text-[0.7rem] font-semibold uppercase tracking-widest" style={{ color: "var(--th-text-muted)" }}>Email address</label>
                <input
                  {...register("email")}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  className={inputBase}
                  style={fieldStyle(focused)}
                />
                {errors.email && <p className="text-xs" style={{ color: "#FF5C5C" }}>{errors.email.message}</p>}
              </div>

              {errorMsg && (
                <p className="rounded-xl border p-3 text-xs font-medium" style={{ color: "#FF5C5C", borderColor: "rgba(255,92,92,0.25)", backgroundColor: "rgba(255,92,92,0.08)" }}>
                  {errorMsg}
                </p>
              )}

              <SubmitBtn loading={loading} label="Send reset link" loadingLabel="Sending…" />
            </form>
          </div>
        ) : (
          <div className="text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(61,220,132,0.12)", color: "#3DDC84" }}>
              <MailCheck size={24} />
            </span>
            <h2 className="text-lg font-extrabold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>Check your inbox</h2>
            <p className="mt-1.5 text-sm" style={{ color: "var(--th-text-secondary)" }}>
              If an account exists for <span className="font-semibold" style={{ color: "var(--th-text-primary)" }}>{sentTo}</span>, a reset link is on its way. It expires in 15 minutes.
            </p>
            <a
              href={loginHref}
              className="mt-5 flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold text-white transition-all hover:brightness-110"
              style={{ backgroundColor: "var(--th-primary)" }}
            >
              Back to sign in
            </a>
            <button onClick={() => setSentTo(null)} className="mt-3 text-xs font-semibold hover:underline" style={{ color: "var(--th-primary)" }}>
              Try a different email
            </button>
          </div>
        )}
      </>
      <TrustRow />
    </AuthFrame>
  );
}

/* ─────────────────────────── Reset password ─────────────────────────── */

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "One uppercase letter")
      .regex(/[a-z]/, "One lowercase letter")
      .regex(/[0-9]/, "One number")
      .regex(/[^a-zA-Z0-9]/, "One special character"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

type ResetForm = z.infer<typeof resetSchema>;

const RULES: Array<[keyof ResetForm | "len", string, (v: string) => boolean]> = [
  ["len", "8+ characters", (v) => v.length >= 8],
  ["password", "Uppercase", (v) => /[A-Z]/.test(v)],
  ["password", "Lowercase", (v) => /[a-z]/.test(v)],
  ["password", "Number", (v) => /[0-9]/.test(v)],
  ["password", "Special char", (v) => /[^a-zA-Z0-9]/.test(v)],
];

export function ResetPasswordForm({ token, loginHref = "/login" }: { token: string | null; loginHref?: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(token ? null : "This reset link is missing or invalid. Request a new one.");

  const { register, handleSubmit, watch, formState: { errors } } =
    useForm<ResetForm>({ resolver: zodResolver(resetSchema) });
  const pw = watch("password") || "";

  useEffect(() => {
    if (!token) setErrorMsg("This reset link is missing or invalid. Request a new one.");
  }, [token]);

  const onSubmit = async ({ password }: ResetForm) => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await api.post("/password-reset/reset", { token, password });
      setDone(true);
    } catch (err) {
      setErrorMsg((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Couldn't reset the password — the link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame backHref={loginHref} backLabel="Back to sign in">
      <>
        {!done ? (
          <div>
            <IconBadge><LockKeyhole size={20} /></IconBadge>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
              Set a new password
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--th-text-secondary)" }}>
              Choose a strong password you don&apos;t use anywhere else.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-3.5">
              <div className="space-y-1">
                <label className="text-[0.7rem] font-semibold uppercase tracking-widest" style={{ color: "var(--th-text-muted)" }}>New password</label>
                <div className="relative">
                  <input
                    {...register("password")}
                    type={show ? "text" : "password"}
                    placeholder="••••••••"
                    disabled={!token || loading}
                    onFocus={() => setFocused("password")}
                    onBlur={() => setFocused(null)}
                    className={`${inputBase} pr-11`}
                    style={fieldStyle(focused === "password")}
                  />
                  <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-95" style={{ color: "var(--th-text-primary)" }} aria-label={show ? "Hide password" : "Show password"}>
                    {show ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {(focused === "password" || pw.length > 0) && (
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {RULES.map(([, label, test]) => {
                    const ok = test(pw);
                    return (
                      <span key={label} className="flex items-center gap-1 text-[0.68rem] font-medium" style={{ color: ok ? "#3DDC84" : "var(--th-text-faint)" }}>
                        <CheckCircle2 size={10} /> {label}
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[0.7rem] font-semibold uppercase tracking-widest" style={{ color: "var(--th-text-muted)" }}>Confirm password</label>
                <div className="relative">
                  <input
                    {...register("confirmPassword")}
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    disabled={!token || loading}
                    onFocus={() => setFocused("confirm")}
                    onBlur={() => setFocused(null)}
                    className={`${inputBase} pr-11`}
                    style={fieldStyle(focused === "confirm")}
                  />
                  <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-95" style={{ color: "var(--th-text-primary)" }} aria-label={showConfirm ? "Hide password" : "Show password"}>
                    {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs" style={{ color: "#FF5C5C" }}>{errors.confirmPassword.message}</p>}
              </div>

              {errorMsg && (
                <p className="rounded-xl border p-3 text-xs font-medium" style={{ color: "#FF5C5C", borderColor: "rgba(255,92,92,0.25)", backgroundColor: "rgba(255,92,92,0.08)" }}>
                  {errorMsg}
                </p>
              )}

              <SubmitBtn loading={loading} label="Reset password" loadingLabel="Updating…" />
            </form>
          </div>
        ) : (
          <div className="text-center">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(61,220,132,0.12)", color: "#3DDC84" }}>
              <ShieldCheck size={24} />
            </span>
            <h2 className="text-lg font-extrabold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>Password updated</h2>
            <p className="mt-1.5 text-sm" style={{ color: "var(--th-text-secondary)" }}>
              You can now sign in with your new password.
            </p>
            <a
              href={loginHref}
              className="mt-5 flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold text-white transition-all hover:brightness-110"
              style={{ backgroundColor: "var(--th-primary)" }}
            >
              Continue to sign in
            </a>
          </div>
        )}
      </>
      <TrustRow />
    </AuthFrame>
  );
}
