/**
 * Maps a backend notification `actionUrl` onto a real route in the officer
 * portal. Backend links use legacy conventions (`/college-admin/*`, bare
 * `/billing`, `/subscriptions`) and some are student-only routes that this
 * portal doesn't have. Everything resolves to a valid `/dashboard/*` page or
 * to `undefined` (no link) when there's genuinely nowhere sensible to go.
 */

const KNOWN_PREFIXES = [
  "/dashboard/students", "/dashboard/batches", "/dashboard/campaigns", "/dashboard/seats",
  "/dashboard/analytics", "/dashboard/insights", "/dashboard/reports", "/dashboard/query",
  "/dashboard/billing", "/dashboard/settings", "/dashboard/notifications", "/dashboard",
];

const EXACT_MAP: Record<string, string> = {
  "": "/dashboard",
  "/": "/dashboard",
  "/dashboard": "/dashboard",
  "/home": "/dashboard",
  "/college-admin/dashboard": "/dashboard",
  "/college-admin": "/dashboard",
  "/officer/dashboard": "/dashboard",
  "/billing": "/dashboard/billing",
  "/invoices": "/dashboard/billing",
  "/payments": "/dashboard/billing",
  "/subscription": "/dashboard/billing",
  "/subscriptions": "/dashboard/billing",
  "/plans": "/dashboard/billing",
  "/students": "/dashboard/students",
  "/batches": "/dashboard/batches",
  "/campaigns": "/dashboard/campaigns",
  "/seats": "/dashboard/seats",
  "/analytics": "/dashboard/analytics",
  "/insights": "/dashboard/insights",
  "/reports": "/dashboard/reports",
  "/settings": "/dashboard/settings",
  "/profile": "/dashboard/settings",
  "/account": "/dashboard/settings",
  "/notifications": "/dashboard/notifications",
};

export function resolveOfficerHref(url?: string): string | undefined {
  if (!url) return undefined;
  const raw = url.trim();
  if (!raw) return undefined;

  if (/^https?:\/\//i.test(raw)) return raw;
  if (!raw.startsWith("/")) return undefined;

  const hash = raw.match(/#.*$/)?.[0] ?? "";
  const search = raw.replace(hash, "").match(/\?.*$/)?.[0] ?? "";
  let path = raw.replace(hash, "").replace(search, "");
  path = path.replace(/\/+$/, "") || "/dashboard";
  const withQuery = (p: string) => p + search + hash;

  // Student-only deep links — an officer has nowhere to open these.
  if (/^\/student(\/|$)/.test(path)) return undefined;

  if (EXACT_MAP[path]) return withQuery(EXACT_MAP[path]);

  // /subscriptions/details/:id and similar → billing
  if (/^\/subscriptions?\//.test(path)) return "/dashboard/billing";
  if (/^\/college-admin\//.test(path)) return "/dashboard";

  if (KNOWN_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) return withQuery(path);

  return "/dashboard";
}
