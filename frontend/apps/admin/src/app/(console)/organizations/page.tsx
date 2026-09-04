"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { superAdminService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { Badge } from "@synclyft/ui/components/Badge";
import { Button } from "@synclyft/ui/components/Button";
import { SkeletonBlock } from "@synclyft/ui/components/SkeletonBlock";
import { PageHeader } from "@/components/PageHeader";
import { Modal, DetailRow } from "@synclyft/ui/components/Modal";
import { Search, AlertCircle, Building2, ShieldCheck, Ban, RotateCcw, ExternalLink } from "lucide-react";
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
const STATUSES = ["", "active", "pending_verification", "inactive", "suspended"];
const PAGE_SIZE = 30;

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [verified, setVerified] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [detail, setDetail] = useState<Org | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (opts: { page: number; q: string; status: string; verified: string }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminService.organizations({
        page: opts.page, limit: PAGE_SIZE,
        search: opts.q || undefined,
        status: opts.status || undefined,
        isVerified: opts.verified || undefined,
      });
      setOrgs(res.items as unknown as Org[]);
      setTotal(res.total);
      setPage(opts.page);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load({ page: 1, q: "", status: "", verified: "" }); }, [load]);
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load({ page: 1, q, status, verified }), 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [q, status, verified, load]);

  const act = async (id: string, body: Record<string, unknown>, msg: string) => {
    setBusy(id);
    try {
      await superAdminService.updateOrganizationStatus(id, body);
      toast.success(msg);
      load({ page, q, status, verified });
      setDetail(null);
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setBusy(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectCls = "px-2 py-1.5 rounded-lg border text-xs";
  const selectStyle = { backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Institutions"
        title="Organizations"
        subtitle={`${total} registered institutes`}
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--th-text-faint)" }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search institutes…"
                className="w-full rounded-lg border py-2 pl-9 pr-3 text-xs" style={selectStyle} />
            </div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls} style={selectStyle}>
              {STATUSES.map((s) => <option key={s} value={s}>{s ? s.replace(/_/g, " ") : "All statuses"}</option>)}
            </select>
            <select value={verified} onChange={(e) => setVerified(e.target.value)} className={selectCls} style={selectStyle}>
              <option value="">Any verification</option>
              <option value="true">Verified</option>
              <option value="false">Unverified</option>
            </select>
          </div>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
          <AlertCircle size={16} className="text-amber-500" /> {error}
          <button onClick={() => load({ page, q, status, verified })} className="ml-auto text-xs text-blue-600 dark:text-blue-400">Retry</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
        <div className="min-w-[620px]">
          <div className="grid grid-cols-[2fr_1fr_1.6fr_1.1fr] border-b px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ borderColor: "var(--th-border)", color: "var(--th-text-faint)" }}>
            <span>Institute</span><span>Type</span><span>Contact</span><span>Status</span>
          </div>
          {loading ? (
            <div className="space-y-3 p-6"><SkeletonBlock height="h-8" /><SkeletonBlock height="h-8" /><SkeletonBlock height="h-8" /></div>
          ) : orgs.length === 0 ? (
            <div className="p-12 text-center text-xs" style={{ color: "var(--th-text-faint)" }}>
              <Building2 size={22} className="mx-auto mb-2 opacity-40" /> No organizations found.
            </div>
          ) : (
            orgs.map((o) => (
              <button key={o._id} onClick={() => setDetail(o)}
                className="grid w-full grid-cols-[2fr_1fr_1.6fr_1.1fr] items-center border-b px-6 py-3.5 text-left text-sm transition-colors last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                style={{ borderColor: "var(--th-border)" }}>
                <span className="flex items-center gap-2 truncate font-medium" style={{ color: "var(--th-text-primary)" }}>
                  {o.organizationName}
                  {o.isVerified && <ShieldCheck size={13} className="shrink-0 text-emerald-500" />}
                </span>
                <span className="text-xs capitalize" style={{ color: "var(--th-text-secondary)" }}>{o.organizationType?.replace(/_/g, " ") ?? "—"}</span>
                <span className="truncate text-xs" style={{ color: "var(--th-text-muted)" }}>{o.primaryContactPerson?.email ?? o.user?.email ?? "—"}</span>
                <Badge variant={STATUS_VARIANT[o.status ?? ""] ?? "neutral"}>{(o.status ?? "—").replace(/_/g, " ")}</Badge>
              </button>
            ))
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => load({ page: page - 1, q, status, verified })}>Previous</Button>
          <span className="text-xs" style={{ color: "var(--th-text-faint)" }}>Page {page} of {totalPages}</span>
          <Button variant="secondary" disabled={page >= totalPages || loading} onClick={() => load({ page: page + 1, q, status, verified })}>Next</Button>
        </div>
      )}

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        icon={<div className="rounded-xl bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400"><Building2 size={16} /></div>}
        title={detail?.organizationName ?? ""}
        subtitle={detail ? `Registered ${detail.createdAt ? new Date(detail.createdAt).toLocaleDateString("en-IN") : "—"}` : undefined}
        footer={detail && (
          <>
            {!detail.isVerified && (
              <button disabled={busy === detail._id} onClick={() => act(detail._id, { isVerified: true }, "Organization verified")}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                <ShieldCheck size={13} /> Verify
              </button>
            )}
            {detail.status !== "suspended" ? (
              <button disabled={busy === detail._id} onClick={() => act(detail._id, { status: "suspended" }, "Organization suspended")}
                className="flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                <Ban size={13} /> Suspend
              </button>
            ) : (
              <button disabled={busy === detail._id} onClick={() => act(detail._id, { status: "active" }, "Organization reactivated")}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-50" style={{ borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }}>
                <RotateCcw size={13} /> Reactivate
              </button>
            )}
          </>
        )}
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={STATUS_VARIANT[detail.status ?? ""] ?? "neutral"}>{(detail.status ?? "—").replace(/_/g, " ")}</Badge>
              <Badge variant={detail.isVerified ? "verdant" : "amber"}>{detail.isVerified ? "Verified" : "Unverified"}</Badge>
            </div>

            <div className="grid gap-x-6 sm:grid-cols-2">
              {([
                ["Type", detail.organizationType?.replace(/_/g, " ")],
                ["Registration #", detail.registrationNumber],
                ["Phone", detail.phone],
                ["Website", detail.website],
                ["Location", [detail.address?.city, detail.address?.state, detail.address?.country].filter(Boolean).join(", ")],
                ["Primary contact", detail.primaryContactPerson?.name],
                ["Contact email", detail.primaryContactPerson?.email ?? detail.user?.email],
                ["Designation", detail.primaryContactPerson?.designation],
              ] as const).map(([label, value]) => (
                <DetailRow key={label} label={label}>{value || "—"}</DetailRow>
              ))}
            </div>

            {(detail.verificationDocuments ?? []).length > 0 && (
              <div className="border-t pt-3" style={{ borderColor: "var(--th-border)" }}>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--th-text-faint)" }}>Verification documents</p>
                <div className="flex flex-wrap gap-2">
                  {detail.verificationDocuments!.map((d, i) => (
                    <a key={i} href={d.documentUrl} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                      style={{ borderColor: "var(--th-border)" }}>
                      {d.documentType?.replace(/_/g, " ") || `Document ${i + 1}`} <ExternalLink size={11} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
