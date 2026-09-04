/**
 * Maps a backend notification `actionUrl` onto a real route in the admin
 * console. Most notification types target students or college-admins, so many
 * links have no admin equivalent and resolve to `undefined` (no link). The
 * console's own routes and a few sensible fallbacks are kept.
 */

const KNOWN_PREFIXES = [
  "/analytics", "/audit-logs", "/organizations", "/pending-colleges",
  "/students", "/subscriptions", "/notifications", "/dashboard",
];

const EXACT_MAP: Record<string, string> = {
  "": "/dashboard",
  "/": "/dashboard",
  "/dashboard": "/dashboard",
  "/home": "/dashboard",
  "/overview": "/dashboard",
  "/subscription": "/subscriptions",
  "/subscriptions": "/subscriptions",
  "/billing": "/subscriptions",
  "/plans": "/subscriptions",
  "/organizations": "/organizations",
  "/organisation": "/organizations",
  "/colleges": "/organizations",
  "/pending-colleges": "/pending-colleges",
  "/approvals": "/pending-colleges",
  "/students": "/students",
  "/analytics": "/analytics",
  "/audit-logs": "/audit-logs",
  "/audit": "/audit-logs",
  "/logs": "/audit-logs",
  "/notifications": "/notifications",
};

export function resolveAdminHref(url?: string): string | undefined {
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

  // Student / college-admin deep links — nothing to open in the console.
  if (/^\/(student|college-admin|officer|interview)(\/|$)/.test(path)) return undefined;
  if (path === "/login") return undefined;

  if (EXACT_MAP[path]) return withQuery(EXACT_MAP[path]);

  if (/^\/subscriptions?\//.test(path)) return "/subscriptions";

  if (KNOWN_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) return withQuery(path);

  return "/dashboard";
}
