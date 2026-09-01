"use client";

import { useTheme } from "@/lib/theme";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md";
  variant?: "pill" | "icon";
}

export function ThemeToggle({ className, size = "md", variant = "icon" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  if (variant === "pill") {
    return (
      <button
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        className={cn(
          "relative inline-flex items-center gap-2 rounded-full border transition-all duration-300",
          size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
          theme === "dark"
            ? "bg-[#1B1F26] border-[#2A2F38] text-[#C8CDD5] hover:border-[#4A5260] hover:bg-[#2A2F38]"
            : "bg-white border-[#E5E2D9] text-[#4A5260] hover:border-[#C8CDD5] hover:bg-[#F7F6F3]",
          className
        )}
      >
        <span className="relative w-8 h-4 rounded-full transition-colors duration-300"
          style={{ backgroundColor: theme === "dark" ? "#0062FF" : "#D4D0C5" }}>
          <span className={cn(
            "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-300",
            theme === "dark" ? "translate-x-4" : "translate-x-0.5"
          )} />
        </span>
        {theme === "dark" ? (
          <Moon size={size === "sm" ? 12 : 14} className="text-[#0062FF]" />
        ) : (
          <Sun size={size === "sm" ? 12 : 14} className="text-[#9CA3AF]" />
        )}
        <span className="font-medium">
          {theme === "dark" ? "Dark" : "Light"}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={cn(
        "relative flex items-center justify-center rounded-full border transition-all duration-200 group",
        size === "sm" ? "w-7 h-7" : "w-8 h-8",
        theme === "dark"
          ? "bg-[#1B1F26] border-[#2A2F38] text-[#9CA3AF] hover:border-[#4A5260] hover:text-[#C8CDD5] hover:bg-[#2A2F38]"
          : "bg-white border-[#E5E2D9] text-[#6B7280] hover:border-[#C8CDD5] hover:text-[#15171C] hover:bg-[#F0EDE7]",
        className
      )}
    >
      <span className="relative flex items-center justify-center w-full h-full overflow-hidden">
        {/* Sun icon */}
        <Sun
          size={size === "sm" ? 13 : 15}
          className={cn(
            "absolute transition-all duration-300",
            theme === "dark"
              ? "opacity-0 rotate-90 scale-50"
              : "opacity-100 rotate-0 scale-100"
          )}
        />
        {/* Moon icon */}
        <Moon
          size={size === "sm" ? 13 : 15}
          className={cn(
            "absolute transition-all duration-300",
            theme === "dark"
              ? "opacity-100 rotate-0 scale-100"
              : "opacity-0 -rotate-90 scale-50"
          )}
        />
      </span>
    </button>
  );
}
