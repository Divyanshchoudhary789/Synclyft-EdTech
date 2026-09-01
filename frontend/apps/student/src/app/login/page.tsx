"use client";

import { Suspense } from "react";
import { LoginForm } from "@synclyft/ui/auth/LoginForm";

export default function StudentLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm
        heading="Welcome back"
        subheading="Sign in to your Synclyft interview console"
        expectedRole="student"
        redirectTo="/dashboard"
        registerHref="/register"
        oauth
      />
    </Suspense>
  );
}
