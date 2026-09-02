"use client";

import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { InterviewShell } from "@/components/interview/InterviewShell";
import { ProctoringOverlay } from "@/components/interview/ProctoringOverlay";
import { useInterviewSession, useRoundState } from "@/lib/interviewSession";
import { useAuthStore } from "@synclyft/lib/store/auth";
import { interviewService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { Badge } from "@synclyft/ui/components/Badge";
import { cn } from "@synclyft/lib/utils";
import toast from "react-hot-toast";
import { Send, Loader2, AlertTriangle, CheckCircle2, XCircle, ChevronRight, Code2, Info } from "lucide-react";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));

const STARTERS: Record<string, string> = {
  python: "def solve():\n    # read input, print output\n    pass\n\nsolve()\n",
  javascript: "function solve() {\n  // read from stdin, write to stdout\n}\nsolve();\n",
  typescript: "function solve(): void {\n  // read from stdin, write to stdout\n}\nsolve();\n",
  java: "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // your solution\n    }\n}\n",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // your solution\n    return 0;\n}\n",
  c: "#include <stdio.h>\n\nint main() {\n    // your solution\n    return 0;\n}\n",
  go: "package main\n\nimport \"fmt\"\n\nfunc main() {\n    _ = fmt.Println\n}\n",
};
const MONACO_LANG: Record<string, string> = { python: "python", javascript: "javascript", typescript: "typescript", java: "java", cpp: "cpp", c: "c", go: "go" };
const TOTAL_PROBLEMS = 10;

type Phase = "resolving" | "loading" | "solve" | "submitting" | "result" | "error" | "done";

interface CodingQuestion { questionId: string; statement: string; difficulty?: string }
interface SubmitResult { passed: number; total: number; score?: number; verdict?: string; message?: string; sandboxAvailable?: boolean; feedback?: string }

function parseQuestion(payload: Record<string, unknown>): CodingQuestion | null {
  const questions = (payload.questions ?? payload.data ?? []) as unknown[];
  const first = (Array.isArray(questions) ? questions[0] : payload) as Record<string, unknown>;
  const sel = (first?.selectedQuestion ?? first) as Record<string, unknown>;
  if (!sel) return null;
  const id = String(sel.questionId ?? sel.id ?? "");
  const statement = String(sel.problemStatement ?? sel.statement ?? sel.question ?? "");
  if (!id && !statement) return null;
  return { questionId: id, statement, difficulty: sel.difficulty as string | undefined };
}

