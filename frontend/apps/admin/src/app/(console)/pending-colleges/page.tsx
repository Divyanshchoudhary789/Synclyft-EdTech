"use client";

import { useEffect, useState } from "react";
import { Badge } from "@synclyft/ui/components/Badge";
import { Button } from "@synclyft/ui/components/Button";
import { SkeletonBlock } from "@synclyft/ui/components/SkeletonBlock";
import { PageHeader } from "@/components/PageHeader";
import { Check, X, University, RefreshCw, Mail, Calendar, User, AlertCircle } from "lucide-react";
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
  const [rejectFor, setRejectFor] = useState<PendingApproval | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const list = await superAdminService.pendingApprovals({ limit: 100 });
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

  const reject = async (id: string, reason: string) => {
    setActioningId(id);
    try {
      await superAdminService.rejectCollege(id, reason.trim() || undefined);
      setApprovals((prev) => prev.filter((a) => a.id !== id));
      toast.success("Registration rejected — applicant notified");
      setRejectFor(null);
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Onboarding"
        icon={<University size={18} className="text-blue-500" />}
        title="College approvals"
        subtitle="Approve or reject registration requests from institutional placement officers"
        actions={
          <button onClick={fetchPending} title="Reload"
            className="rounded-xl border p-2 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
            style={{ borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs font-semibold text-red-500">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="rounded-2xl border" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "var(--th-border)" }}>
          <h3 className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>Registration requests</h3>
          <Badge variant="cobalt">{approvals.length} pending</Badge>
        </div>

        {loading ? (
          <div className="space-y-3 p-6"><SkeletonBlock height="h-10" /><SkeletonBlock height="h-10" /><SkeletonBlock height="h-10" /></div>
        ) : approvals.length === 0 ? (
          <div className="py-14 text-center text-xs" style={{ color: "var(--th-text-faint)" }}>
            <Check size={24} className="mx-auto mb-3 text-emerald-500 opacity-70" />
            No pending college approvals.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--th-border)" }}>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase" style={{ color: "var(--th-text-faint)" }}>College / university</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase" style={{ color: "var(--th-text-faint)" }}>Officer details</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase" style={{ color: "var(--th-text-faint)" }}>Requested</th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold uppercase" style={{ color: "var(--th-text-faint)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((app) => (
                  <tr key={app.id} className="border-b last:border-0" style={{ borderColor: "var(--th-border)" }}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <University size={15} className="shrink-0 text-blue-500" />
                        <span className="text-xs font-bold" style={{ color: "var(--th-text-primary)" }}>{app.organization || "—"}</span>
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
                          className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-50">
                          <Check size={12} /> Approve
                        </button>
                        <button disabled={actioningId !== null} onClick={() => setRejectFor(app)}
                          className="flex items-center gap-1 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-600 disabled:opacity-50">
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

      {rejectFor && <RejectModal app={rejectFor} busy={actioningId === rejectFor.id} onClose={() => setRejectFor(null)} onReject={(reason) => reject(rejectFor.id, reason)} />}
    </div>
  );
}

function RejectModal({ app, busy, onClose, onReject }: { app: PendingApproval; busy: boolean; onClose: () => void; onReject: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border p-6" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
        <h3 className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>Reject {app.organization}</h3>
        <p className="mt-1 text-xs" style={{ color: "var(--th-text-faint)" }}>{app.email} will be emailed this reason.</p>
        <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500}
          placeholder="Reason for rejection (e.g. could not verify institute registration)…"
          className="mt-3 w-full resize-none rounded-lg border px-3 py-2 text-xs"
          style={{ backgroundColor: "var(--th-input-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={() => onReject(reason)}>Reject registration</Button>
        </div>
      </div>
    </div>
  );
}
