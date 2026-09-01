"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { api, toApiError } from "@synclyft/lib/api";
import { useAuthStore } from "@synclyft/lib/store/auth";
import { Logo } from "../components/Logo";

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
}: LoginFormProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const msg = params.get("message");
    if (msg) toast(msg, { icon: "ℹ️" });
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
          `This is the ${ROLE_LABEL[expectedRole]} portal. Your account is a ${user.role} account.`
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

  const oauthStart = (provider: string) => {
    const base =
      process.env.NEXT_PUBLIC_Backend_URL || "https://ed-tech-backend-0awj.onrender.com/api";
    window.location.href = `${base}/auth/${provider}`;
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{ backgroundColor: "var(--th-bg)", color: "var(--th-text-primary)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[400px] rounded-2xl border p-6 shadow-xl"
        style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-bg-secondary)" }}
      >
        <div className="mb-5 flex flex-col items-center text-center">
          <Logo size={30} />
          <h1
            className="mt-3 text-xl font-semibold"
            style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}
          >
            {heading}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--th-text-secondary)" }}>
            {subheading}
          </p>
        </div>

        {oauth && (
          <>
            <div className="space-y-2">
              {[
                { id: "google", label: "Continue with Google" },
                { id: "github", label: "Continue with GitHub" },
                { id: "linkedin", label: "Continue with LinkedIn" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => oauthStart(p.id)}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: "var(--th-surface)",
                    borderColor: "var(--th-border)",
                    color: "var(--th-text-primary)",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1" style={{ backgroundColor: "var(--th-border)" }} />
              <span
                className="text-[0.62rem] font-semibold uppercase tracking-widest"
                style={{ color: "var(--th-text-muted)" }}
              >
                or email
              </span>
              <div className="h-px flex-1" style={{ backgroundColor: "var(--th-border)" }} />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <label
              className="text-[0.7rem] font-semibold uppercase tracking-widest"
              style={{ color: "var(--th-text-muted)" }}
            >
              Email
            </label>
            <input
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
              style={{
                backgroundColor: "var(--th-surface)",
                borderColor: "var(--th-input-border)",
                color: "var(--th-text-primary)",
              }}
            />
            {errors.email && (
              <p className="text-xs" style={{ color: "#FF5C5C" }}>
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label
              className="text-[0.7rem] font-semibold uppercase tracking-widest"
              style={{ color: "var(--th-text-muted)" }}
            >
              Password
            </label>
            <div className="relative">
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border px-4 py-2.5 pr-11 text-sm outline-none"
                style={{
                  backgroundColor: "var(--th-surface)",
                  borderColor: "var(--th-input-border)",
                  color: "var(--th-text-primary)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-95"
                style={{ color: "var(--th-text-primary)" }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs" style={{ color: "#FF5C5C" }}>
                {errors.password.message}
              </p>
            )}
            <div className="pt-1 text-right">
              <a
                href="/forgot-password"
                className="text-[0.7rem] font-semibold hover:underline"
                style={{ color: "var(--th-primary)" }}
              >
                Forgot password?
              </a>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: "var(--th-primary)" }}
          >
            {submitting ? "Signing in…" : "Sign in"}
            {!submitting && <ArrowRight size={15} />}
          </button>
        </form>

        {registerHref && (
          <p className="mt-4 text-center text-xs" style={{ color: "var(--th-text-muted)" }}>
            No account?{" "}
            <a
              href={registerHref}
              className="font-semibold hover:underline"
              style={{ color: "var(--th-primary)" }}
            >
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
      </motion.div>
    </div>
  );
}
