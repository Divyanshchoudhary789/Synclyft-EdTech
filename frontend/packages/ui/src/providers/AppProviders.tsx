"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@synclyft/lib/theme";
import { useAuthStore } from "@synclyft/lib/store/auth";
import { ErrorBoundary } from "../ErrorBoundary";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

/** Redirects to /login when the API layer reports the session is unrecoverable. */
function AuthExpiryGate({ publicPrefixes }: { publicPrefixes: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      const isPublic = publicPrefixes.some(
        (p) => pathname === p || (p !== "/" && pathname.startsWith(p))
      );
      if (!isPublic) {
        router.replace(
          `/login?message=${encodeURIComponent("Your session expired. Please sign in again.")}`
        );
      }
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, [router, pathname, setUser, publicPrefixes]);

  return null;
}

export function AppProviders({
  children,
  publicPrefixes = ["/", "/login", "/register", "/verify-otp", "/forgot-password", "/reset-password"],
}: {
  children: React.ReactNode;
  publicPrefixes?: string[];
}) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthExpiryGate publicPrefixes={publicPrefixes} />
        <ErrorBoundary>{children}</ErrorBoundary>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "var(--color-ink-900, #12151A)",
              color: "#E8EAF0",
              border: "1px solid rgba(255,255,255,0.08)",
              fontSize: "14px",
            },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
