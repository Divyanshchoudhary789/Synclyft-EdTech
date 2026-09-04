/**
 * Backend notifications carry `actionUrl` values written before the monorepo
 * split — legacy `/student/*` prefixes and routes that no longer exist as pages.
 * This maps any of them onto a real route in THIS app so every notification
 * link lands somewhere valid. Unknown internal paths fall back to /dashboard.
 */

/** Real, navigable route prefixes in the student app. */
const KNOWN_PREFIXES = [
  "/dashboard", "/progress", "/campaigns", "/study-plan", "/resume", "/settings",
  "/billing", "/subscription", "/notifications", "/tools/ats-analyzer",
  "/tools/resumehistory", "/interview", "/practice/single-round", "/pricing", "/onboarding",
];

/** Exact legacy path → real route. */
const EXACT_MAP: Record<string, string> = {
  "": "/dashboard",
  "/": "/dashboard",
  "/dashboard": "/dashboard",
  "/home": "/dashboard",
  "/interviews": "/progress",
  "/interview": "/interview/setup",
  "/interview/results": "/interview/report",
  "/interview/result": "/interview/report",
  "/results": "/progress",
  "/result": "/progress",
  "/achievements": "/progress",
  "/recommendations": "/study-plan",
  "/study-plans": "/study-plan",
  "/campaigns": "/campaigns",
  "/placements": "/campaigns",
  "/subscriptions": "/subscription",
  "/subscription": "/subscription",
  "/plans": "/subscription",
  "/billing": "/billing",
  "/invoices": "/billing",
  "/payments": "/billing",
  "/settings": "/settings",
  "/profile": "/settings",
  "/account": "/settings",
  "/notifications": "/notifications",
  "/study-plan": "/study-plan",
  "/resume": "/resume",
  "/progress": "/progress",
};

export function resolveStudentHref(url?: string): string | undefined {
  if (!url) return undefined;
  const raw = url.trim();
  if (!raw) return undefined;

  // Absolute external links pass through untouched.
  if (/^https?:\/\//i.test(raw)) return raw;
  // Not a path we can reason about — don't render a dead link.
  if (!raw.startsWith("/")) return undefined;

  const hash = raw.match(/#.*$/)?.[0] ?? "";
  const search = raw.replace(hash, "").match(/\?.*$/)?.[0] ?? "";
  let path = raw.replace(hash, "").replace(search, "");

  // Strip the legacy role prefix: /student/foo -> /foo
  path = path.replace(/^\/student(?=\/|$)/, "") || "/dashboard";
  path = path.replace(/\/+$/, "") || "/dashboard";

  const withQuery = (p: string) => p + search + hash;

  if (EXACT_MAP[path]) return withQuery(EXACT_MAP[path]);

  // /campaigns/:id  → the list page with the drawer pre-opened
  const camp = path.match(/^\/campaigns\/([A-Za-z0-9]{6,})$/);
  if (camp) return `/campaigns?c=${camp[1]}`;

  // /subscriptions/details/:id  → the subscription page
  if (/^\/subscriptions?\/(details?|view)\//.test(path)) return "/subscription";

  // /study-plan/:id  → keep (real dynamic route)
  if (/^\/study-plan\/[A-Za-z0-9]+$/.test(path)) return withQuery(path);

  // Known section — keep as-is.
  if (KNOWN_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) return withQuery(path);

  // Unknown internal path — send somewhere real rather than 404.
  return "/dashboard";
}
