import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function getGradeBand(score: number): "high" | "mid" | "low" {
  if (score >= 75) return "high";
  if (score >= 50) return "mid";
  return "low";
}

export function getGradeLabel(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C+";
  if (score >= 40) return "C";
  return "D";
}

export function getGradeColor(band: "high" | "mid" | "low"): string {
  if (band === "high") return "#3DDC84";
  if (band === "mid") return "#0062FF";
  return "#FF5C5C";
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Humanises a backend planType like `student_pro` / `COLLEGE_SCALE`. */
export function planLabel(planType?: string | null): string {
  if (!planType) return "—";
  return String(planType)
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatMoney(n: number | undefined | null, currency = "INR"): string {
  const v = Number(n ?? 0);
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
  } catch {
    return `₹${v}`;
  }
}

export function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Whether a picked File is a PDF. Browsers on some OSes report `file.type` as
 * "" or "application/octet-stream" for perfectly valid PDFs, so fall back to
 * the filename extension. The server verifies the actual bytes.
 */
export function isPdfFile(file: File): boolean {
  const t = (file.type || "").toLowerCase();
  if (t === "application/pdf" || t === "application/x-pdf") return true;
  const generic = t === "" || t === "application/octet-stream" || t === "binary/octet-stream";
  return generic && /\.pdf$/i.test(file.name || "");
}
