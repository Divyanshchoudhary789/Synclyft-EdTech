"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@synclyft/lib/store/auth";
import { AppShell } from "@/components/layout/AppShell";

/**
 * Shared shell + auth guard for every signed-in student route.
 * Route groups don't affect the URL — `(app)/dashboard` still serves `/dashboard`.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, fetchUser } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await fetchUser();
      if (!u) {
        router.replace("/login");
        return;
      }
      if (u.role && u.role !== "student") {
        router.replace(
          "/login?message=" +
            encodeURIComponent("This portal is for students. Use your college or admin portal."),
        );
        return;
      }
      setChecked(true);
    })();
  }, [fetchUser, router]);

  if (!checked || !user) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "var(--th-bg)", color: "var(--th-text-faint)" }}
      >
        <div className="animate-pulse font-mono text-sm">Loading…</div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
