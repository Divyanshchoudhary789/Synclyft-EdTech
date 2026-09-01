"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/api";
import {
  FileText, Calendar, Target, Award, ListChecks, Trash,
  ChevronRight, ArrowLeft, Loader2, Sparkles, X, Briefcase, LayoutTemplate
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface ResumeRecord {
  _id: string;
  title: string;
  templateId?: string;
  targetRole?: string;
  experienceLevel?: string;
  updatedAt: string;
}

export default function ResumeHistory() {
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState<ResumeRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedResume, setSelectedResume] = useState<ResumeRecord | null>(null);

  const fetchHistory = async (pageNumber: number) => {
    setTimeout(() => setLoading(true), 0);
    try {
      const res = await api.get(`resume/history?page=${pageNumber}`);
      localStorage.setItem("resume-history", res.data)
      console.log("Resume history response:", res.data);

      if (res.data?.success && Array.isArray(res.data.resumes)) {
        setHistoryData(res.data.resumes);
        setTotalPages(res.data.pagination?.totalPages || 1);
      } else {
        setHistoryData([]);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Failed to load resume history:", err);
      setHistoryData([]);
    } finally {
      setLoading(false);
    }
  };

  const resumeDetails = async(id : any)=> {
    try {
      const res = await api.get(`resume/${id}`)
      console.log("resume details", res.data)
      setSelectedResume(res.data)
    } catch (err : any) {
      console.log("error", err)
    }
  }

  const deleteRecord = async(id : any) => {
    try {
      const res = await api.delete(`resume/delete/${id}`)
      console.log("delete response", res.data)
      fetchHistory(page)
    } catch (err : any) {
      console.log("error", err)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistory(page);
    }, 0);
    return () => clearTimeout(timer);
  }, [page]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--th-bg)] transition-colors" style={{ fontFamily: "var(--font-inter), sans-serif" }}>

      <main className="flex-1 pt-24 pb-16 px-4 md:px-8 max-w-7xl mx-auto w-full relative">
        {/* Background Radial Glow */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden>
          <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-blue-500/5 blur-[100px] animate-pulse" />
          <div className="absolute bottom-20 right-10 w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[120px]" />
        </div>

        <div className="relative z-10 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[var(--th-border)]">
            <div className="space-y-1">
              <Link href="/dashboard" className="flex items-center gap-1 text-[11px] font-bold text-[var(--th-text-faint)] hover:text-blue-500 transition-colors uppercase tracking-wider mb-2">
                <ArrowLeft size={12} />
                <span>Back to Dashboard</span>
              </Link>
              <h1 className="text-2xl md:text-3xl font-black text-[var(--th-text-primary)] flex items-center gap-2" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
                <FileText className="text-[#0062FF]" size={28} />
                <span>Resume History</span>
              </h1>
              <p className="text-xs text-[var(--th-text-secondary)]">
                Review and manage all your saved resumes.
              </p>
            </div>
            <Link href="/tools/ats-analyzer">
              <Button icon={<Sparkles size={13} />} className="shadow-lg shadow-blue-500/10">
                Create New Resume
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-[#0062FF]" size={36} />
              <p className="text-xs text-[var(--th-text-faint)] font-bold uppercase tracking-wider">Retrieving Resumes...</p>
            </div>
          ) : historyData.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-[var(--th-card-border)] bg-[var(--th-card-bg)] max-w-xl mx-auto space-y-6">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
                <FileText size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-[var(--th-text-primary)]">No Saved Resumes Found</h3>
                <p className="text-xs text-[var(--th-text-secondary)] leading-relaxed">
                  You haven&apos;t saved any resumes yet. Start creating or checking a resume in the editor.
                </p>
              </div>
              <Link href="/tools/ats-analyzer" className="inline-block">
                <Button variant="secondary" size="sm">Go to Resume Builder</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* History Grid List */}
              <div className="grid md:grid-cols-2 gap-6">
                {historyData.map((record) => {
                  const date = record.updatedAt || "";
                  return (
                    <div
                      key={record._id}
                      className="p-6 rounded-3xl border border-[var(--th-card-border)] bg-[var(--th-card-bg)]/80 backdrop-blur-md shadow-md hover:shadow-2xl hover:shadow-blue-500/5 hover:border-blue-500/40 hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between space-y-6"
                    >
                      <div className="space-y-5">
                        {/* Header Details */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-[#0062FF] flex items-center justify-center shrink-0 shadow-inner group-hover:bg-[#0062FF] group-hover:text-white transition-colors duration-300">
                              <FileText size={20} />
                            </div>
                            <div className="min-w-0 space-y-1">
                              <h3 className="text-sm font-black text-[var(--th-text-primary)] truncate group-hover:text-blue-500 transition-colors leading-tight" title={record.title}>
                                {record.title}
                              </h3>
                              {date && (
                                <p className="text-[10px] text-[var(--th-text-faint)] flex items-center gap-1 font-mono">
                                  <Calendar size={10} />
                                  <span>{new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Trash Button */}
                          <button
                            type="button"
                            onClick={() => deleteRecord(record._id)}
                            className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-all border-none bg-transparent cursor-pointer shrink-0"
                            title="Delete Record"
                          >
                            <Trash size={14} />
                          </button>
                        </div>

                        {/* Details grid (3 equal columns) */}
                        <div className="grid grid-cols-3 gap-3 border-t pt-4 border-[var(--th-border)] text-xs text-[var(--th-text-secondary)]">
                          <div className="space-y-1 min-w-0">
                            <span className="text-[9px] uppercase font-bold text-[var(--th-text-faint)] tracking-wider flex items-center gap-1">
                              <Target size={9} className="text-blue-500" />
                              Role
                            </span>
                            <p className="font-extrabold text-[var(--th-text-primary)] truncate" title={record.targetRole || "N/A"}>
                              {record.targetRole || "N/A"}
                            </p>
                          </div>
                          <div className="space-y-1 min-w-0">
                            <span className="text-[9px] uppercase font-bold text-[var(--th-text-faint)] tracking-wider flex items-center gap-1">
                              <Briefcase size={9} className="text-emerald-500" />
                              Level
                            </span>
                            <p className="font-extrabold text-[var(--th-text-primary)] truncate" title={record.experienceLevel || "N/A"}>
                              {record.experienceLevel || "N/A"}
                            </p>
                          </div>
                          <div className="space-y-1 min-w-0">
                            <span className="text-[9px] uppercase font-bold text-[var(--th-text-faint)] tracking-wider flex items-center gap-1">
                              <LayoutTemplate size={9} className="text-indigo-500" />
                              Template
                            </span>
                            <p className="font-extrabold text-[var(--th-text-primary)] font-mono text-[10px] truncate" title={record.templateId || "N/A"}>
                              {record.templateId || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => resumeDetails(record._id)}
                          className="flex-1 py-3 rounded-2xl bg-[var(--th-bg-secondary)] border border-[var(--th-border-strong)] text-[var(--th-text-primary)] hover:bg-neutral-200 dark:hover:bg-neutral-800 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          Details
                        </button>
                        <Link href="/tools/ats-analyzer" className="flex-1">
                          <button
                            type="button"
                            className="w-full py-3 rounded-2xl bg-[#0062FF] hover:bg-[#004BE6] text-white border-none text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/10"
                          >
                            Edit Resume
                          </button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 pt-6">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="px-4 py-2 rounded-xl bg-[var(--th-bg-secondary)] border border-[var(--th-border-strong)] text-xs font-bold text-[var(--th-text-primary)] disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-[var(--th-text-secondary)] font-medium">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="px-4 py-2 rounded-xl bg-[var(--th-bg-secondary)] border border-[var(--th-border-strong)] text-xs font-bold text-[var(--th-text-primary)] disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Recommendations Details Modal */}
      {selectedResume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg p-8 rounded-3xl border space-y-6 shadow-2xl relative bg-[var(--th-card-bg)] border-[var(--th-card-border)] text-left animate-in zoom-in-95 duration-250">
            <button
              onClick={() => setSelectedResume(null)}
              className="absolute right-4 top-4 p-1 text-[var(--th-text-faint)] hover:text-[var(--th-text-primary)] transition-colors border-0 bg-transparent cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="space-y-2 border-b pb-4 border-[var(--th-border)]">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-full">
                Resume Meta Specs
              </span>
              <h3 className="text-lg font-extrabold text-[var(--th-text-primary)] mt-3">
                {selectedResume.title}
              </h3>
            </div>

            <div className="space-y-3.5 text-xs text-[var(--th-text-secondary)]">
              <div className="flex justify-between border-b pb-2 border-[var(--th-border)]">
                <span>Resume ID:</span>
                <strong className="font-mono text-[10px] text-[var(--th-text-primary)]">{selectedResume._id}</strong>
              </div>
              <div className="flex justify-between border-b pb-2 border-[var(--th-border)]">
                <span>Target Role:</span>
                <strong className="text-[var(--th-text-primary)]">{selectedResume.targetRole || "N/A"}</strong>
              </div>
              <div className="flex justify-between border-b pb-2 border-[var(--th-border)]">
                <span>Experience Level:</span>
                <strong className="text-[var(--th-text-primary)]">{selectedResume.experienceLevel || "N/A"}</strong>
              </div>
              <div className="flex justify-between border-b pb-2 border-[var(--th-border)]">
                <span>Template ID:</span>
                <strong className="text-[var(--th-text-primary)] font-mono">{selectedResume.templateId || "N/A"}</strong>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <strong className="text-[var(--th-text-primary)]">
                  {new Date(selectedResume.updatedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </strong>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[var(--th-border)]">
              <button
                type="button"
                onClick={() => setSelectedResume(null)}
                className="px-5 py-2.5 rounded-xl bg-[var(--th-bg-secondary)] border border-[var(--th-border-strong)] text-[var(--th-text-primary)] hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}