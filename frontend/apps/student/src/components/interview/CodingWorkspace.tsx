"use client";

import { Suspense, lazy, useEffect, useState } from "react";
import type { CodingQuestion, CodingRunResult } from "@synclyft/lib/api/types";
import { cn } from "@synclyft/lib/utils";
import { SplitPane } from "./SplitPane";
import { ProblemStatement } from "./ProblemStatement";
import { useMediaQuery } from "@/components/hooks/useMediaQuery";
import { useInterviewTheme } from "./useInterviewTheme";
import {
  Play,
  Send,
  Loader2,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Info,
  FileText,
  TerminalSquare,
  Code2,
  ListChecks,
} from "lucide-react";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));

export interface CodingSubmitResult {
  passed: number;
  total: number;
  score?: number;
  sandboxAvailable?: boolean;
  feedback?: string;
}

interface Props {
  question: CodingQuestion;
  languages: string[];
  starters: Record<string, string>;
  monacoLang: Record<string, string>;
  language: string;
  code: string;
  onLanguageChange: (l: string) => void;
  onCodeChange: (v: string) => void;
  onResetCode: () => void;
  onRun: () => void;
  onSubmit: () => void;
  running: boolean;
  submitting: boolean;
  locked?: boolean;
  runResult: CodingRunResult | null;
  submitResult: CodingSubmitResult | null;
  /** e.g. "Problem 2 / 10" */
  progressLabel?: string;
  /** shown in the console header after a submit, e.g. a "Next problem" button */
  afterSubmitSlot?: React.ReactNode;
  storagePrefix?: string;
}

const DIFF_STYLE: Record<string, string> = {
  easy: "text-[#3DDC84] bg-[#3DDC84]/10 border-[#3DDC84]/20",
  medium: "text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20",
  hard: "text-[#FF5C5C] bg-[#FF5C5C]/10 border-[#FF5C5C]/20",
};

function DifficultyPill({ value }: { value: string }) {
  const k = value.toLowerCase();
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", DIFF_STYLE[k] ?? DIFF_STYLE.medium)}>
      {value}
    </span>
  );
}

/* ── Left: problem ───────────────────────────────────────────────────────── */
function ProblemPanel({ question }: { question: CodingQuestion }) {
  return (
    <div className="h-full overflow-y-auto bg-[var(--iv-panel)] px-4 py-4 sm:px-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h1 className="text-[15px] font-semibold text-[var(--iv-text)]">{question.title}</h1>
        <DifficultyPill value={question.difficulty} />
      </div>

      {question.topicTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {question.topicTags.map((t) => (
            <span key={t} className="rounded-md bg-[var(--iv-elevated)] px-2 py-0.5 text-[11px] text-[var(--iv-text-muted)] border border-[var(--iv-border)]">
              {t}
            </span>
          ))}
        </div>
      )}

      <ProblemStatement text={question.problemStatement} />

      {question.examples.length > 0 && (
        <div className="mt-5 space-y-3">
          {question.examples.map((ex, i) => (
            <div key={ex.id} className="rounded-lg border border-[var(--iv-border)] bg-[var(--iv-card)] p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--iv-text-faintest)]">Example {i + 1}</p>
              <dl className="space-y-1.5 font-mono text-[12px] leading-relaxed">
                <div className="flex gap-2">
                  <dt className="shrink-0 text-[var(--iv-text-faint)]">Input:</dt>
                  <dd className="whitespace-pre-wrap break-all text-[var(--iv-text-secondary)]">{ex.input}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 text-[var(--iv-text-faint)]">Output:</dt>
                  <dd className="whitespace-pre-wrap break-all text-[var(--iv-text-secondary)]">{ex.output}</dd>
                </div>
                {ex.explanation && (
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-[var(--iv-text-faint)]">Explanation:</dt>
                    <dd className="whitespace-pre-wrap text-[var(--iv-text-muted)]">{ex.explanation}</dd>
                  </div>
                )}
              </dl>
            </div>
          ))}
        </div>
      )}

      {question.constraints.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--iv-text-faintest)]">Constraints</p>
          <ul className="list-disc space-y-1 pl-5 font-mono text-[12px] leading-relaxed text-[var(--iv-text-secondary)]">
            {question.constraints.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {(question.timeLimitMs || question.memoryLimitKb) && (
        <p className="mt-5 text-[11px] text-[var(--iv-text-faintest)]">
          {question.timeLimitMs ? `Time limit ${question.timeLimitMs} ms` : ""}
          {question.timeLimitMs && question.memoryLimitKb ? " · " : ""}
          {question.memoryLimitKb ? `Memory ${Math.round(question.memoryLimitKb / 1024)} MB` : ""}
        </p>
      )}
    </div>
  );
}

