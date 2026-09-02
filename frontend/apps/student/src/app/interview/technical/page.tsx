"use client";

import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { InterviewShell } from "@/components/interview/InterviewShell";
import { ProctoringOverlay } from "@/components/interview/ProctoringOverlay";
import { useInterviewSession, useRoundState } from "@/lib/interviewSession";
import { useAuthStore } from "@synclyft/lib/store/auth";
import { interviewService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { Badge } from "@synclyft/ui/components/Badge";
import toast from "react-hot-toast";
import { Loader2, AlertTriangle, Send, CheckCircle2, XCircle, Code2, Info } from "lucide-react";

const VoiceRound = dynamic(() => import("@/components/interview/VoiceRound").then((m) => m.VoiceRound), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-[#0B0D10] text-[#6B7280] text-sm gap-2">
      <Loader2 size={18} className="animate-spin" /> Loading workspace…
    </div>
  ),
});
const MonacoEditor = lazy(() => import("@monaco-editor/react"));

const STARTERS: Record<string, string> = {
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n",
  java: "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n    }\n}\n",
  python: "def solve():\n    pass\n\nsolve()\n",
  javascript: "function solve() {}\nsolve();\n",
};

interface Handshake { sessionToken: string; roundId: string; endsAt: number | null; durationSeconds: number }
interface TechQuestion { questionId: string; statement: string; difficulty?: string }
interface SubmitResult { passed: number; total: number; score?: number; sandboxAvailable?: boolean; feedback?: string }

function parseQuestion(res: Record<string, unknown>): TechQuestion | null {
  // Backend wraps the model response under `question`.
  const payload = (res.question ?? res) as Record<string, unknown>;
  const questions = payload.questions as Record<string, unknown>[] | undefined;
  const base = (payload.selectedQuestion ?? (Array.isArray(questions) ? questions[0] : undefined) ?? payload) as Record<string, unknown>;
  const q = (base?.selectedQuestion ?? base) as Record<string, unknown>;
  if (!q) return null;
  const id = String(q.questionId ?? q.id ?? "");
  const statement = String(q.problemStatement ?? q.statement ?? "");
  if (!id && !statement) return null;
  return { questionId: id, statement, difficulty: q.difficulty as string | undefined };
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
  const [question, setQuestion] = useState<TechQuestion | null>(null);
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState(STARTERS.cpp);
  const [codeState, setCodeState] = useState<"loading" | "solve" | "submitting" | "result">("loading");
  const [result, setResult] = useState<SubmitResult | null>(null);

  useEffect(() => {
    if (!session || started.current || roundState.loading) return;
    if (roundState.status === "completed") { session.goNext("technical"); return; }
    started.current = true;

    // A round with a served coding question means the persona phase is done.
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
      const q = parseQuestion((res ?? {}) as Record<string, unknown>);
      if (!q) throw new Error("No coding question was returned.");
      setQuestion(q);
      setCode(STARTERS[language] ?? STARTERS.cpp);
      setCodeState("solve");
    } catch (err) {
      setErrorMsg(toApiError(err).message);
      setPhase("error");
    }
  }, [session, language]);

  useEffect(() => {
    if (phase === "coding" && !question && codeState === "loading") loadCodingQuestion();
  }, [phase, question, codeState, loadCodingQuestion]);

  const submit = async () => {
    if (!session || !question) return;
    setCodeState("submitting");
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
      setTimeout(() => session.goNext("technical"), 2500);
    } catch (err) {
      toast.error(toApiError(err).message);
      setCodeState("solve");
    }
  };

  if (!session || phase === "init" || roundState.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0B0D10] text-[#6B7280] text-sm gap-2">
        <Loader2 size={18} className="animate-spin" /> Connecting to your technical interviewer…
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#0B0D10] text-center px-6 gap-3">
        <AlertTriangle size={28} className="text-[#FF5C5C]" />
        <p className="text-[#E8EAF0] text-sm">Couldn&apos;t run the technical round</p>
        <p className="text-[#6B7280] text-xs max-w-sm">{errorMsg}</p>
        <div className="flex gap-2 mt-2">
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
        <div className="h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-[#6B7280]">
            <Loader2 size={24} className="animate-spin text-[#0062FF]" />
            <p className="text-sm">Loading your coding challenge…</p>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col lg:flex-row">
          <div className="lg:w-2/5 border-b lg:border-b-0 lg:border-r border-[#2A2F38] overflow-y-auto p-4 sm:p-6 max-h-[38vh] lg:max-h-none">
            <div className="flex items-center gap-2 mb-3">
              <Code2 size={16} className="text-[#0062FF]" />
              <span className="label-caption text-[#4A5260]">Problem</span>
              {question?.difficulty && <Badge variant="neutral">{question.difficulty}</Badge>}
            </div>
            <div className="prose prose-invert prose-sm max-w-none text-[#C8CDD5] whitespace-pre-wrap text-sm leading-relaxed">
              {question?.statement}
            </div>
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-3 sm:px-4 h-11 border-b border-[#2A2F38] shrink-0">
              <select value={language} onChange={(e) => { setLanguage(e.target.value); setCode(STARTERS[e.target.value] ?? ""); }}
                className="bg-[#1B1F26] text-[#C8CDD5] text-xs rounded px-2 py-1 border border-[#2A2F38]">
                {Object.keys(STARTERS).map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <button onClick={submit} disabled={codeState === "submitting" || codeState === "result"}
                className="btn-primary flex items-center gap-2 !py-1.5 !text-xs">
                {codeState === "submitting" ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                {codeState === "submitting" ? "Running…" : "Submit"}
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <Suspense fallback={<div className="p-4 text-xs text-[#6B7280]">Loading editor…</div>}>
                <MonacoEditor height="100%" theme="vs-dark" language={language} value={code}
                  onChange={(v) => setCode(v ?? "")}
                  options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true }} />
              </Suspense>
            </div>
            {codeState === "result" && result && (
              <div className="border-t border-[#2A2F38] p-4 shrink-0 bg-[#12151A]">
                <div className="flex items-center gap-2">
                  {result.total > 0 && result.passed === result.total
                    ? <CheckCircle2 size={16} className="text-[#3DDC84]" />
                    : <XCircle size={16} className="text-[#F59E0B]" />}
                  <span className="text-sm text-[#E8EAF0]">
                    {result.total > 0 ? `${result.passed}/${result.total} test cases` : "Submitted"}
                    {result.score !== undefined ? ` · score ${Math.round(result.score)}/10` : ""}
                  </span>
                </div>
                {result.sandboxAvailable === false && (
                  <p className="text-[11px] text-[#F59E0B] mt-1 flex items-center gap-1.5"><Info size={11} /> Graded on code inspection — the sandbox was unavailable.</p>
                )}
                <p className="text-xs text-[#6B7280] mt-1">Wrapping up the technical round…</p>
              </div>
            )}
          </div>
        </div>
      )}
      {userId && (
        <ProctoringOverlay sessionId={session.sessionId} candidateId={userId} roundType="technical"
          onTerminate={(reason) => { toast.error(reason); session.goReport(); }} />
      )}
    </InterviewShell>
  );
}
