import { cn } from "@synclyft/lib/utils";

interface SkeletonBlockProps {
  className?: string;
  height?: string;
  width?: string;
}

export function SkeletonBlock({ className = "", height = "h-4", width = "w-full" }: SkeletonBlockProps) {
  return (
    <div
      className={cn("skeleton", height, width, className)}
      aria-hidden="true"
    />
  );
}

/**
 * KPI-card-shaped placeholder: a short label line, a big value line and a hint
 * line — mirrors the real stat cards so nothing jumps on load. Pass a height
 * class (e.g. `h-28`) to match the surrounding grid.
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("card-light flex flex-col justify-center gap-2.5 p-5", className)} aria-hidden="true">
      <SkeletonBlock height="h-3" width="w-1/2" />
      <SkeletonBlock height="h-7" width="w-2/5" />
      <SkeletonBlock height="h-2.5" width="w-4/5" />
    </div>
  );
}
