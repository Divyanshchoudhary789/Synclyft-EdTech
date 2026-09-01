"use client";

import { AppProviders } from "@synclyft/ui/providers/AppProviders";

// Admin console is entirely gated; only the login route is public.
const PUBLIC_PREFIXES = ["/login"];

export function Providers({ children }: { children: React.ReactNode }) {
  return <AppProviders publicPrefixes={PUBLIC_PREFIXES}>{children}</AppProviders>;
}
