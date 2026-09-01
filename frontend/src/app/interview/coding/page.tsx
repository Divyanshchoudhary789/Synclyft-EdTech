"use client";

import { useState, Suspense, lazy } from "react";
import { useRouter } from "next/navigation";
import { InterviewShell } from "@/components/interview/InterviewShell";
import { ProctoringOverlay } from "@/components/interview/ProctoringOverlay";
import { mockCodingProblem } from "@/lib/api/mock";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Play, Send, ChevronDown, ChevronUp, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// Lazy load Monaco
const MonacoEditor = lazy(() => import("@monaco-editor/react"));

type Language = "python" | "javascript" | "java" | "cpp";
type TestStatus = "passed" | "failed" | "error" | "tle" | "pending";

interface TestResult {
  id: string;
  input: string;
  expected: string;
  actual: string;
  status: TestStatus;
  time?: number;
}

const LANG_LABELS: Record<Language, string> = {
  python: "Python 3.12",
  javascript: "JavaScript",
  java: "Java 21",
  cpp: "C++ 17",
};

export default function CodingRoundPage() {
  const router = useRouter();
  const problem = mockCodingProblem;

  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState<Record<Language, string>>({
    python: problem.starterCode.python,
    javascript: problem.starterCode.javascript,
    java: problem.starterCode.java,
    cpp: problem.starterCode.cpp,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"problem" | "editor">("problem");
  const [langOpen, setLangOpen] = useState(false);

  const handleRun = async () => {
    setIsRunning(true);
    setConsoleOpen(true);
    setTestResults([]);
    await new Promise((r) => setTimeout(r, 1200));

    const results: TestResult[] = problem.testCases
      .filter((tc) => !tc.isHidden)
      .map((tc, i) => ({
        id: tc.id,
        input: tc.input,
        expected: tc.expectedOutput,
        actual: i === 1 ? "10" : tc.expectedOutput,
        status: (i === 1 ? "passed" : i === 2 ? "failed" : "passed") as TestStatus,
        time: Math.floor(Math.random() * 80) + 20,
      }));

    setTestResults(results);
    setIsRunning(false);
  };

  const handleSubmit = async () => {
    setIsRunning(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIsRunning(false);
    router.push("/interview/technical");
  };

  const passed = testResults.filter((r) => r.status === "passed").length;
  const total = testResults.length;

  return (
    <InterviewShell
      round="coding"
      roundLabel="Coding"
      pulseMode="steady"
      totalSeconds={2700}
      onExit={() => router.push("/dashboard")}
    >
      {/* Mobile tab switcher */}
      <div className="md:hidden flex border-b border-[#2A2F38]">
        {(["problem", "editor"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={cn(
              "flex-1 py-2 text-xs font-mono uppercase tracking-wider transition-colors",
              mobileTab === tab
                ? "text-[#0062FF] border-b-2 border-[#0062FF]"
                : "text-[#4A5260]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex h-full min-h-0">
        {/* Problem panel */}
        <div className={cn(
          "flex flex-col border-r border-[#2A2F38] overflow-y-auto",
          mobileTab === "problem" ? "flex-1 md:flex-none md:w-[42%]" : "hidden md:flex md:w-[42%]"
        )}>
          <div className="p-5 space-y-5">
            {/* Problem header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "px-2 py-0.5 rounded text-[0.65rem] font-mono uppercase tracking-wider",
                  problem.difficulty === "hard"
                    ? "text-[#FF5C5C] bg-[rgba(255,92,92,0.1)]"
                    : problem.difficulty === "medium"
                    ? "text-[#0062FF] bg-[rgba(0, 98, 255, 0.1)]"
                    : "text-[#3DDC84] bg-[rgba(61,220,132,0.1)]"
                )}>
                  {problem.difficulty}
                </span>
                {problem.tags.map((tag) => (
                  <Badge key={tag} variant="neutral" className="text-[0.65rem]">{tag}</Badge>
                ))}
              </div>
              <h2 className="text-[#E8EAF0] font-semibold text-base leading-snug" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
                {problem.title}
              </h2>
            </div>

            {/* Description */}
            <div className="text-[#9CA3AF] text-sm leading-relaxed space-y-3">
              {problem.description.split("\n\n").map((para, i) => (
                <p key={i}>{para.replace(/\*\*/g, "")}</p>
              ))}
            </div>

            {/* Examples */}
            <div className="space-y-3">
              {problem.examples.map((ex, i) => (
                <div key={i} className="bg-[#12151A] rounded-[8px] p-4 space-y-2">
                  <p className="text-xs text-[#4A5260] font-mono uppercase">Example {i + 1}</p>
                  <div className="space-y-1 text-xs font-mono">
                    <div><span className="text-[#4A5260]">Input: </span><span className="text-[#C8CDD5]">{ex.input}</span></div>
                    <div><span className="text-[#4A5260]">Output: </span><span className="text-[#3DDC84]">{ex.output}</span></div>
                    {ex.explanation && <div><span className="text-[#4A5260]">Explanation: </span><span className="text-[#9CA3AF]">{ex.explanation}</span></div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Constraints */}
            <div>
              <p className="label-caption text-[#4A5260] mb-2">Constraints</p>
              <ul className="space-y-1">
                {problem.constraints.map((c, i) => (
                  <li key={i} className="text-xs font-mono text-[#6B7280]">• {c}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Editor panel */}
        <div className={cn(
          "flex flex-col flex-1 min-w-0",
          mobileTab === "editor" ? "flex flex-col" : "hidden md:flex"
        )}>
          {/* Editor toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-[#2A2F38] bg-[#12151A] shrink-0">
            {/* Language selector */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#1B1F26] border border-[#2A2F38] rounded text-xs font-mono text-[#9CA3AF] hover:text-[#C8CDD5] transition-colors"
                data-testid="language-selector"
              >
                {LANG_LABELS[language]}
                <ChevronDown size={12} />
              </button>

              {langOpen && (
                <div className="absolute top-full left-0 mt-1 bg-[#1B1F26] border border-[#2A2F38] rounded-[8px] overflow-hidden z-10 min-w-[140px]">
                  {(Object.keys(LANG_LABELS) as Language[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => { setLanguage(lang); setLangOpen(false); }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-xs font-mono transition-colors",
                        language === lang ? "text-[#0062FF] bg-[rgba(0, 98, 255, 0.08)]" : "text-[#9CA3AF] hover:text-[#C8CDD5] hover:bg-[#2A2F38]"
                      )}
                    >
                      {LANG_LABELS[lang]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCode((prev) => ({ ...prev, [language]: problem.starterCode[language] }))}
                className="p-1.5 text-[#4A5260] hover:text-[#6B7280] transition-colors"
                title="Reset code"
              >
                <RefreshCw size={13} />
              </button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleRun}
                loading={isRunning}
                icon={<Play size={12} />}
                data-testid="run-code-btn"
              >
                Run
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                loading={isRunning}
                icon={<Send size={12} />}
                data-testid="submit-code-btn"
              >
                Submit
              </Button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 min-h-0">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full bg-[#0B0D10]">
                  <div className="text-[#4A5260] text-sm font-mono">Loading editor...</div>
                </div>
              }
            >
              <MonacoEditor
                height="100%"
                language={language === "cpp" ? "cpp" : language}
                value={code[language]}
                onChange={(val) => setCode((prev) => ({ ...prev, [language]: val ?? "" }))}
                theme="vs-dark"
                options={{
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  minimap: { enabled: false },
                  lineNumbers: "on",
                  renderLineHighlight: "line",
                  scrollBeyondLastLine: false,
                  padding: { top: 16, bottom: 16 },
                  smoothScrolling: true,
                  cursorSmoothCaretAnimation: "on",
                  tabSize: 4,
                  wordWrap: "off",
                }}
                data-testid="code-editor"
              />
            </Suspense>
          </div>

          {/* Console / Test results */}
          <div className="border-t border-[#2A2F38] bg-[#12151A] shrink-0">
            <button
              onClick={() => setConsoleOpen(!consoleOpen)}
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-mono text-[#6B7280] hover:text-[#9CA3AF] transition-colors"
              data-testid="console-toggle"
            >
              <span className="flex items-center gap-2">
                Console
                {testResults.length > 0 && (
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[0.6rem]",
                    passed === total
                      ? "bg-[rgba(61,220,132,0.1)] text-[#3DDC84]"
                      : "bg-[rgba(255,92,92,0.1)] text-[#FF5C5C]"
                  )}>
                    {passed}/{total} passed
                  </span>
                )}
              </span>
              {consoleOpen ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
            </button>

            {consoleOpen && (
              <div className="px-4 pb-4 max-h-48 overflow-y-auto space-y-2">
                {isRunning && (
                  <div className="flex items-center gap-2 py-2">
                    <div className="w-3 h-3 border-2 border-[#0062FF] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-mono text-[#0062FF]">Executing code against test cases...</span>
                  </div>
                )}

                {testResults.map((result, i) => (
                  <div key={result.id} className={cn(
                    "p-3 rounded border text-xs font-mono",
                    result.status === "passed"
                      ? "bg-[rgba(61,220,132,0.06)] border-[rgba(61,220,132,0.15)]"
                      : "bg-[rgba(255,92,92,0.06)] border-[rgba(255,92,92,0.15)]"
                  )}>
                    <div className="flex items-center gap-2 mb-1.5">
                      {result.status === "passed" ? (
                        <CheckCircle2 size={12} className="text-[#3DDC84]" />
                      ) : (
                        <XCircle size={12} className="text-[#FF5C5C]" />
                      )}
                      <span className={result.status === "passed" ? "text-[#3DDC84]" : "text-[#FF5C5C]"}>
                        Test {i + 1} — {result.status.toUpperCase()}
                      </span>
                      {result.time && (
                        <span className="text-[#4A5260] ml-auto">{result.time}ms</span>
                      )}
                    </div>
                    <div className="space-y-0.5 text-[0.7rem] text-[#6B7280]">
                      <div>Input: <span className="text-[#9CA3AF]">{result.input}</span></div>
                      <div>Expected: <span className="text-[#3DDC84]">{result.expected}</span></div>
                      <div>Got: <span className={result.status === "passed" ? "text-[#3DDC84]" : "text-[#FF5C5C]"}>{result.actual}</span></div>
                    </div>
                  </div>
                ))}

                {testResults.length === 0 && !isRunning && (
                  <div className="py-4 text-xs text-[#4A5260]">Run your code to see test case results.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ProctoringOverlay />
    </InterviewShell>
  );
}
