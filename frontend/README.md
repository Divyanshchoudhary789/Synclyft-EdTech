# Synclyft Frontend — Monorepo

Three independently-deployed Next.js apps that share one design system and API layer.

```
frontend/
├── apps/
│   ├── student/   → student.synclyft.*   (port 3000)  — landing, dashboard, mock interviews, resume, billing
│   ├── officer/   → officer.synclyft.*   (port 3001)  — college B2B landing, placement-cell portal
│   └── admin/     → admin.synclyft.*     (port 3002)  — super-admin console (noindex)
└── packages/
    ├── ui/        @synclyft/ui     — design system, shared components, AppProviders, LoginForm, globals.css
    ├── lib/       @synclyft/lib    — axios client (auth-refresh interceptor), zustand stores, theme, types, utils
    └── tsconfig/  @synclyft/tsconfig
```

Shared packages are consumed **as source** via `transpilePackages` — no build step, no version drift.

## Local development

```bash
npm install                 # from frontend/  (npm workspaces)
npm run dev                  # all three apps via turbo
npm run dev:student          # or just one
npm run dev:officer
npm run dev:admin
```

| App     | Dev URL                 |
|---------|-------------------------|
| student | http://localhost:3000   |
| officer | http://localhost:3001   |
| admin   | http://localhost:3002   |

## Environment

Each app reads a single public var (`apps/<app>/.env`):

```
NEXT_PUBLIC_Backend_URL=https://<backend-host>/api      # MUST include the /api suffix
# NEXT_PUBLIC_SOCKET_URL=https://<backend-host>         # optional; defaults to backend origin
```

## Build

```bash
npm run build                # turbo builds all apps
npm run typecheck            # tsc --noEmit per workspace
```

## Deploying to Vercel (one project per app)

Create **three** Vercel projects, all pointing at this repo:

| Setting             | student                     | officer                     | admin                     |
|---------------------|-----------------------------|-----------------------------|---------------------------|
| Root Directory      | `frontend/apps/student`     | `frontend/apps/officer`     | `frontend/apps/admin`     |
| Install Command     | `npm install --prefix ../..` (or leave default; Vercel detects the workspace root) |
| Build Command       | `npm run build` (default)   | same                        | same                      |
| Output Directory    | `.next` (default)           | same                        | same                      |
| Env var             | `NEXT_PUBLIC_Backend_URL`   | same                        | same                      |

> With "Include source files outside of the Root Directory" enabled (default for detected monorepos), Vercel installs from the workspace root so `@synclyft/*` resolve.

Backend CORS (`FRONTEND_URL` / `CORS_ALLOWED_ORIGINS`) must list all three deployed origins.
Cookies are `SameSite=None; Secure` in production (cross-site: Vercel ↔ backend host).

## Route map

**student** — `/` landing · `/login` `/register` `/verify-otp` `/forgot-password` `/reset-password` · `/onboarding` · `/dashboard` `/progress` `/settings` · `/interview/setup` → `/interview/{aptitude,coding,technical,hr}` → `/interview/report` · `/practice/single-round` · `/resume` `/tools/ats-analyzer` `/tools/resumehistory` · `/subscription` `/billing` `/payment/success`

**officer** — `/` B2B landing · `/login` `/register` (college signup → approval) `/forgot-password` `/reset-password` · `/dashboard` + `/dashboard/{students,batches,campaigns,seats,analytics,reports,query,billing,settings}`

**admin** — `/login` · `/dashboard` (platform overview) · `/pending-colleges` `/organizations` `/subscriptions` `/audit-logs`

## Production checklist

- [ ] 3 Vercel projects created, Root Directory set per table above
- [ ] `NEXT_PUBLIC_Backend_URL` = `https://<backend>/api` on all 3 (the `/api` suffix is required)
- [ ] Backend: `NODE_ENV=production`, `CORS_ALLOWED_ORIGINS` = the 3 Vercel origins
- [ ] Backend: `JWT_SECRET` / `SESSION_SECRET` regenerated to 64+ random chars
- [ ] Backend: Judge0 `JUDGE0_URL` + `JUDGE0_AUTH_TOKEN` point at the Oracle VM
- [ ] Backend: `SENTRY_DSN` set (optional), `REDIS_URL` is `rediss://` (TLS)
- [ ] Google/GitHub/LinkedIn OAuth redirect URIs updated to the production backend
- [ ] Razorpay live keys + webhook URL `https://<backend>/api/webhooks/razorpay`
