import { cn } from "@/lib/utils";

type BadgeVariant = "amber" | "verdant" | "coral" | "cobalt" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  amber: "bg-[var(--th-bg-secondary)] text-[#0062FF] border border-[rgba(0, 98, 255, 0.2)]",
  verdant: "bg-[var(--th-bg-secondary)] text-[#3DDC84] border border-[rgba(61,220,132,0.2)]",
  coral: "bg-[#3D1010] text-[#FF5C5C] border border-[rgba(255,92,92,0.2)]",
  cobalt: "bg-[#0F1F4A] text-[#4D7CFF] border border-[rgba(77,124,255,0.2)]",
  neutral: "bg-[var(--th-bg-secondary)] text-[#9CA3AF] border border-[rgba(255,255,255,0.06)]",
};

const dotStyles: Record<BadgeVariant, string> = {
  amber: "bg-var(--th-bg)",
  verdant: "bg-[#3DDC84]",
  coral: "bg-[#FF5C5C]",
  cobalt: "bg-[#4D7CFF]",
  neutral: "bg-[#6B7280]",
};

export function Badge({ variant = "neutral", children, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[0.75rem] font-medium leading-[1.4]",
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotStyles[variant])} />
      )}
      {children}
    </span>
  );
}
