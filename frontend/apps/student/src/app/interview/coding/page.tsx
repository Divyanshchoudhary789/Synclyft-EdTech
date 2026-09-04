"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { InterviewShell } from "@/components/interview/InterviewShell";
import { ProctoringOverlay } from "@/components/interview/ProctoringOverlay";
import { CodingWorkspace, type CodingSubmitResult } from "@/components/interview/CodingWorkspace";
import { useInterviewSession, useRoundState } from "@/lib/interviewSession";
import { useAuthStore } from "@synclyft/lib/store/auth";
import { interviewService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import type { CodingQuestion, CodingRunResult } from "@synclyft/lib/api/types";
import toast from "react-hot-toast";
import { Loader2, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";

const STARTERS: Record<string, string> = {
  python: "def solve():\n    # read input, print output\n    pass\n\nsolve()\n",
  javascript: "function solve() {\n  // read from stdin, write to stdout\n}\nsolve();\n",
  typescript: "function solve(): void {\n  // read from stdin, write to stdout\n}\nsolve();\n",
  java: "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // your solution\n    }\n}\n",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // your solution\n    return 0;\n}\n",
  c: "#include <stdio.h>\n\nint main() {\n    // your solution\n    return 0;\n}\n",
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    _ = fmt.Println\n}\n',
};
const MONACO_LANG: Record<string, string> = {
  python: "python", javascript: "javascript", typescript: "typescript",
  java: "java", cpp: "cpp", c: "c", go: "go",
};
const LANGUAGES = Object.keys(STARTERS);
const TOTAL_PROBLEMS = 10;

type Phase = "resolving" | "loading" | "solve" | "error" | "done";

function starterFor(q: CodingQuestion | null, lang: string): string {
  return q?.starterCode?.[lang] || STARTERS[lang] || STARTERS.python;
}

export default function CodingRoundPage() {
  const router = useRouter();
  const session = useInterviewSession();
  const userId = useAuthStore((s) => s.user?._id ?? "");
  const roundState = useRoundState(session?.sessionId, "coding");

  const [phase, setPhase] = useState<Phase>("resolving");
  const [page, setPage] = useState(1);
  const [question, setQuestion] = useState<CodingQuestion | null>(null);
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState<string>(STARTERS.python);
  const [runResult, setRunResult] = useState<CodingRunResult | null>(null);
  const [submitResult, setSubmitResult] = useState<CodingSubmitResult | null>(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const resolvedRef = useRef(false);

  const draftKey = session ? `interview:coding:${session.sessionId}:p${page}` : "";

  useEffect(() => {
    if (session) setLanguage(session.codingLanguage || "python");
  }, [session]);

  const loadQuestion = useCallback(
    async (p: number) => {
      if (!session) return;
      setPhase("loading");
      setRunResult(null);
      setSubmitResult(null);
      try {
        const res = await interviewService.codingQuestions(session.sessionId, p);
        if (res.endsAt) setEndsAt(Number(res.endsAt));
        if (res.exhausted || !res.question) {
          setPhase("done");
          return;
        }
        const q = res.question;
        setQuestion(q);
        setPage(p);

        const lang = session.codingLanguage || language || "python";
        let draft = "";
        try {
          draft = sessionStorage.getItem(`interview:coding:${session.sessionId}:p${p}`) ?? "";
        } catch {
          /* ignore */
        }
        setCode(draft || starterFor(q, lang));
        setPhase("solve");
      } catch (err) {
        setErrorMsg(toApiError(err).message);
        setPhase("error");
      }
    },
    [session, language]
  );

  // ── Resume-or-start ──
  useEffect(() => {
    if (!session || roundState.loading || resolvedRef.current) return;
    resolvedRef.current = true;
    if (roundState.status === "completed" || roundState.forceEnded) {
      setPhase("done");
      return;
    }
    setEndsAt(roundState.endsAt);
    const resumePage = Math.min(TOTAL_PROBLEMS, Math.max(1, roundState.servedCount || 1));
    loadQuestion(resumePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, roundState.loading]);

  const persistDraft = useCallback(
    (v: string) => {
      setCode(v);
      try {
        if (draftKey) sessionStorage.setItem(draftKey, v);
      } catch {
        /* ignore */
      }
    },
    [draftKey]
  );

  const changeLanguage = (l: string) => {
    setLanguage(l);
    persistDraft(starterFor(question, l));
  };

  const resetCode = () => persistDraft(starterFor(question, language));

  const run = async () => {
    if (!session || !question || running || submitting) return;
    setRunning(true);
    setSubmitResult(null);
    try {
      const res = await interviewService.runCoding(session.sessionId, {
        questionId: question.questionId,
        code,
        language,
      });
      setRunResult(res);
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setRunning(false);
    }
  };

  const submit = async () => {
    if (!session || !question || running || submitting) return;
    setSubmitting(true);
    setRunResult(null);
    try {
      const raw = (await interviewService.submitCoding(session.sessionId, {
        questionId: question.questionId,
        code,
        language,
      })) as Record<string, unknown>;
      const meta = ((raw.metadata ?? raw.data ?? raw) as Record<string, unknown>) ?? {};
      setSubmitResult({
        passed: Number(meta.testCasesPassed ?? meta.passed ?? 0),
        total: Number(meta.totalTestCases ?? meta.total ?? 0),
        score: raw.scoreEarned !== undefined ? Number(raw.scoreEarned) : undefined,
        sandboxAvailable: raw.sandboxAvailable as boolean | undefined,
        feedback: raw.feedback as string | undefined,
      });
      try {
        if (draftKey) sessionStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
    } catch (err) {
      const e = toApiError(err);
      if (e.code === "ROUND_TIME_UP") setPhase("done");
      else toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (page >= TOTAL_PROBLEMS) setPhase("done");
    else loadQuestion(page + 1);
  };

  useEffect(() => {
    if (phase === "done" && session) {
      const t = setTimeout(() => session.goNext("coding"), 1400);
      return () => clearTimeout(t);
    }
  }, [phase, session]);

  if (!session || phase === "resolving") {
    return (
      <div className="flex h-screen items-center justify-center gap-2 bg-[var(--iv-bg)] text-sm text-[var(--iv-text-faint)]">
        <Loader2 size={16} className="animate-spin" /> Preparing your coding round…
      </div>
    );
  }

  return (
    <InterviewShell
      round="coding"
      roundLabel="Coding"
      questionCounter={phase === "solve" ? `Problem ${page} / ${TOTAL_PROBLEMS}` : undefined}
      pulseMode="steady"
      totalSeconds={endsAt ? undefined : 60 * 60}
      endsAt={endsAt}
      onExit={() => router.push("/dashboard")}
      onTimeUp={() => {
        if (phase !== "done") {
          toast("Time's up — moving on");
          setPhase("done");
        }
      }}
    >
      {phase === "loading" || phase === "error" || phase === "done" ? (
        <div className="flex h-full items-center justify-center px-6">
          {phase === "loading" && (
            <div className="flex flex-col items-center gap-3 text-[var(--iv-text-faint)]">
              <Loader2 size={24} className="animate-spin text-[#0062FF]" />
              <p className="text-sm">Fetching your coding problem…</p>
            </div>
          )}
          {phase === "error" && (
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertTriangle size={26} className="text-[#FF5C5C]" />
              <p className="text-sm text-[var(--iv-text)]">Couldn&apos;t load the coding round</p>
              <p className="max-w-sm text-xs text-[var(--iv-text-faint)]">{errorMsg}</p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => loadQuestion(page)} className="btn-secondary">Retry</button>
                <button onClick={() => session.goNext("coding")} className="btn-primary">Skip round</button>
              </div>
            </div>
          )}
          {phase === "done" && (
            <div className="flex flex-col items-center gap-3 text-[var(--iv-text-faint)]">
              <CheckCircle2 size={26} className="text-[#3DDC84]" />
              <p className="text-sm text-[var(--iv-text)]">Coding round complete</p>
              <p className="text-xs">Moving to the next round…</p>
            </div>
          )}
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
          onCodeChange={persistDraft}
          onResetCode={resetCode}
          onRun={run}
          onSubmit={submit}
          running={running}
          submitting={submitting}
          runResult={runResult}
          submitResult={submitResult}
          progressLabel={`${page} / ${TOTAL_PROBLEMS}`}
          storagePrefix="interview:coding"
          afterSubmitSlot={
            submitResult ? (
              <button
                onClick={next}
                className="flex items-center gap-1 rounded-md bg-[#0062FF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0053d6]"
              >
                {page >= TOTAL_PROBLEMS ? "Finish round" : "Next problem"} <ChevronRight size={13} />
              </button>
            ) : null
          }
        />
      ) : null}

      {userId && (
        <ProctoringOverlay
          sessionId={session.sessionId}
          candidateId={userId}
          roundType="coding"
          onTerminate={(reason) => {
            toast.error(reason);
            session.goReport();
          }}
        />
      )}
    </InterviewShell>
  );
}
