"use client";

import dynamic from "next/dynamic";

// Force absolute dynamic client injection - disables SSR completely for this Heavy Engineering component
// @ts-ignore
const InterviewWorkspace = dynamic(
  // @ts-ignore
  () => import("@/components/InterviewWorkspace"),
  { ssr: false }
);

export default function InterviewPage() {
  return (
    <>
      <title>Secure Exam Workspace | Proctored Environment</title>
      <meta name="description" content="AI-Enabled High-Security Proctored Coding Terminal" />
      <InterviewWorkspace />
    </>
  );
}
