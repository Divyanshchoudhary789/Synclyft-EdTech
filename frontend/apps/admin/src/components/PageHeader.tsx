import type { ReactNode } from "react";

/**
 * Consistent page header for every admin console screen.
 * Eyebrow + title + subtitle on the left, actions on the right; wraps on mobile.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--th-text-faint)" }}>
            {eyebrow}
          </p>
        )}
        <h1
          className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl"
          style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}
        >
          {icon}
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-xs sm:text-sm" style={{ color: "var(--th-text-faint)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