function parseSubmit(raw: Record<string, unknown>): SubmitResult {
  const meta = ((raw.metadata ?? raw.data ?? raw) as Record<string, unknown>) ?? {};
  return {
    passed: Number(meta.testCasesPassed ?? meta.passed ?? 0),
    total: Number(meta.totalTestCases ?? meta.total ?? 0),
    score: raw.scoreEarned !== undefined ? Number(raw.scoreEarned) : undefined,
    verdict: (meta.statusDescription ?? raw.verdict) as string | undefined,
    message: (raw.message ?? meta.message) as string | undefined,
    sandboxAvailable: raw.sandboxAvailable as boolean | undefined,
    feedback: raw.feedback as string | undefined,
  };
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
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const resolvedRef = useRef(false);
  const draftKey = session ? `interview:coding:${session.sessionId}:p${page}` : "";

  useEffect(() => {
    if (session) {
      const l = session.codingLanguage || "python";
      setLanguage(l);
      setCode(STARTERS[l] ?? STARTERS.python);
    }
  }, [session]);

  const loadQuestion = useCallback(async (p: number) => {
    if (!session) return;
    setPhase("loading");
    setResult(null);
    try {
      const res = await interviewService.codingQuestions(session.sessionId, p);
      if (res.endsAt) setEndsAt(Number(res.endsAt));
      const q = res.question ? parseQuestion(res.question) : null;
      if (!q) { setPhase("done"); return; }
      setQuestion(q);
      setPage(p);
      // restore any saved draft for this problem
      let draft = "";
      try { draft = sessionStorage.getItem(`interview:coding:${session.sessionId}:p${p}`) ?? ""; } catch { /* */ }
      setCode(draft || STARTERS[language] ?? STARTERS.python);
      setPhase("solve");
    } catch (err) {
      setErrorMsg(toApiError(err).message);
      setPhase("error");
    }
  }, [session, language]);

  // ── Resume-or-start ──
  useEffect(() => {
    if (!session || roundState.loading || resolvedRef.current) return;
    resolvedRef.current = true;
    if (roundState.status === "completed" || roundState.forceEnded) { setPhase("done"); return; }
    setEndsAt(roundState.endsAt);
    // servedCount tells us which problem we're on; answeredCount how many done.
    const resumePage = Math.min(TOTAL_PROBLEMS, Math.max(1, roundState.servedCount || 1));
    loadQuestion(resumePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, roundState.loading]);

  const persistDraft = (v: string) => {
    setCode(v);
    try { if (draftKey) sessionStorage.setItem(draftKey, v); } catch { /* */ }
  };

  const submit = async () => {
    if (!session || !question) return;
    setPhase("submitting");
    try {
      const raw = await interviewService.submitCoding(session.sessionId, { questionId: question.questionId, code, language });
      setResult(parseSubmit(raw as Record<string, unknown>));
      setPhase("result");
      try { if (draftKey) sessionStorage.removeItem(draftKey); } catch { /* */ }
    } catch (err) {
      const e = toApiError(err);
      if ((e as { code?: string }).code === "ROUND_TIME_UP") { setPhase("done"); }
      else { toast.error(e.message); setPhase("solve"); }
    }
  };

  const next = () => {
    if (page >= TOTAL_PROBLEMS) setPhase("done");
    else loadQuestion(page + 1);
  };

  useEffect(() => {
    if (phase === "done" && session) {
      const t = setTimeout(() => session.goNext("coding"), 1200);
      return () => clearTimeout(t);
    }
  }, [phase, session]);

  if (!session || phase === "resolving") {
    return <div className="flex h-screen items-center justify-center bg-[#0B0D10] text-[#6B7280] text-sm gap-2">
      <Loader2 size={16} className="animate-spin" /> Preparing your coding round…
    </div>;
  }

  return (
    <InterviewShell
      round="coding"
      roundLabel="Coding"
      questionCounter={phase === "solve" || phase === "result" ? `Problem ${page}/${TOTAL_PROBLEMS}` : undefined}
      pulseMode="steady"
      totalSeconds={endsAt ? undefined : 60 * 60}
      endsAt={endsAt}
      onExit={() => router.push("/dashboard")}
      onTimeUp={() => { if (phase !== "done") { toast("Time's up — moving on"); setPhase("done"); } }}
    >
      {(phase === "loading" || phase === "error" || phase === "done") ? (
        <div className="h-full flex items-center justify-center px-6">
          {phase === "loading" && (
            <div className="flex flex-col items-center gap-3 text-[#6B7280]">
              <Loader2 size={24} className="animate-spin text-[#0062FF]" />
              <p className="text-sm">Fetching your coding problem…</p>
            </div>
          )}
          {phase === "error" && (
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertTriangle size={26} className="text-[#FF5C5C]" />
              <p className="text-[#E8EAF0] text-sm">Couldn&apos;t load the coding round</p>
              <p className="text-[#6B7280] text-xs max-w-sm">{errorMsg}</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => loadQuestion(page)} className="btn-secondary">Retry</button>
                <button onClick={() => session.goNext("coding")} className="btn-primary">Skip round</button>
              </div>
            </div>
          )}
          {phase === "done" && (
            <div className="flex flex-col items-center gap-3 text-[#6B7280]">
              <CheckCircle2 size={26} className="text-[#3DDC84]" />
              <p className="text-[#E8EAF0] text-sm">Coding round complete</p>
              <p className="text-xs">Moving to the next round…</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-full flex-col lg:flex-row">
          <div className="lg:w-2/5 border-b lg:border-b-0 lg:border-r border-[#2A2F38] overflow-y-auto p-4 sm:p-6 max-h-[40vh] lg:max-h-none">
            <div className="flex items-center gap-2 mb-4">
              <Code2 size={16} className="text-[#0062FF]" />
              <span className="label-caption text-[#4A5260]">Problem {page}</span>
              {question?.difficulty && <Badge variant="neutral">{question.difficulty}</Badge>}
            </div>
            <div className="prose prose-invert prose-sm max-w-none text-[#C8CDD5] whitespace-pre-wrap text-sm leading-relaxed">
              {question?.statement}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-3 sm:px-4 h-11 border-b border-[#2A2F38] shrink-0">
              <select value={language}
                onChange={(e) => { setLanguage(e.target.value); persistDraft(STARTERS[e.target.value] ?? ""); }}
                className="bg-[#1B1F26] text-[#C8CDD5] text-xs rounded px-2 py-1 border border-[#2A2F38]">
                {Object.keys(STARTERS).map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <button onClick={submit} disabled={phase === "submitting"}
                className="btn-primary flex items-center gap-2 !py-1.5 !text-xs" data-testid="submit-code">
                {phase === "submitting" ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                {phase === "submitting" ? "Running…" : "Submit"}
              </button>
            </div>

            <div className="flex-1 min-h-0">
              <Suspense fallback={<div className="p-4 text-xs text-[#6B7280]">Loading editor…</div>}>
                <MonacoEditor
                  height="100%"
                  theme="vs-dark"
                  language={MONACO_LANG[language] ?? "plaintext"}
                  value={code}
                  onChange={(v) => persistDraft(v ?? "")}
                  options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true }}
                />
              </Suspense>
            </div>

            {phase === "result" && result && (
              <div className="border-t border-[#2A2F38] p-4 shrink-0 bg-[#12151A]">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  {result.total > 0 && result.passed === result.total ? (
                    <CheckCircle2 size={16} className="text-[#3DDC84]" />
                  ) : (
                    <XCircle size={16} className="text-[#F59E0B]" />
                  )}
                  <span className="text-sm text-[#E8EAF0]">
                    {result.total > 0 ? `${result.passed}/${result.total} test cases passed` : "Submitted"}
                    {result.score !== undefined ? ` · score ${Math.round(result.score)}/10` : ""}
                  </span>
                  <button onClick={next} className="btn-primary ml-auto flex items-center gap-1 !py-1.5 !text-xs">
                    {page >= TOTAL_PROBLEMS ? "Finish round" : "Next problem"} <ChevronRight size={13} />
                  </button>
                </div>
                {result.sandboxAvailable === false && (
                  <p className="text-[11px] text-[#F59E0B] flex items-center gap-1.5"><Info size={11} /> The code sandbox was unavailable — this submission was graded on code inspection.</p>
                )}
                {result.feedback && <p className="text-xs text-[#6B7280] mt-1">{result.feedback}</p>}
              </div>
            )}
          </div>
        </div>
      )}
      {userId && (
        <ProctoringOverlay
          sessionId={session.sessionId}
          candidateId={userId}
          roundType="coding"
          onTerminate={(reason) => { toast.error(reason); session.goReport(); }}
        />
      )}
    </InterviewShell>
  );
}
