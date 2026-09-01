"use client";

import { AppProviders } from "@synclyft/ui/providers/AppProviders";

const PUBLIC_PREFIXES = [
  "/",
  "/login",
  "/register",
  "/verify-otp",
  "/forgot-password",
  "/reset-password",
  "/about",
  "/pricing",
];

export function Providers({ children }: { children: React.ReactNode }) {
  return <AppProviders publicPrefixes={PUBLIC_PREFIXES}>{children}</AppProviders>;
}
