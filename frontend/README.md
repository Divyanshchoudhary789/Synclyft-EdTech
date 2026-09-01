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
