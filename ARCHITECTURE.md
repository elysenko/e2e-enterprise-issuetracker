# Architecture

## Stack (fixed by platform)
This project's platform stack is **fixed** to `enterprise`: **Angular 19 (frontend) + NestJS + tRPC + Prisma + PostgreSQL (backend)**.

The technical plan attached to this run described a different stack (Node/Express + SQLite + React/Vite), but per the platform's stack contract, the FEATURES from that plan (issue tracker: auth, projects, issues, comments, admin) must be implemented on top of the fixed `enterprise` stack rather than by scaffolding an alternate stack. Downstream build agents should translate the plan's feature set (users/roles, projects, issues, comments, JWT-style auth) onto Angular + NestJS + tRPC + Prisma, not onto Express/SQLite.

## Requested vs. scaffolded
- Requested stack: `enterprise`
- Newly scaffolded: **yes** — no `frontend/` or `backend/` existed prior to this run (only a placeholder root `Dockerfile`, `index.html`, `nginx.conf`, `k8s/`, `kustomization.yaml`, and stub `README.md` were present).

## Layout
- `frontend/` — Angular 19 app (Angular CLI project `frontend`). Entry: `frontend/src/main.ts`, root component `frontend/src/app/app.component.ts` (carries `data-testid="app-ready"` — do not remove), `frontend/src/app/home/home.component.ts` demo page wired to the tRPC `users` router.
- `backend/` — NestJS app with `nestjs-trpc` (`backend/src/trpc/`), Prisma ORM (`backend/prisma/`), a demo `users` module, and a Terminus health check at `backend/src/health/` (`GET /health`).
- `.pipeline/surface.json` — generated contract of routes, components, and `data-testid`s for the test_spec/Playwright agents. Keep in sync as features are added.
- `.colossus-acceptance.json` — post-deploy render-gate contract (`ready_testid: app-ready`); `expect_text` is intentionally empty and must be filled in by the coder once the real front page content is known.
- `colossus.yaml` — build manifest read by deploy agents (Angular frontend, output `dist/frontend/browser`, NestJS backend on port 3001, backend `Dockerfile` at `backend/Dockerfile`).
- `docker-compose.yml` — local dev compose (Postgres + backend + frontend), copied from the template.
- Legacy root files present before scaffolding (`Dockerfile`, `index.html`, `nginx.conf`, `k8s/`, `kustomization.yaml`) belonged to the prior nginx static placeholder and are **not** part of the enterprise template's build path (`colossus.yaml` and `backend/Dockerfile` are authoritative). They were left untouched rather than deleted; a build/deploy agent should reconcile or remove them once the real k8s manifests are generated for this stack.

## Next steps for the developer / build agent
1. Set up backend env vars (`backend/.env` — no `.env.template` shipped in this template snapshot; check `backend/prisma/schema.prisma` / `backend/src/prisma/prisma.service.ts` for the expected `DATABASE_URL`).
2. `cd backend && npm install && npx prisma migrate dev` to create the Postgres schema (requires a running Postgres — see `docker-compose.yml`).
3. `cd frontend && npm install` then `npm start` for local dev; backend `npm run start:dev`.
4. Implement the issue-tracker feature set from the plan (users/roles, projects, project membership, issues, comments, admin views) as NestJS modules + tRPC routers + Prisma models, and Angular pages/components — following the plan's route/flow list but on this stack.
5. Update `.pipeline/surface.json` with every new route, component, and `data-testid` as features are built — the test_spec and Playwright agents rely on it being exhaustive.
6. Fill in `.colossus-acceptance.json`'s `expect_text` with real front-page content once the home page is replaced.
7. Reconcile/remove the legacy root `Dockerfile`/`nginx.conf`/`index.html`/`k8s/` placeholder files against the new `colossus.yaml` + `backend/Dockerfile` build path.

## Template source
- `enterprise` → `/app/scaffold-templates/template-enterprise/`
