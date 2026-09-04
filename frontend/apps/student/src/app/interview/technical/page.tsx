"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { InterviewShell } from "@/components/interview/InterviewShell";
import { ProctoringOverlay } from "@/components/interview/ProctoringOverlay";
import { CodingWorkspace, type CodingSubmitResult } from "@/components/interview/CodingWorkspace";
import { useInterviewSession, useRoundState } from "@/lib/interviewSession";
import { useAuthStore } from "@synclyft/lib/store/auth";
import { interviewService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import type { CodingQuestion, CodingRunResult } from "@synclyft/lib/api/types";
import toast from "react-hot-toast";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

const VoiceRound = dynamic(() => import("@/components/interview/VoiceRound").then((m) => m.VoiceRound), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center gap-2 bg-[var(--iv-bg)] text-sm text-[var(--iv-text-faint)]">
      <Loader2 size={18} className="animate-spin" /> Loading workspace…
    </div>
  ),
});

const STARTERS: Record<string, string> = {
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n",
  java: "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n    }\n}\n",
  python: "def solve():\n    pass\n\nsolve()\n",
  javascript: "function solve() {}\nsolve();\n",
  typescript: "function solve(): void {}\nsolve();\n",
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    _ = fmt.Println\n}\n',
};
const MONACO_LANG: Record<string, string> = {
  cpp: "cpp", java: "java", python: "python", javascript: "javascript", typescript: "typescript", go: "go",
};
const LANGUAGES = Object.keys(STARTERS);

interface Handshake { sessionToken: string; roundId: string; endsAt: number | null; durationSeconds: number }

function starterFor(q: CodingQuestion | null, lang: string): string {
  return q?.starterCode?.[lang] || STARTERS[lang] || STARTERS.cpp;
}

