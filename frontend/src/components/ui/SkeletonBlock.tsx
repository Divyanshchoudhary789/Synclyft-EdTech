import { cn } from "@/lib/utils";

interface SkeletonBlockProps {
  className?: string;
  height?: string;
  width?: string;
}

export function SkeletonBlock({ className = "bg-var(--th-bg)", height = "h-4", width = "w-full" }: SkeletonBlockProps) {
  return (
    <div
      className={cn("skeleton", height, width, className)}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("card-light p-5 space-y-3", className)}>
      <SkeletonBlock height="h-4" width="w-1/3" />
      <SkeletonBlock height="h-8" width="w-2/3" />
      <SkeletonBlock height="h-4" width="w-full" />
      <SkeletonBlock height="h-4" width="w-5/6" />
    </div>
  );
}
