import type { Metadata } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Synclyft AI — AI-Powered Interview & Career Prep",
  description:
    "The focused operator's console for interview preparation. AI-adaptive rounds, real-time proctoring, and deep readiness analytics.",
  keywords: ["interview prep", "AI interview", "career platform", "coding rounds", "aptitude test", "Synclyft", 
    "Interview Preparation", "Career Platform", "Coding Rounds", "Aptitude Test", "Resume ATS Analyzer", "HR Round", "Proctoring", "Analytics",
     "Placement Officer Portal", "AI"],
  icons: {
    icon: "/images/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${interTight.variable} ${jetbrainsMono.variable}`}>
      <body
        style={{
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        }}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
