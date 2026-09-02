"use client";

import { useEffect, useState } from "react";
import { Badge } from "@synclyft/ui/components/Badge";
import { Check, X, University, RefreshCw, Mail, Calendar, User } from "lucide-react";
import { superAdminService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import toast from "react-hot-toast";

interface PendingApproval {
  id: string;
  name: string;
  email: string;
  organization: string;
  createdAt: string;
}

export default function PendingCollegesPage() {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const list = await superAdminService.pendingApprovals();
      setApprovals(
        list.map((a) => ({
          id: String(a._id ?? a.id ?? ""),
          name: String(a.name ?? ""),
          email: String(a.email ?? ""),
          organization: String(a.organization ?? ""),
          createdAt: String(a.createdAt ?? ""),
        }))
      );
      setError(null);
    } catch (err) {
      setApprovals([]);
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const approve = async (id: string) => {
    setActioningId(id);
    try {
      await superAdminService.approveCollege(id);
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      toast.success("Registration approved");
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setActioningId(null);
    }
  };

  const reject = async (id: string) => {
    const reason = window.prompt("Reason for rejection (shared with the applicant):", "");
    if (reason === null) return;
    setActioningId(id);
    try {
      await superAdminService.rejectCollege(id, reason.trim() || undefined);
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      toast.success("Registration rejected");
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <University size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>Pending college approvals</h1>
            <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>Approve or reject registration requests from institutional officers</p>
          </div>
        </div>
        <button onClick={fetchPending} title="Reload"
          className="p-2 rounded-xl border transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
          style={{ borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border text-xs font-semibold flex items-center gap-2 border-red-500/20 text-red-500 bg-red-500/5">
          <X size={16} /> {error}
        </div>
      )}

      <div className="rounded-2xl border" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--th-border)" }}>
          <h3 className="font-bold text-sm" style={{ color: "var(--th-text-primary)" }}>Registration requests</h3>
          <Badge variant="cobalt">{approvals.length} pending</Badge>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <RefreshCw size={22} className="animate-spin text-blue-500" />
            <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>Fetching pending approvals…</p>
          </div>
        ) : approvals.length === 0 ? (
          <div className="py-14 text-center text-xs" style={{ color: "var(--th-text-faint)" }}>
            <University size={24} className="mx-auto mb-3 opacity-30" />
            No pending college approvals.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[640px]">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--th-border)" }}>
                  <th className="px-6 py-3 text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>College / university</th>
                  <th className="px-6 py-3 text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Officer details</th>
                  <th className="px-6 py-3 text-[10px] uppercase font-bold" style={{ color: "var(--th-text-faint)" }}>Requested</th>
                  <th className="px-6 py-3 text-[10px] uppercase font-bold text-right" style={{ color: "var(--th-text-faint)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((app) => (
                  <tr key={app.id} className="border-b last:border-0" style={{ borderColor: "var(--th-border)" }}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <University size={15} className="text-blue-500 shrink-0" />
                        <span className="text-xs font-bold" style={{ color: "var(--th-text-primary)" }}>{app.organization}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--th-text-primary)" }}>
                          <User size={12} className="opacity-60" /> {app.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: "var(--th-text-faint)" }}>
                          <Mail size={10} className="opacity-60" /> {app.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs" style={{ color: "var(--th-text-secondary)" }}>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="opacity-60" /> {app.createdAt ? new Date(app.createdAt).toLocaleDateString("en-IN") : "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button disabled={actioningId !== null} onClick={() => approve(app.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1 disabled:opacity-50">
                          <Check size={12} /> Approve
                        </button>
                        <button disabled={actioningId !== null} onClick={() => reject(app.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-1 disabled:opacity-50">
                          <X size={12} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
