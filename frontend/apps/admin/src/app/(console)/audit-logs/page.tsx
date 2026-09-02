"use client";

import { useCallback, useEffect, useState } from "react";
import { superAdminService } from "@synclyft/lib/api/services";
import { API_BASE_URL, toApiError } from "@synclyft/lib/api";
import { Badge } from "@synclyft/ui/components/Badge";
import { SkeletonBlock } from "@synclyft/ui/components/SkeletonBlock";
import { Button } from "@synclyft/ui/components/Button";
import { AlertCircle, ScrollText, Download, Search } from "lucide-react";
import toast from "react-hot-toast";

interface Log {
  _id: string;
  userEmail?: string;
  userRole?: string;
  action?: string;
  resourceType?: string;
  method?: string;
  endpoint?: string;
  statusCode?: number;
  status?: string;
  timestamp?: string;
  createdAt?: string;
}

const ACTIONS = ["", "API_ACCESS", "ADMIN_ACTION", "DATA_EXPORT", "PROFILE_UPDATE", "REPORT_GENERATION", "AUTH", "LOGIN", "LOGOUT"];
const ROLES = ["", "student", "college-admin", "super-admin"];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{ action: string; userRole: string; search: string }>({ action: "", userRole: "", search: "" });
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { page: p, limit: 40 };
      if (filters.action) params.action = filters.action;
      if (filters.userRole) params.userRole = filters.userRole;
      if (filters.search.trim()) params.search = filters.search.trim();
      setLogs((await superAdminService.auditLogs(params)) as unknown as Log[]);
      setPage(p);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(1); }, [load]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>Audit log</h1>
          <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>Every privileged action on the platform</p>
        </div>
        <Button variant="secondary" icon={<Download size={13} />} loading={exporting} onClick={exportCsv}>Export CSV</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--th-text-faint)" }} />
          <input value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && load(1)}
            placeholder="Search email / endpoint…"
            className="pl-8 pr-3 py-1.5 rounded-lg border text-xs w-56"
            style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }} />
        </div>
        <select value={filters.action} onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
          className="px-2 py-1.5 rounded-lg border text-xs"
          style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }}>
          {ACTIONS.map((a) => <option key={a} value={a}>{a || "All actions"}</option>)}
        </select>
        <select value={filters.userRole} onChange={(e) => setFilters((f) => ({ ...f, userRole: e.target.value }))}
          className="px-2 py-1.5 rounded-lg border text-xs"
          style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }}>
          {ROLES.map((r) => <option key={r} value={r}>{r || "All roles"}</option>)}
        </select>
        <button onClick={() => load(1)} className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ backgroundColor: "var(--th-primary)", color: "#fff" }}>Apply</button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
          <AlertCircle size={16} className="text-amber-500" /> {error}
          <button onClick={() => load(page)} className="ml-auto text-blue-600 dark:text-blue-400 text-xs">Retry</button>
        </div>
      )}

      <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[1.5fr_2fr_1fr_2fr_0.7fr] px-6 py-3 text-[10px] font-bold uppercase tracking-wider border-b" style={{ borderColor: "var(--th-border)", color: "var(--th-text-faint)" }}>
            <span>Time</span><span>User</span><span>Action</span><span>Endpoint</span><span>Status</span>
          </div>
          {loading ? (
            <div className="p-6 space-y-3"><SkeletonBlock height="h-7" /><SkeletonBlock height="h-7" /><SkeletonBlock height="h-7" /></div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-xs" style={{ color: "var(--th-text-faint)" }}>
              <ScrollText size={22} className="mx-auto mb-2 opacity-40" /> No audit entries match.
            </div>
          ) : (
            logs.map((l) => {
              const ts = l.timestamp ?? l.createdAt;
              const bad = l.status === "failure" || (l.statusCode ?? 200) >= 400;
              return (
                <div key={l._id} className="grid grid-cols-[1.5fr_2fr_1fr_2fr_0.7fr] px-6 py-3 items-center border-b last:border-0 text-xs" style={{ borderColor: "var(--th-border)" }}>
                  <span className="font-mono" style={{ color: "var(--th-text-muted)" }}>{ts ? new Date(ts).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                  <span className="truncate" style={{ color: "var(--th-text-secondary)" }}>{l.userEmail ?? "—"} <span className="opacity-50">· {l.userRole}</span></span>
                  <span className="font-mono" style={{ color: "var(--th-text-primary)" }}>{l.action ?? "—"}</span>
                  <span className="font-mono truncate" style={{ color: "var(--th-text-muted)" }}>{l.method} {l.endpoint}</span>
                  <Badge variant={bad ? "coral" : "verdant"}>{l.statusCode ?? "—"}</Badge>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => load(page - 1)}>Previous</Button>
        <span className="text-xs self-center" style={{ color: "var(--th-text-faint)" }}>Page {page}</span>
        <Button variant="secondary" disabled={loading || logs.length < 40} onClick={() => load(page + 1)}>Next</Button>
      </div>
    </div>
  );
}
