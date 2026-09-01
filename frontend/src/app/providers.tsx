"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/lib/theme";
import { useAuthStore } from "@/lib/store/auth";

// Routes that never require an authenticated session.
const PUBLIC_PREFIXES = [
  "/",
  "/login",
  "/register",
  "/verify-otp",
  "/forgot-password",
  "/reset-password",
  "/about",
  "/features",
  "/privacy",
  "/payment",
];

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
function AuthExpiryGate() {
  const router = useRouter();
  const pathname = usePathname();
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      const isPublic = PUBLIC_PREFIXES.some(
        (p) => pathname === p || (p !== "/" && pathname.startsWith(p))
      );
      if (!isPublic) {
        router.replace(`/login?message=${encodeURIComponent("Your session expired. Please sign in again.")}`);
      }
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, [router, pathname, setUser]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthExpiryGate />
        {children}
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
