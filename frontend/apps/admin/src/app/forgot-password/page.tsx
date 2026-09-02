"use client";

import { Suspense } from "react";
import { ForgotPasswordForm } from "@synclyft/ui/auth/PasswordResetForms";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm loginHref="/login" />
    </Suspense>
  );
}
