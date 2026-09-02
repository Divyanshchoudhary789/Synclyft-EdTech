"use client";

import { useEffect, useMemo, useState } from "react";
import { superAdminService } from "@synclyft/lib/api/services";
import { toApiError, api } from "@synclyft/lib/api";
import { Badge } from "@synclyft/ui/components/Badge";
import { SkeletonBlock } from "@synclyft/ui/components/SkeletonBlock";
import { Search, AlertCircle, Building2, X, ShieldCheck, Ban, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";

interface Org {
  _id: string;
  organizationName: string;
  organizationType?: string;
  status?: string;
  isVerified?: boolean;
  registrationNumber?: string;
  phone?: string;
  website?: string;
  address?: { city?: string; state?: string; country?: string };
  primaryContactPerson?: { name?: string; email?: string; designation?: string };
  user?: { name?: string; email?: string; status?: string };
  createdAt?: string;
  verificationDocuments?: { documentType?: string; documentUrl?: string }[];
}

const STATUS_VARIANT: Record<string, "verdant" | "amber" | "coral" | "neutral"> = {
  active: "verdant", pending_verification: "amber", inactive: "neutral", suspended: "coral",
};

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [detail, setDetail] = useState<Org | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setOrgs((await superAdminService.organizations({ limit: 100 })) as unknown as Org[]);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const act = async (id: string, body: Record<string, unknown>, msg: string) => {
    setBusy(id);
    try {
      await api.patch(`/super-admin/organizations/${id}/status`, body);
      toast.success(msg);
      load();
      setDetail(null);
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setBusy(null);
    }
  };

  const filtered = useMemo(
    () => orgs.filter((o) => (o.organizationName ?? "").toLowerCase().includes(q.toLowerCase()) || (o.primaryContactPerson?.email ?? "").toLowerCase().includes(q.toLowerCase())),
    [orgs, q]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>Organizations</h1>
          <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>{orgs.length} registered institutes</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--th-text-faint)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
            className="pl-9 pr-3 py-2 rounded-lg border text-xs w-56"
            style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
          <AlertCircle size={16} className="text-amber-500" /> {error}
          <button onClick={load} className="ml-auto text-blue-600 dark:text-blue-400 text-xs">Retry</button>
        </div>
      )}

      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
        <div className="grid grid-cols-[2fr_1fr_1.5fr_1.2fr] px-6 py-3 text-[10px] font-bold uppercase tracking-wider border-b" style={{ borderColor: "var(--th-border)", color: "var(--th-text-faint)" }}>
          <span>Institute</span><span>Type</span><span>Contact</span><span>Status</span>
        </div>
        {loading ? (
          <div className="p-6 space-y-3"><SkeletonBlock height="h-8" /><SkeletonBlock height="h-8" /><SkeletonBlock height="h-8" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs" style={{ color: "var(--th-text-faint)" }}>
            <Building2 size={22} className="mx-auto mb-2 opacity-40" /> No organizations found.
          </div>
        ) : (
          filtered.map((o) => (
            <button key={o._id} onClick={() => setDetail(o)}
              className="w-full grid grid-cols-[2fr_1fr_1.5fr_1.2fr] px-6 py-3.5 items-center border-b last:border-0 text-sm text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
              style={{ borderColor: "var(--th-border)" }}>
              <span className="font-medium truncate flex items-center gap-2" style={{ color: "var(--th-text-primary)" }}>
                {o.organizationName}
                {o.isVerified && <ShieldCheck size={13} className="text-emerald-500 shrink-0" />}
              </span>
              <span className="text-xs" style={{ color: "var(--th-text-secondary)" }}>{o.organizationType ?? "—"}</span>
              <span className="text-xs truncate" style={{ color: "var(--th-text-muted)" }}>{o.primaryContactPerson?.email ?? o.user?.email ?? "—"}</span>
              <Badge variant={STATUS_VARIANT[o.status ?? ""] ?? "neutral"}>{o.status ?? "—"}</Badge>
            </button>
          ))
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDetail(null)} />
          <div className="relative w-full max-w-md h-full overflow-y-auto shadow-2xl" style={{ backgroundColor: "var(--th-bg)" }}>
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-bg)" }}>
              <h2 className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>{detail.organizationName}</h2>
              <button onClick={() => setDetail(null)} style={{ color: "var(--th-text-faint)" }}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 text-xs" style={{ color: "var(--th-text-secondary)" }}>
              <div className="flex flex-wrap gap-2">
                <Badge variant={STATUS_VARIANT[detail.status ?? ""] ?? "neutral"}>{detail.status ?? "—"}</Badge>
                <Badge variant={detail.isVerified ? "verdant" : "amber"}>{detail.isVerified ? "Verified" : "Unverified"}</Badge>
              </div>
              {([
                ["Type", detail.organizationType],
                ["Registration #", detail.registrationNumber],
                ["Phone", detail.phone],
                ["Website", detail.website],
                ["Location", [detail.address?.city, detail.address?.state, detail.address?.country].filter(Boolean).join(", ")],
                ["Primary contact", detail.primaryContactPerson?.name],
                ["Contact email", detail.primaryContactPerson?.email ?? detail.user?.email],
                ["Designation", detail.primaryContactPerson?.designation],
                ["Registered", detail.createdAt ? new Date(detail.createdAt).toLocaleDateString("en-IN") : ""],
              ] as const).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <span style={{ color: "var(--th-text-faint)" }}>{label}</span>
                  <span className="text-right truncate max-w-[60%]" style={{ color: "var(--th-text-primary)" }}>{value || "—"}</span>
                </div>
              ))}

              {(detail.verificationDocuments ?? []).length > 0 && (
                <div>
                  <p style={{ color: "var(--th-text-faint)" }} className="mb-1">Verification documents</p>
                  {detail.verificationDocuments!.map((d, i) => (
                    <a key={i} href={d.documentUrl} target="_blank" rel="noreferrer" className="block text-blue-600 dark:text-blue-400 hover:underline">
                      {d.documentType || `Document ${i + 1}`}
                    </a>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t flex flex-wrap gap-2" style={{ borderColor: "var(--th-border)" }}>
                {!detail.isVerified && (
                  <button disabled={busy === detail._id} onClick={() => act(detail._id, { isVerified: true }, "Organization verified")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white disabled:opacity-50">
                    <ShieldCheck size={13} /> Verify
                  </button>
                )}
                {detail.status !== "suspended" ? (
                  <button disabled={busy === detail._id} onClick={() => act(detail._id, { status: "suspended" }, "Organization suspended")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500 text-white disabled:opacity-50">
                    <Ban size={13} /> Suspend
                  </button>
                ) : (
                  <button disabled={busy === detail._id} onClick={() => act(detail._id, { status: "active" }, "Organization reactivated")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border disabled:opacity-50" style={{ borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }}>
                    <RotateCcw size={13} /> Reactivate
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