export default function TechnicalRoundPage() {
  const router = useRouter();
  const session = useInterviewSession();
  const roundState = useRoundState(session?.sessionId, "technical");
  const userId = useAuthStore((s) => s.user?._id ?? "");

  const [phase, setPhase] = useState<"init" | "persona" | "coding" | "error">("init");
  const [handshake, setHandshake] = useState<Handshake | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const started = useRef(false);

  // coding phase
  const [question, setQuestion] = useState<CodingQuestion | null>(null);
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState(STARTERS.cpp);
  const [codeState, setCodeState] = useState<"loading" | "solve" | "submitting" | "result">("loading");
  const [runResult, setRunResult] = useState<CodingRunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CodingSubmitResult | null>(null);

  useEffect(() => {
    if (!session || started.current || roundState.loading) return;
    if (roundState.status === "completed") {
      session.goNext("technical");
      return;
    }
    started.current = true;

    if (roundState.servedCount > 0 && roundState.answeredCount >= 3) {
      setPhase("coding");
      return;
    }

    (async () => {
      try {
        const res = (await interviewService.initTechnical(session.sessionId)) as Partial<Handshake> & { message?: string };
        if (!res.sessionToken || !res.roundId) throw new Error(res.message || "The interviewer service did not return a session.");
        setHandshake({
          sessionToken: res.sessionToken,
          roundId: res.roundId,
          endsAt: res.endsAt ? Number(res.endsAt) : null,
          durationSeconds: Number(res.durationSeconds) || 40 * 60,
        });
        setPhase("persona");
      } catch (err) {
        setErrorMsg(toApiError(err).message);
        setPhase("error");
      }
    })();
  }, [session, roundState.loading, roundState.status, roundState.servedCount, roundState.answeredCount]);

  const loadCodingQuestion = useCallback(async () => {
    if (!session) return;
    setCodeState("loading");
    try {
      const res = await interviewService.technicalQuestion(session.sessionId);
      const q = res?.question ?? null;
      if (!q || !q.questionId) throw new Error("No coding question was returned.");
      setQuestion(q);
      setCode(starterFor(q, language));
      setCodeState("solve");
    } catch (err) {
      setErrorMsg(toApiError(err).message);
      setPhase("error");
    }
  }, [session, language]);

  useEffect(() => {
    if (phase === "coding" && !question && codeState === "loading") loadCodingQuestion();
  }, [phase, question, codeState, loadCodingQuestion]);

  const changeLanguage = (l: string) => {
    setLanguage(l);
    setCode(starterFor(question, l));
  };

  const run = async () => {
    if (!session || !question || running || codeState === "submitting") return;
    setRunning(true);
    try {
      const res = await interviewService.runCoding(session.sessionId, {
        questionId: question.questionId, code, language,
      });
      setRunResult(res);
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setRunning(false);
    }
  };

  const submit = async () => {
    if (!session || !question || codeState === "submitting" || codeState === "result") return;
    setCodeState("submitting");
    setRunResult(null);
    try {
      const raw = (await interviewService.submitTechnical(session.sessionId, {
        questionId: question.questionId, code, language,
      })) as Record<string, unknown>;
      const meta = (raw.metadata ?? {}) as Record<string, unknown>;
      setResult({
        passed: Number(meta.testCasesPassed ?? 0),
        total: Number(meta.totalTestCases ?? 0),
        score: raw.scoreEarned !== undefined ? Number(raw.scoreEarned) : undefined,
        sandboxAvailable: raw.sandboxAvailable as boolean | undefined,
        feedback: raw.feedback as string | undefined,
      });
      setCodeState("result");
      setTimeout(() => session.goNext("technical"), 3000);
    } catch (err) {
      toast.error(toApiError(err).message);
      setCodeState("solve");
    }
  };

  if (!session || phase === "init" || roundState.loading) {
    return (
      <div className="flex h-screen items-center justify-center gap-2 bg-[var(--iv-bg)] text-sm text-[var(--iv-text-faint)]">
        <Loader2 size={18} className="animate-spin" /> Connecting to your technical interviewer…
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[var(--iv-bg)] px-6 text-center">
        <AlertTriangle size={28} className="text-[#FF5C5C]" />
        <p className="text-sm text-[var(--iv-text)]">Couldn&apos;t run the technical round</p>
        <p className="max-w-sm text-xs text-[var(--iv-text-faint)]">{errorMsg}</p>
        <div className="mt-2 flex gap-2">
          <button onClick={() => { started.current = false; setPhase("init"); }} className="btn-secondary">Retry</button>
          <button onClick={() => session.goNext("technical")} className="btn-primary">Skip round</button>
        </div>
      </div>
    );
  }

  if (phase === "persona" && handshake) {
    return (
      <VoiceRound
        sessionId={session.sessionId}
        roundId={handshake.roundId}
        simliSessionToken={handshake.sessionToken}
        roundType="technical"
        endsAt={handshake.endsAt}
        totalSeconds={handshake.durationSeconds}
        onComplete={() => { setPhase("coding"); setCodeState("loading"); }}
        onExit={() => router.push("/dashboard")}
      />
    );
  }

  // ── Coding phase ──
  return (
    <InterviewShell
      round="technical"
      roundLabel="Technical — Coding"
      questionCounter={codeState === "solve" || codeState === "result" ? "Hard problem" : undefined}
      pulseMode="steady"
      endsAt={handshake?.endsAt ?? null}
      totalSeconds={30 * 60}
      onExit={() => router.push("/dashboard")}
      onTimeUp={() => { toast("Time's up — moving on"); session.goNext("technical"); }}
    >
      {codeState === "loading" ? (
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-[var(--iv-text-faint)]">
            <Loader2 size={24} className="animate-spin text-[#0062FF]" />
            <p className="text-sm">Loading your coding challenge…</p>
          </div>
        </div>
      ) : question ? (
        <CodingWorkspace
          question={question}
          languages={LANGUAGES}
          starters={STARTERS}
          monacoLang={MONACO_LANG}
          language={language}
          code={code}
          onLanguageChange={changeLanguage}
          onCodeChange={setCode}
          onResetCode={() => setCode(starterFor(question, language))}
          onRun={run}
          onSubmit={submit}
          running={running}
          submitting={codeState === "submitting"}
          locked={codeState === "result"}
          runResult={runResult}
          submitResult={result}
          storagePrefix="interview:technical"
          afterSubmitSlot={
            codeState === "result" ? (
              <span className="flex items-center gap-1.5 text-xs text-[var(--iv-text-muted)]">
                <CheckCircle2 size={13} className="text-[#3DDC84]" /> Wrapping up…
              </span>
            ) : null
          }
        />
      ) : null}

      {userId && (
        <ProctoringOverlay
          sessionId={session.sessionId}
          candidateId={userId}
          roundType="technical"
          onTerminate={(reason) => { toast.error(reason); session.goReport(); }}
        />
      )}
    </InterviewShell>
  );
}
