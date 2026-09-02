"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ArrowRight, ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { api, toApiError } from "@synclyft/lib/api";
import { useAuthStore } from "@synclyft/lib/store/auth";
import { Logo } from "../components/Logo";
import { OAUTH_PROVIDERS } from "./brandIcons";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormData = z.infer<typeof schema>;

export interface LoginFormProps {
  /** Copy shown above the form. */
  heading: string;
  subheading: string;
  /** Backend role this app expects. Login is rejected (with a message) otherwise. */
  expectedRole: "student" | "college-admin" | "super-admin";
  /** Where to send the user after a successful, role-matched login. */
  redirectTo: string;
  /** Show the "Create account" link (student + officer, not admin). */
  registerHref?: string;
  /** Show OAuth buttons (student only). */
  oauth?: boolean;
  /** Show the branded side panel (hidden on small screens regardless). Default true. */
  art?: boolean;
  /** Side-panel copy. */
  artTitle?: string;
  artPoints?: string[];
}

const ROLE_LABEL: Record<LoginFormProps["expectedRole"], string> = {
  student: "student",
  "college-admin": "college placement",
  "super-admin": "admin",
};

export function LoginForm({
  heading,
  subheading,
  expectedRole,
  redirectTo,
  registerHref,
  oauth,
  art = true,
  artTitle = "Your interview console, calibrated to you.",
  artPoints = [
    "Four AI-adaptive interview rounds",
    "Live proctoring & instant feedback",
    "A readiness score that tells you where you stand",
  ],
}: LoginFormProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const setUser = useAuthStore((s) => s.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const msg = params.get("message");
    if (msg) toast(msg, { icon: "ℹ️" });
    const err = params.get("error");
    if (err) toast.error("Sign-in failed. Please try again.");
  }, [params]);

  // If already signed in with the right role, skip the form.
  useEffect(() => {
    (async () => {
      const u = await useAuthStore.getState().fetchUser();
      if (u && u.role === expectedRole) router.replace(redirectTo);
    })();
  }, [expectedRole, redirectTo, router]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      await api.post("/auth/login", data);
      const user = await useAuthStore.getState().fetchUser(true);

      if (!user) {
        toast.error("Could not load your account. Try again.");
        return;
      }
      if (user.role !== expectedRole) {
        setUser(null);
        await api.post("/auth/logout", {}).catch(() => {});
        toast.error(
          `This is the ${ROLE_LABEL[expectedRole]} portal. Your account is a ${user.role} account.`,
        );
        return;
      }
      toast.success("Signed in");
      router.replace(redirectTo);
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  const [oauthBusy, setOauthBusy] = useState<string | null>(null);
  const oauthStart = (provider: string) => {
    setOauthBusy(provider);
    const base =
      process.env.NEXT_PUBLIC_Backend_URL || "https://ed-tech-backend-0awj.onrender.com/api";
    window.location.href = `${base}/auth/${provider}`;
  };

  const inputStyle = (name: string) => ({
    backgroundColor: "var(--th-input-bg)",
    borderColor: focused === name ? "var(--th-primary)" : "var(--th-input-border)",
    color: "var(--th-text-primary)",
    boxShadow: focused === name ? "0 0 0 3px color-mix(in srgb, var(--th-primary) 18%, transparent)" : "none",
  });

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{ backgroundColor: "var(--th-bg)", color: "var(--th-text-primary)", fontFamily: "var(--font-inter), sans-serif" }}
    >
      {/* soft radial wash */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0" style={{ background: "var(--th-hero-grad)" }} />
        <div
          className="absolute -left-24 -top-24 h-96 w-96 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--th-primary) 12%, transparent), transparent 70%)" }}
        />
      </div>

      {/* top bar */}
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <a href="/" className="flex items-center gap-2.5">
          <Logo size={26} />
          <span className="text-sm font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
            Synclyft AI
          </span>
        </a>
        <a
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ color: "var(--th-text-muted)" }}
        >
          <ArrowLeft size={13} /> Back to site
        </a>
      </div>

      {/* content */}
      <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-5 py-8">
        <div className={`grid w-full items-stretch gap-8 ${art ? "lg:grid-cols-2" : "max-w-[400px]"}`}>
          {/* form */}
          <div className={`flex w-full max-w-[400px] items-center justify-self-center ${art ? "lg:justify-self-end" : ""}`}>
            <div
              className="w-full rounded-2xl border p-6 shadow-xl backdrop-blur-sm sm:p-7"
              style={{
                borderColor: "var(--th-border)",
                backgroundColor: "color-mix(in srgb, var(--th-surface) 92%, transparent)",
              }}
            >
              <div className="mb-5 text-center">
                <h1 className="text-xl font-extrabold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
                  {heading}
                </h1>
                <p className="mt-1 text-sm" style={{ color: "var(--th-text-secondary)" }}>{subheading}</p>
              </div>

              {oauth && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {OAUTH_PROVIDERS.map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => oauthStart(id)}
                        disabled={!!oauthBusy}
                        className="group flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-semibold outline-none transition-all hover:-translate-y-0.5 hover:border-[color:var(--th-primary)] hover:bg-[color:var(--th-hover-bg)] active:scale-[0.97] focus-visible:border-[color:var(--th-primary)] disabled:opacity-50"
                        style={{ backgroundColor: "var(--th-surface)", borderColor: "var(--th-border)", color: "var(--th-text-primary)" }}
                        aria-label={`Continue with ${label}`}
                      >
                        {oauthBusy === id ? (
                          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                          </svg>
                        ) : (
                          <Icon className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110" />
                        )}
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="my-4 flex items-center gap-3">
                    <div className="h-px flex-1" style={{ backgroundColor: "var(--th-border)" }} />
                    <span className="text-[0.62rem] font-semibold uppercase tracking-widest" style={{ color: "var(--th-text-muted)" }}>
                      or email
                    </span>
                    <div className="h-px flex-1" style={{ backgroundColor: "var(--th-border)" }} />
                  </div>
                </>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[0.7rem] font-semibold uppercase tracking-widest" style={{ color: "var(--th-text-muted)" }}>
                    Email
                  </label>
                  <input
                    {...register("email")}
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    onFocus={() => setFocused("email")}
                    onBlur={() => setFocused(null)}
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all"
                    style={inputStyle("email")}
                  />
                  {errors.email && <p className="text-xs" style={{ color: "#FF5C5C" }}>{errors.email.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[0.7rem] font-semibold uppercase tracking-widest" style={{ color: "var(--th-text-muted)" }}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      {...register("password")}
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      onFocus={() => setFocused("password")}
                      onBlur={() => setFocused(null)}
                      className="w-full rounded-xl border px-4 py-2.5 pr-11 text-sm outline-none transition-all"
                      style={inputStyle("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 opacity-50 transition-opacity hover:opacity-95"
                      style={{ color: "var(--th-text-primary)" }}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs" style={{ color: "#FF5C5C" }}>{errors.password.message}</p>}
                  <div className="pt-1 text-right">
                    <a href="/forgot-password" className="text-[0.7rem] font-semibold hover:underline" style={{ color: "var(--th-primary)" }}>
                      Forgot password?
                    </a>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60"
                  style={{ backgroundColor: "var(--th-primary)", boxShadow: "0 4px 16px color-mix(in srgb, var(--th-primary) 25%, transparent)" }}
                >
                  {submitting ? "Signing in…" : "Sign in"}
                  {!submitting && <ArrowRight size={15} />}
                </button>
              </form>

              {registerHref && (
                <p className="mt-4 text-center text-xs" style={{ color: "var(--th-text-muted)" }}>
                  No account?{" "}
                  <a href={registerHref} className="font-semibold hover:underline" style={{ color: "var(--th-primary)" }}>
                    Create one
                  </a>
                </p>
              )}

              <div
                className="mt-4 flex items-center justify-center gap-1.5 text-[0.6rem] font-mono uppercase tracking-wider"
                style={{ color: "var(--th-text-muted)" }}
              >
                <ShieldCheck size={10} style={{ color: "#3DDC84" }} />
                TLS encrypted · httpOnly session
              </div>
            </div>
          </div>

          {/* branded panel */}
          {art && (
            <div
              className="relative hidden overflow-hidden rounded-3xl border lg:flex lg:flex-col lg:justify-center lg:p-12"
              style={{
                borderColor: "var(--th-border)",
                background:
                  "linear-gradient(155deg, color-mix(in srgb, var(--th-primary) 16%, var(--th-surface)) 0%, var(--th-surface) 60%)",
              }}
            >
              <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.04]" aria-hidden>
                <defs>
                  <pattern id="lf-dots" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="1.5" cy="1.5" r="1.5" fill="var(--th-primary)" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#lf-dots)" />
              </svg>

              <div className="relative z-10 max-w-sm">
                <span
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: "color-mix(in srgb, var(--th-primary) 14%, transparent)" }}
                >
                  <Logo size={26} />
                </span>
                <h2
                  className="mt-6 max-w-xs text-[1.7rem] font-extrabold leading-[1.15] tracking-tight"
                  style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}
                >
                  {artTitle}
                </h2>
                <ul className="mt-7 space-y-3.5">
                  {artPoints.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-sm" style={{ color: "var(--th-text-secondary)" }}>
                      <CheckCircle2 size={17} className="mt-0.5 shrink-0" style={{ color: "#3DDC84" }} />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex items-center gap-2 border-t pt-5 text-xs" style={{ borderColor: "var(--th-border)", color: "var(--th-text-faint)" }}>
                  <ShieldCheck size={13} style={{ color: "#3DDC84" }} />
                  Bank-grade encryption · SOC 2 aligned
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* footer */}
      <div
        className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 text-[0.6rem] font-mono uppercase tracking-widest"
        style={{ color: "var(--th-text-muted)" }}
      >
        <span>© {new Date().getFullYear()} Synclyft AI Technologies</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3DDC84]" />
          All systems operational
        </span>
      </div>
    </div>
  );
}
