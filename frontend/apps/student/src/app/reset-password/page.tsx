"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ResetPasswordForm } from "@synclyft/ui/auth/PasswordResetForms";

function ResetInner() {
  const token = useSearchParams().get("token");
  return <ResetPasswordForm token={token} loginHref="/login" />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  );
}