/* ── Editor toolbar ──────────────────────────────────────────────────────── */
function Toolbar({
  languages,
  language,
  onLanguageChange,
  onResetCode,
  onRun,
  onSubmit,
  running,
  submitting,
  locked,
}: Pick<Props, "languages" | "language" | "onLanguageChange" | "onResetCode" | "onRun" | "onSubmit" | "running" | "submitting" | "locked">) {
  const busy = running || submitting;
  return (
    <div className="flex items-center gap-2 border-b border-[var(--iv-border)] bg-[var(--iv-panel)] px-2.5 py-2">
      <select
        value={language}
        onChange={(e) => onLanguageChange(e.target.value)}
        disabled={locked}
        className="rounded border border-[var(--iv-border)] bg-[var(--iv-elevated)] px-2 py-1 text-xs text-[var(--iv-text-secondary)] outline-none focus:border-[#0062FF] disabled:opacity-50"
      >
        {languages.map((l) => (
          <option key={l} value={l}>
            {l[0].toUpperCase() + l.slice(1)}
          </option>
        ))}
      </select>

      <button
        onClick={onResetCode}
        disabled={locked || busy}
        title="Reset to starter code"
        className="rounded p-1.5 text-[var(--iv-text-faint)] hover:bg-white/5 hover:text-[var(--iv-text-secondary)] disabled:opacity-40"
      >
        <RotateCcw size={13} />
      </button>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onRun}
          disabled={locked || busy}
          data-testid="run-code"
          className="flex items-center gap-1.5 rounded-md border border-[var(--iv-border)] bg-[var(--iv-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--iv-text-secondary)] hover:border-[var(--iv-text-faintest)] disabled:opacity-40"
        >
          {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
          Run
        </button>
        <button
          onClick={onSubmit}
          disabled={locked || busy}
          data-testid="submit-code"
          className="flex items-center gap-1.5 rounded-md bg-[#0062FF] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0053d6] disabled:opacity-40"
        >
          {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          Submit
        </button>
      </div>
    </div>
  );
}

function EditorPanel(props: Props) {
  const { theme } = useInterviewTheme();
  return (
    <div className="flex h-full flex-col bg-[var(--iv-editor-bg)]">
      <Toolbar {...props} />
      <div className="min-h-0 flex-1">
        <Suspense fallback={<div className="p-4 text-xs text-[var(--iv-text-faint)]">Loading editor…</div>}>
          <MonacoEditor
            height="100%"
            theme={theme === "light" ? "light" : "vs-dark"}
            language={props.monacoLang[props.language] ?? "plaintext"}
            value={props.code}
            onChange={(v) => props.onCodeChange(v ?? "")}
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 12 },
              readOnly: props.locked,
              tabSize: 4,
              lineNumbersMinChars: 3,
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}

/* ── Bottom-right: console (testcases + results) ─────────────────────────── */
function ConsolePanel({
  question,
  runResult,
  submitResult,
  running,
  afterSubmitSlot,
}: Pick<Props, "question" | "runResult" | "submitResult" | "running" | "afterSubmitSlot">) {
  const samples = question.sampleTestCases;
  const [tab, setTab] = useState<"cases" | "result">("cases");
  const [caseIdx, setCaseIdx] = useState(0);

  // Auto-jump to results when one arrives.
  useEffect(() => {
    if (running || runResult || submitResult) setTab("result");
  }, [running, runResult, submitResult]);

  const activeSample = samples[caseIdx];
  const runCase = runResult?.cases?.[caseIdx];

  return (
    <div className="flex h-full flex-col bg-[var(--iv-panel)]">
      <div className="flex items-center gap-1 border-b border-[var(--iv-border)] px-2">
        <button
          onClick={() => setTab("cases")}
          className={cn(
            "flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors",
            tab === "cases" ? "border-[#0062FF] text-[var(--iv-text)]" : "border-transparent text-[var(--iv-text-faint)] hover:text-[var(--iv-text-secondary)]"
          )}
        >
          <ListChecks size={13} /> Testcase
        </button>
        <button
          onClick={() => setTab("result")}
          className={cn(
            "flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors",
            tab === "result" ? "border-[#0062FF] text-[var(--iv-text)]" : "border-transparent text-[var(--iv-text-faint)] hover:text-[var(--iv-text-secondary)]"
          )}
        >
          <TerminalSquare size={13} /> Result
        </button>
        {afterSubmitSlot && <div className="ml-auto py-1.5 pr-1">{afterSubmitSlot}</div>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "cases" &&
          (samples.length === 0 ? (
            <p className="text-xs text-[var(--iv-text-faint)]">
              No sample cases are shown for this problem. Use <span className="text-[var(--iv-text-secondary)]">Submit</span> to have your
              solution evaluated against the full hidden test suite.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {samples.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setCaseIdx(i)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium",
                      i === caseIdx ? "bg-[var(--iv-elevated)] text-[var(--iv-text)] border border-[var(--iv-border)]" : "text-[var(--iv-text-faint)] hover:text-[var(--iv-text-secondary)]"
                    )}
                  >
                    Case {i + 1}
                  </button>
                ))}
              </div>
              {activeSample && (
                <div className="space-y-2">
                  <Field label="Input" value={activeSample.input} />
                  <Field label="Expected" value={activeSample.expectedOutput} />
                  {activeSample.explanation && <Field label="Note" value={activeSample.explanation} muted />}
                </div>
              )}
            </div>
          ))}

        {tab === "result" && (
          <div className="space-y-3">
            {running && (
              <div className="flex items-center gap-2 text-xs text-[var(--iv-text-muted)]">
                <Loader2 size={13} className="animate-spin" /> Running your code against the sample cases…
              </div>
            )}

            {!running && submitResult && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {submitResult.total > 0 && submitResult.passed === submitResult.total ? (
                    <CheckCircle2 size={15} className="text-[#3DDC84]" />
                  ) : (
                    <XCircle size={15} className="text-[#F59E0B]" />
                  )}
                  <span className="text-sm text-[var(--iv-text)]">
                    {submitResult.total > 0
                      ? `${submitResult.passed} / ${submitResult.total} test cases passed`
                      : "Submission received"}
                  </span>
                  {submitResult.score !== undefined && (
                    <span className="rounded bg-[var(--iv-elevated)] px-2 py-0.5 text-xs text-[var(--iv-text-muted)]">
                      Score {Math.round(submitResult.score)} / 10
                    </span>
                  )}
                </div>
                {submitResult.sandboxAvailable === false && (
                  <p className="flex items-center gap-1.5 text-[11px] text-[#F59E0B]">
                    <Info size={11} /> The sandbox was unavailable — this submission was graded on code inspection.
                  </p>
                )}
                {submitResult.feedback && (
                  <p className="whitespace-pre-wrap rounded-lg border border-[var(--iv-border)] bg-[var(--iv-card)] p-3 text-xs leading-relaxed text-[var(--iv-text-muted)]">
                    {submitResult.feedback}
                  </p>
                )}
              </div>
            )}

            {!running && !submitResult && runResult && (
              <div className="space-y-3">
                {runResult.ran ? (
                  <>
                    <div className="flex items-center gap-2">
                      {runResult.passed === runResult.total ? (
                        <CheckCircle2 size={15} className="text-[#3DDC84]" />
                      ) : (
                        <XCircle size={15} className="text-[#F59E0B]" />
                      )}
                      <span className="text-sm text-[var(--iv-text)]">
                        {runResult.passed} / {runResult.total} sample cases passed
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {runResult.cases.map((c, i) => (
                        <button
                          key={c.id}
                          onClick={() => setCaseIdx(i)}
                          className={cn(
                            "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium",
                            i === caseIdx ? "bg-[var(--iv-elevated)] border border-[var(--iv-border)]" : "hover:bg-white/5",
                            c.passed ? "text-[#3DDC84]" : "text-[#FF5C5C]"
                          )}
                        >
                          {c.passed ? <CheckCircle2 size={11} /> : <XCircle size={11} />} Case {i + 1}
                        </button>
                      ))}
                    </div>
                    {runCase && (
                      <div className="space-y-2">
                        <Field label="Input" value={runCase.input} />
                        <Field label="Expected" value={runCase.expectedOutput} />
                        <Field
                          label="Your output"
                          value={runCase.stdout || "(no output)"}
                          tone={runCase.passed ? "ok" : "bad"}
                        />
                        {runCase.compileOutput && <Field label="Compile" value={runCase.compileOutput} tone="bad" />}
                        {runCase.stderr && <Field label="Runtime error" value={runCase.stderr} tone="bad" />}
                        {(runCase.runtimeMs != null || runCase.memoryKb != null) && (
                          <p className="text-[11px] text-[var(--iv-text-faintest)]">
                            {runCase.runtimeMs != null ? `${runCase.runtimeMs} ms` : ""}
                            {runCase.runtimeMs != null && runCase.memoryKb != null ? " · " : ""}
                            {runCase.memoryKb != null ? `${Math.round(runCase.memoryKb / 1024)} MB` : ""}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="flex items-start gap-1.5 text-xs text-[#F59E0B]">
                    <Info size={12} className="mt-0.5 shrink-0" />
                    {runResult.message || "Couldn't run the sample cases."}
                  </p>
                )}
              </div>
            )}

            {!running && !submitResult && !runResult && (
              <p className="text-xs text-[var(--iv-text-faint)]">
                Run your code to test it against the sample cases, or Submit to evaluate against the full suite.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  muted,
  tone,
}: {
  label: string;
  value: string;
  muted?: boolean;
  tone?: "ok" | "bad";
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--iv-text-faintest)]">{label}</p>
      <pre
        className={cn(
          "overflow-x-auto rounded-md border p-2.5 font-mono text-[12px] leading-relaxed whitespace-pre-wrap break-all",
          tone === "ok" && "border-[#3DDC84]/25 bg-[#3DDC84]/5 text-[#C8F5DA]",
          tone === "bad" && "border-[#FF5C5C]/25 bg-[#FF5C5C]/5 text-[#FFD4D4]",
          !tone && "border-[var(--iv-border)] bg-[var(--iv-card)]",
          muted ? "text-[var(--iv-text-muted)]" : !tone ? "text-[var(--iv-text-secondary)]" : ""
        )}
      >
        {value}
      </pre>
    </div>
  );
}

/* ── Orchestrator ───────────────────────────────────────────────────────── */
export function CodingWorkspace(props: Props) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [mobileTab, setMobileTab] = useState<"problem" | "code" | "tests">("problem");
  const prefix = props.storagePrefix ?? "interview:coding";

  // On phones, surface the run / submit outcome by jumping to the Tests tab.
  useEffect(() => {
    if (props.running || props.runResult || props.submitResult) setMobileTab("tests");
  }, [props.running, props.runResult, props.submitResult]);

  if (isDesktop) {
    return (
      <div className="h-full w-full">
        <SplitPane
          direction="horizontal"
          storageKey={`${prefix}:split-h`}
          defaultRatio={42}
          minFirst={22}
          minSecond={30}
          first={<ProblemPanel question={props.question} />}
          second={
            <SplitPane
              direction="vertical"
              storageKey={`${prefix}:split-v`}
              defaultRatio={64}
              minFirst={25}
              minSecond={15}
              first={<EditorPanel {...props} />}
              second={
                <ConsolePanel
                  question={props.question}
                  runResult={props.runResult}
                  submitResult={props.submitResult}
                  running={props.running}
                  afterSubmitSlot={props.afterSubmitSlot}
                />
              }
            />
          }
        />
      </div>
    );
  }

  // Mobile / tablet — tabbed full-screen panes.
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex shrink-0 border-b border-[var(--iv-border)] bg-[var(--iv-panel)]">
        {([
          ["problem", "Problem", FileText],
          ["code", "Code", Code2],
          ["tests", "Tests", ListChecks],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setMobileTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-medium transition-colors",
              mobileTab === id ? "border-[#0062FF] text-[var(--iv-text)]" : "border-transparent text-[var(--iv-text-faint)]"
            )}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
        {props.progressLabel && (
          <span className="flex items-center px-3 font-mono text-[11px] text-[var(--iv-text-faintest)]">{props.progressLabel}</span>
        )}
      </div>
      <div className="min-h-0 flex-1">
        {mobileTab === "problem" && <ProblemPanel question={props.question} />}
        {mobileTab === "code" && <EditorPanel {...props} />}
        {mobileTab === "tests" && (
          <ConsolePanel
            question={props.question}
            runResult={props.runResult}
            submitResult={props.submitResult}
            running={props.running}
            afterSubmitSlot={props.afterSubmitSlot}
          />
        )}
      </div>
    </div>
  );
}
