"use client";

import { useCallback, useEffect, useState } from "react";
import { superAdminService } from "@synclyft/lib/api/services";
import { API_BASE_URL, toApiError } from "@synclyft/lib/api";
import { Badge } from "@synclyft/ui/components/Badge";
import { SkeletonBlock } from "@synclyft/ui/components/SkeletonBlock";
import { Button } from "@synclyft/ui/components/Button";
import { PageHeader } from "@/components/PageHeader";
import { Modal, DetailRow } from "@synclyft/ui/components/Modal";
import { AlertCircle, ScrollText, Download, Search, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";

interface Log {
  _id: string;
  userEmail?: string;
  userRole?: string;
  user?: { name?: string; email?: string; organization?: string } | null;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  method?: string;
  endpoint?: string;
  statusCode?: number;
  status?: string;
  ipAddress?: string;
  userAgent?: string;
  duration?: number;
  hasSensitiveData?: boolean;
  errorMessage?: string;
  details?: Record<string, unknown>;
  timestamp?: string;
  createdAt?: string;
}
interface Summary {
  total: number;
  recentCount: number;
  sensitiveCount: number;
  actionBreakdown: { _id: string; count: number }[];
  roleBreakdown: { _id: string; count: number }[];
  statusBreakdown: { _id: string; count: number }[];
}

const ACTIONS = ["", "API_ACCESS", "ADMIN_ACTION", "DATA_EXPORT", "PROFILE_UPDATE", "REPORT_GENERATION", "AUTH", "LOGIN", "LOGOUT"];
const ROLES = ["", "student", "college-admin", "super-admin"];
const PAGE_SIZE = 40;

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{ action: string; userRole: string; search: string }>({ action: "", userRole: "", search: "" });
  const [applied, setApplied] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [detail, setDetail] = useState<Log | null>(null);

  const params = useCallback(() => {
    const p: Record<string, unknown> = {};
    if (filters.action) p.action = filters.action;
    if (filters.userRole) p.userRole = filters.userRole;
    if (filters.search.trim()) p.search = filters.search.trim();
    return p;
  }, [filters]);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const [logRes, sumRes] = await Promise.allSettled([
        superAdminService.auditLogs({ ...params(), page: p, limit: PAGE_SIZE }),
        superAdminService.auditSummary(params()),
      ]);
      if (logRes.status === "fulfilled") {
        setLogs(logRes.value.items as unknown as Log[]);
        setTotal(logRes.value.total);
        setPage(p);
      } else setError(toApiError(logRes.reason).message);
      if (sumRes.status === "fulfilled") setSummary(sumRes.value as Summary);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { load(1); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [applied]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const qs = new URLSearchParams({ format: "csv", limit: "5000" });
      if (filters.action) qs.set("action", filters.action);
      if (filters.userRole) qs.set("userRole", filters.userRole);
      if (filters.search.trim()) qs.set("search", filters.search.trim());
      const res = await fetch(`${API_BASE_URL}/super-admin/audit-logs/export?${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectStyle = { backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Security"
        title="Audit log"
        subtitle="Every privileged action taken on the platform"
        actions={<Button variant="secondary" icon={<Download size={13} />} loading={exporting} onClick={exportCsv}>Export CSV</Button>}
      />

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[
            { label: "Total events", value: summary.total },
            { label: "Last 24 h", value: summary.recentCount },
            { label: "Sensitive", value: summary.sensitiveCount, warn: true },
            { label: "Failures", value: summary.statusBreakdown.find((s) => s._id === "failure")?.count ?? 0, warn: true },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border p-5" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--th-text-faint)" }}>{k.label}</p>
              <p className="mt-2 text-2xl font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: k.warn && k.value > 0 ? "#FF5C5C" : "var(--th-text-primary)" }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--th-text-faint)" }} />
          <input value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && setApplied((n) => n + 1)}
            placeholder="Search email / endpoint…"
            className="w-full rounded-lg border py-1.5 pl-8 pr-3 text-xs" style={selectStyle} />
        </div>
        <select value={filters.action} onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))} className="rounded-lg border px-2 py-1.5 text-xs" style={selectStyle}>
          {ACTIONS.map((a) => <option key={a} value={a}>{a || "All actions"}</option>)}
        </select>
        <select value={filters.userRole} onChange={(e) => setFilters((f) => ({ ...f, userRole: e.target.value }))} className="rounded-lg border px-2 py-1.5 text-xs" style={selectStyle}>
          {ROLES.map((r) => <option key={r} value={r}>{r || "All roles"}</option>)}
        </select>
        <button onClick={() => setApplied((n) => n + 1)} className="rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: "var(--th-primary)", color: "#fff" }}>Apply</button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
          <AlertCircle size={16} className="text-amber-500" /> {error}
          <button onClick={() => load(page)} className="ml-auto text-xs text-blue-600 dark:text-blue-400">Retry</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[1.5fr_2fr_1fr_2fr_0.7fr] border-b px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ borderColor: "var(--th-border)", color: "var(--th-text-faint)" }}>
            <span>Time</span><span>User</span><span>Action</span><span>Endpoint</span><span>Status</span>
          </div>
          {loading ? (
            <div className="space-y-3 p-6"><SkeletonBlock height="h-7" /><SkeletonBlock height="h-7" /><SkeletonBlock height="h-7" /></div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-xs" style={{ color: "var(--th-text-faint)" }}>
              <ScrollText size={22} className="mx-auto mb-2 opacity-40" /> No audit entries match.
            </div>
          ) : (
            logs.map((l) => {
              const ts = l.timestamp ?? l.createdAt;
              const bad = l.status === "failure" || (l.statusCode ?? 200) >= 400;
              return (
                <button key={l._id} onClick={() => setDetail(l)}
                  className="grid w-full grid-cols-[1.5fr_2fr_1fr_2fr_0.7fr] items-center border-b px-6 py-3 text-left text-xs transition-colors last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                  style={{ borderColor: "var(--th-border)" }}>
                  <span className="font-mono" style={{ color: "var(--th-text-muted)" }}>{ts ? new Date(ts).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                  <span className="flex items-center gap-1 truncate" style={{ color: "var(--th-text-secondary)" }}>
                    {l.hasSensitiveData && <ShieldAlert size={11} className="shrink-0 text-amber-500" />}
                    <span className="truncate">{l.user?.email || (l.userEmail && l.userEmail !== "system" ? l.userEmail : "—")}</span>
                    <span className="opacity-50">· {l.userRole}</span>
                  </span>
                  <span className="font-mono" style={{ color: "var(--th-text-primary)" }}>{l.action ?? "—"}</span>
                  <span className="truncate font-mono" style={{ color: "var(--th-text-muted)" }}>{l.method} {l.endpoint}</span>
                  <Badge variant={bad ? "coral" : "verdant"}>{l.statusCode ?? "—"}</Badge>
                </button>
              );
            })
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => load(page - 1)}>Previous</Button>
          <span className="self-center text-xs" style={{ color: "var(--th-text-faint)" }}>Page {page} of {totalPages}</span>
          <Button variant="secondary" disabled={page >= totalPages || loading} onClick={() => load(page + 1)}>Next</Button>
        </div>
      )}

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        icon={<div className="rounded-xl bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400"><ScrollText size={16} /></div>}
        title={<span className="font-mono">{detail?.action ?? "Audit entry"}</span>}
        subtitle={detail && (detail.timestamp ?? detail.createdAt) ? new Date(detail.timestamp ?? detail.createdAt!).toLocaleString("en-IN") : undefined}
        headerRight={detail && (
          <Badge variant={detail.status === "failure" || (detail.statusCode ?? 200) >= 400 ? "coral" : "verdant"}>{detail.statusCode ?? "—"}</Badge>
        )}
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid gap-x-6 sm:grid-cols-2">
              {([
                ["User", detail.user?.email || (detail.userEmail !== "system" ? detail.userEmail : "—")],
                ["Role", detail.userRole],
                ["Organization", detail.user?.organization],
                ["Resource", [detail.resourceType, detail.resourceId].filter(Boolean).join(" · ")],
                ["Status", `${detail.statusCode ?? "—"} · ${detail.status ?? "—"}`],
                ["Duration", detail.duration != null ? `${detail.duration} ms` : "—"],
                ["IP address", detail.ipAddress],
                ["Sensitive data", detail.hasSensitiveData ? "Yes" : "No"],
              ] as const).map(([label, value]) => (
                <DetailRow key={label} label={label}>{value || "—"}</DetailRow>
              ))}
            </div>

            <div className="rounded-lg border p-3 font-mono text-[11px] break-all" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-bg-tertiary)", color: "var(--th-text-secondary)" }}>
              {detail.method} {detail.endpoint}
            </div>

            {detail.errorMessage && (
              <div className="rounded-lg border border-rose-500/25 bg-rose-500/5 p-3 text-xs text-rose-600 dark:text-rose-400">{detail.errorMessage}</div>
            )}

            {detail.details && Object.keys(detail.details).length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--th-text-faint)" }}>Details</p>
                <pre className="overflow-x-auto rounded-lg border p-3 text-[11px] leading-relaxed" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-bg-tertiary)", color: "var(--th-text-secondary)" }}>
                  {JSON.stringify(detail.details, null, 2)}
                </pre>
              </div>
            )}

            {detail.userAgent && (
              <p className="text-[10px] leading-relaxed" style={{ color: "var(--th-text-faint)" }}>{detail.userAgent}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
