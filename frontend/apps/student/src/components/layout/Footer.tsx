"use client";

import Link from "next/link";
import { useState, FormEvent } from "react";
import { Logo } from "@synclyft/ui/components/Logo";
import {
    ArrowUp,
    Send,
    Check,
    Heart
} from "lucide-react";

export default function Footer() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubscribe = async (e: FormEvent) => {
        e.preventDefault();
        if (!email) {
            setStatus("error");
            setErrorMessage("Please enter an email address.");
            return;
        }

        // Simple email regex validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setStatus("error");
            setErrorMessage("Please enter a valid email address.");
            return;
        }

        setStatus("loading");

        // Simulate API request delay
        try {
            await new Promise((resolve) => setTimeout(resolve, 800));
            setStatus("success");
            setEmail("");
            setErrorMessage("");
        } catch {
            setStatus("error");
            setErrorMessage("Something went wrong. Please try again.");
        }
    };

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    return (
        <footer className="border-t border-[var(--th-border)] bg-[var(--th-footer-bg)] backdrop-blur-md relative overflow-hidden transition-all duration-300 mt-10">
            {/* Premium mesh background accent */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--th-bg-secondary)]/30 to-transparent pointer-events-none -z-10" />
            <div className="absolute -bottom-48 left-1/3 w-96 h-96 bg-[#0062FF]/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse duration-[8000ms]" />

            <div className="mx-auto max-w-7xl px-6 py-16 md:py-20 relative z-10">
                {/* Top Grid Area */}
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-6 lg:gap-8">

                    {/* Column 1: Logo & Info */}
                    <div className="lg:col-span-2 space-y-6">
                        <Link href="/" className="flex items-center gap-2.5 group">
                            <Logo size={32} className="transition-transform duration-300 group-hover:scale-105" />
                            <span
                                className="font-bold text-lg tracking-tight transition-colors duration-200"
                                style={{ fontFamily: "var(--font-display)", color: "var(--th-text-primary)" }}
                            >
                                Synclyft AI
                            </span>
                        </Link>

                        <p className="text-sm leading-relaxed max-w-sm" style={{ color: "var(--th-text-secondary)" }}>
                            Crafting premium digital experiences with the power of artificial intelligence.
                        </p>

                        {/* Social Icons */}
                        <div className="flex gap-4">
                            {[
                                {
                                    icon: (
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                                            <rect x="2" y="9" width="4" height="12"></rect>
                                            <circle cx="4" cy="4" r="2"></circle>
                                        </svg>
                                    ),
                                    href: "https://linkedin.com/company/synclyft/posts/?feedView=all",
                                    label: "LinkedIn"
                                },
                                {
                                    icon: (
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                                            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                                        </svg>
                                    ),
                                    href: "https://github.com",
                                    label: "GitHub"
                                },
                                {
                                    icon: (
                                        <svg
                                            viewBox="0 0 24 24"
                                            width="16"
                                            height="16"
                                            fill="currentColor"
                                            className="w-4 h-4"
                                        >
                                            <path d="M18.901 1.153H22.58l-8.03 9.179L24 22.847h-7.406l-5.8-7.584-6.64 7.584H.47l8.59-9.817L0 1.153h7.594l5.243 6.932L18.9 1.153zm-1.296 19.482h2.046L6.482 3.26H4.287l13.318 17.375z" />
                                        </svg>
                                    ),
                                    href: "https://x.com/SynclyftAI",
                                    label: "X"
                                }
                            ].map((social, index) => {
                                return (
                                    <a
                                        key={index}
                                        href={social.href}
                                        target="_blank"
                                        rel="noreferrer"
                                        aria-label={social.label}
                                        className="p-2 rounded-lg border border-[var(--th-border)] transition-all duration-300 hover:scale-115 hover:shadow-sm"
                                        style={{
                                            backgroundColor: "var(--th-surface)",
                                            color: "var(--th-text-muted)"
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.color = "#0062FF";
                                            e.currentTarget.style.borderColor = "rgba(0, 98, 255, 0.3)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.color = "var(--th-text-muted)";
                                            e.currentTarget.style.borderColor = "var(--th-border)";
                                        }}
                                    >
                                        {social.icon}
                                    </a>
                                );
                            })}
                        </div>
                    </div>

                    {/* Column 3: Resources Links */}
                    <div className="lg:col-span-1">
                        <h3
                            className="text-xs font-semibold tracking-wider uppercase mb-4"
                            style={{ fontFamily: "var(--font-display)", color: "var(--th-text-primary)" }}
                        >
                            Platform
                        </h3>
                        <ul className="space-y-3 text-sm">
                            {[
                                { label: "Features", href: "/features" },
                                { label: "Help Center", href: "#" },
                                { label: "FAQs", href: "/#faqs" },
                                { label: "Security", href: "/" }
                            ].map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="transition-colors duration-200 hover:text-[#0062FF]"
                                        style={{ color: "var(--th-text-secondary)" }}
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 4: Company Links */}
                    <div className="lg:col-span-1">
                        <h3
                            className="text-xs font-semibold tracking-wider uppercase mb-4"
                            style={{ fontFamily: "var(--font-display)", color: "var(--th-text-primary)" }}
                        >
                            Company
                        </h3>
                        <ul className="space-y-3 text-sm">
                            {[
                                { label: "About", href: "/about" },
                                { label: "Careers", href: "#" },
                                { label: "Contact", href: "#" },
                                { label: "Privacy Policy", href: "#" }
                            ].map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="transition-colors duration-200 hover:text-[#0062FF]"
                                        style={{ color: "var(--th-text-secondary)" }}
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 5: Newsletter */}
                    <div className="lg:col-span-1">
                        <h3
                            className="text-xs font-semibold tracking-wider uppercase mb-4"
                            style={{ fontFamily: "var(--font-display)", color: "var(--th-text-primary)" }}
                        >
                            Join the Beta
                        </h3>
                        <p className="text-xs leading-relaxed mb-4" style={{ color: "var(--th-text-secondary)" }}>
                            Get updates on new adaptive coding banks and HR modules.
                        </p>

                        <form onSubmit={handleSubscribe} className="space-y-2">
                            <div className="relative flex items-center">
                                <input
                                    type="email"
                                    placeholder="Enter email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={status === "loading" || status === "success"}
                                    className="w-full pr-10 pl-3 py-2 bg-[var(--th-input-bg)] border border-[var(--th-input-border)] rounded-lg text-xs transition-all outline-none focus:border-[#0062FF]"
                                    style={{ color: "var(--th-text-primary)" }}
                                />

                                <button
                                    type="submit"
                                    disabled={status === "loading" || status === "success"}
                                    className="absolute right-1 p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[#0062FF] disabled:opacity-50 cursor-pointer"
                                    aria-label="Subscribe"
                                >
                                    {status === "loading" ? (
                                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    ) : status === "success" ? (
                                        <Check size={14} className="text-[#3DDC84]" />
                                    ) : (
                                        <Send size={14} />
                                    )}
                                </button>
                            </div>

                            {/* Status messages */}
                            {status === "success" && (
                                <p className="text-[10px] text-[#3DDC84] font-medium flex items-center gap-1">
                                    <Check size={10} /> Subscribed successfully!
                                </p>
                            )}
                            {status === "error" && (
                                <p className="text-[10px] text-[#FF5C5C] font-medium">
                                    {errorMessage}
                                </p>
                            )}
                        </form>
                    </div>

                </div>

                {/* Bottom Bar: Copyright & Back to Top */}
                <div className="mt-16 pt-8 border-t border-[var(--th-border)]">
                    <div className="flex flex-col items-center justify-between gap-4 md:flex-row text-xs">
                        <div className="flex flex-col items-center md:items-start gap-1.5" style={{ color: "var(--th-text-muted)" }}>
                            <span>© {new Date().getFullYear()} Synclyft AI. All rights reserved.</span>
                            <span className="flex items-center gap-1 text-[10px] text-[var(--th-text-faint)]">
                                Made with <Heart size={10} className="text-[#FF5C5C] fill-[#FF5C5C]" /> for candidates.
                            </span>
                        </div>

                        <button
                            onClick={scrollToTop}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--th-border)] transition-all duration-300 hover:scale-105"
                            style={{
                                backgroundColor: "var(--th-surface)",
                                color: "var(--th-text-secondary)"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = "rgba(0, 98, 255, 0.3)";
                                e.currentTarget.style.color = "#0062FF";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = "var(--th-border)";
                                e.currentTarget.style.color = "var(--th-text-secondary)";
                            }}
                        >
                            <span>Back to top</span>
                            <ArrowUp size={12} className="animate-bounce duration-1000" />
                        </button>
                    </div>
                </div>
            </div>
        </footer>
    );
}