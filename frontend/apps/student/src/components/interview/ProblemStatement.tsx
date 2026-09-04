"use client";

import { Fragment, type ReactNode } from "react";

/**
 * Renders a plain-text problem statement as readable, LeetCode-style content —
 * headings, fenced code, inline `code`, **bold**, bullet lists and
 * "Example / Constraints" section labels — without pulling in a Markdown
 * dependency. Purely text → React nodes, so there is no XSS surface.
 */

function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Split on `code` and **bold** while keeping delimiters.
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  parts.forEach((part, i) => {
    if (!part) return;
    if (part.startsWith("`") && part.endsWith("`")) {
      nodes.push(
        <code
          key={`${keyBase}-c${i}`}
          className="rounded bg-[var(--iv-elevated)] px-1.5 py-0.5 font-mono text-[0.82em] text-[var(--iv-text)] border border-[var(--iv-border)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    } else if (part.startsWith("**") && part.endsWith("**")) {
      nodes.push(
        <strong key={`${keyBase}-b${i}`} className="font-semibold text-[var(--iv-text)]">
          {part.slice(2, -2)}
        </strong>
      );
    } else {
      nodes.push(<Fragment key={`${keyBase}-t${i}`}>{part}</Fragment>);
    }
  });
  return nodes;
}

export function ProblemStatement({ text }: { text: string }) {
  if (!text?.trim()) {
    return <p className="text-sm text-[var(--iv-text-faint)]">No problem description was provided.</p>;
  }

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: string[] = [];
  let code: string[] | null = null;
  let key = 0;

  const flushPara = () => {
    if (!para.length) return;
    blocks.push(
      <p key={`p${key++}`} className="text-[13.5px] leading-relaxed text-[var(--iv-text-secondary)] whitespace-pre-wrap">
        {renderInline(para.join("\n"), `p${key}`)}
      </p>
    );
    para = [];
  };
  const flushList = () => {
    if (!list.length) return;
    blocks.push(
      <ul key={`l${key++}`} className="list-disc space-y-1 pl-5 text-[13.5px] leading-relaxed text-[var(--iv-text-secondary)]">
        {list.map((li, i) => (
          <li key={i}>{renderInline(li, `l${key}-${i}`)}</li>
        ))}
      </ul>
    );
    list = [];
  };

  for (const raw of lines) {
    const line = raw ?? "";

    if (line.trim().startsWith("```")) {
      if (code === null) {
        flushPara();
        flushList();
        code = [];
      } else {
        blocks.push(
          <pre
            key={`code${key++}`}
            className="overflow-x-auto rounded-lg border border-[var(--iv-border)] bg-[var(--iv-card)] p-3 font-mono text-[12px] leading-relaxed text-[var(--iv-text-secondary)]"
          >
            {code.join("\n")}
          </pre>
        );
        code = null;
      }
      continue;
    }
    if (code !== null) {
      code.push(line);
      continue;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      flushPara();
      flushList();
      continue;
    }

    // Section labels: "Example 1:", "Example:", "Constraints:", "Note:", "Follow-up:"
    if (/^(example\s*\d*|constraints?|notes?|follow[\s-]?up|input|output|explanation)\s*:?\s*$/i.test(trimmed)) {
      flushPara();
      flushList();
      blocks.push(
        <p key={`h${key++}`} className="pt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--iv-text-faintest)]">
          {trimmed.replace(/:$/, "")}
        </p>
      );
      continue;
    }

    // Markdown-ish headings
    const h = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushPara();
      flushList();
      blocks.push(
        <p key={`hh${key++}`} className="pt-1 text-sm font-semibold text-[var(--iv-text)]">
          {renderInline(h[2], `hh${key}`)}
        </p>
      );
      continue;
    }

    // Bullets
    const b = trimmed.match(/^[-*•]\s+(.*)$/);
    if (b) {
      flushPara();
      list.push(b[1]);
      continue;
    }

    flushList();
    para.push(trimmed);
  }
  flushPara();
  flushList();
  if (code) {
    blocks.push(
      <pre key={`code${key++}`} className="overflow-x-auto rounded-lg border border-[var(--iv-border)] bg-[var(--iv-card)] p-3 font-mono text-[12px] text-[var(--iv-text-secondary)]">
        {code.join("\n")}
      </pre>
    );
  }

  return <div className="space-y-3">{blocks}</div>;
}
