"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { useAuthStore } from "@synclyft/lib/store/auth";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
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
      if (u.role !== "super-admin") {
        router.replace("/login?message=" + encodeURIComponent("This account can't access the admin console."));
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
        <div className="animate-pulse font-mono text-sm">Verifying access…</div>
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
