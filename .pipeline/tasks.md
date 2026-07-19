# Pipeline Task Decomposition

## Summary
A full-stack team Issue Tracker delivered as a single Node/Express + SQLite backend that serves a React (Vite/TypeScript) SPA from one container on port 8080, replacing the current nginx static placeholder. Users sign up (first user becomes ADMIN, subsequent users MEMBER), authenticate via JWT Bearer tokens, and work with projects, issues (priority + status), assignees drawn from project members, and one-level-threaded comments. Admins manage projects, project membership, and users. The app is served under the hardcoded base path `/e2e-enterprise-issuetracker/`.

## Surface contract

### Backend API routes
- `POST /api/auth/signup` — create user (first → ADMIN, else MEMBER); returns JWT + user *(public)*
- `POST /api/auth/login` — returns JWT + user *(public)*
- `GET /api/auth/me` — current user *(auth)*
- `GET /api/health` — `{status:'ok'}` *(public)*
- `GET /api/health/deep` — runs trivial SQLite query, reports DB status *(public)*
- `GET /api/projects` — ADMIN → all; MEMBER → joined only *(auth)*
- `POST /api/projects` — create project *(admin)*
- `GET /api/projects/:id` — single project, membership-checked *(auth)*
- `GET /api/projects/:id/members` — list members *(auth, membership)*
- `POST /api/projects/:id/members` — add member *(admin)*
- `GET /api/projects/:id/issues?status=` — issues in project, filtered, membership-checked *(auth)*
- `POST /api/projects/:id/issues` — create issue (default status OPEN, priority MEDIUM) *(auth, membership)*
- `GET /api/issues/:id` — issue detail *(auth, membership)*
- `PATCH /api/issues/:id` — assign `assignee_id`, change `status`, edit fields; updates `updated_at` *(auth, membership)*
- `GET /api/dashboard/issues` — issues across caller's projects *(auth)*
- `GET /api/issues/:id/comments` — comments joined with author name, ordered, nested by `parent_id` *(auth, membership)*
- `POST /api/issues/:id/comments` — `{body, parentId?}`; records author + timestamp *(auth, membership)*
- `GET /api/admin/settings` — list service/credential keys with masked values + configured status *(admin)*
- `PATCH /api/admin/settings` — upsert key-value pairs *(admin)*

### Client routes / screens (SPA, basename `/e2e-enterprise-issuetracker`)
- `/login` → LoginPage *(public, flow: login)*
- `/signup` → SignupPage *(public, flow: signup)*
- `/` → redirect `/dashboard`
- `/dashboard` → DashboardPage *(auth, flow: dashboard)*
- `/projects` → ProjectsPage *(auth, flow: projects-list)*
- `/projects/:projectId` → ProjectIssuesPage; `?status=` filter + `?modal=new-issue` *(auth, flow: project-issues)*
- `/projects/:projectId/issues/:issueId` → IssueDetailPage; `?modal=assign` *(auth, flow: issue-detail)*
- `/admin/projects` → AdminProjectsPage *(RequireAdmin, flow: admin-projects)*
- `/admin/users` → AdminUsersPage *(RequireAdmin, flow: admin-users)*
- `/admin/settings` → AdminSettingsPage *(RequireAdmin, flow: admin-settings)*

### Entities
- `users(id, email UNIQUE, password_hash, name, role, created_at)`
- `projects(id, name, description, created_by, created_at)`
- `project_members(project_id, user_id, PRIMARY KEY(project_id,user_id))`
- `issues(id, project_id, title, description, priority LOW|MEDIUM|HIGH default MEDIUM, status OPEN|IN_PROGRESS|RESOLVED default OPEN, assignee_id NULL, created_by, created_at, updated_at)`
- `comments(id, issue_id, author_id, parent_id NULL, body, created_at)`
- `SystemSetting(key PK, value, updated_at)`

## db_agent tasks
- [ ] Create `server/schema.sql` with `users`, `projects`, `project_members`, `issues`, `comments` tables per the entity contract, using idempotent `CREATE TABLE IF NOT EXISTS`.
- [ ] Model `users` with a `role` column constrained to the `full_auth` role set (`ADMIN`, `MEMBER`); no default at DB level (role assigned by signup logic — first user ADMIN, rest MEMBER).
- [ ] Model `issues` with `priority` (`LOW|MEDIUM|HIGH`, default `MEDIUM`), `status` (`OPEN|IN_PROGRESS|RESOLVED`, default `OPEN`), nullable `assignee_id` FK → users, `created_by`, `created_at`, `updated_at`.
- [ ] Model `comments` with nullable `parent_id` (self-referential FK) to support one level of threading, `issue_id` FK, `author_id` FK, `body`, `created_at`.
- [ ] Model `project_members` join table with composite `PRIMARY KEY(project_id, user_id)`.
- [ ] Add `SystemSetting` table — `key String @id` (PK), `value String`, `updated_at` (updated on write) — for admin settings storage.
- [ ] Create `server/db.ts`: init `better-sqlite3` at `/app/data/issuetracker.db`, create `/app/data` if missing, run `schema.sql` on boot.

## backend_agent tasks
- [ ] Create `server/auth.ts`: bcrypt (`bcryptjs`) password hashing, `jsonwebtoken` sign/verify, `requireAuth` (verifies Bearer JWT) and `requireAdmin` (checks role) middleware.
- [ ] Create `server/routes/auth.ts`: `POST /api/auth/signup` (first user → ADMIN else MEMBER, bcrypt hash, return JWT+user), `POST /api/auth/login`, `GET /api/auth/me`; validate input with zod.
- [ ] Create `server/routes/health.ts`: `GET /api/health` → `{status:'ok'}`; `GET /api/health/deep` → trivial SQLite query + DB status; both public, mounted before auth.
- [ ] Create `server/routes/projects.ts`: `GET /api/projects` (ADMIN all / MEMBER joined), `POST /api/projects` (admin), `GET /api/projects/:id` (membership-checked), `GET`/`POST /api/projects/:id/members` (POST admin-only). Validate with zod.
- [ ] Create `server/routes/issues.ts`: `GET /api/projects/:id/issues?status=` (filtered, membership-checked), `POST /api/projects/:id/issues` (default OPEN/MEDIUM), `GET /api/issues/:id`, `PATCH /api/issues/:id` (assign/status/edit, bump `updated_at`), `GET /api/dashboard/issues`. Validate with zod.
- [ ] Create `server/routes/comments.ts`: `GET /api/issues/:id/comments` (joined with author name, ordered, nested by `parent_id`), `POST /api/issues/:id/comments` (`{body, parentId?}`, records author + timestamp). Validate with zod.
- [ ] Create `server/routes/users.ts`: admin user listing + role management backing `AdminUsersPage` (admin-guarded).
- [ ] Create `server/index.ts`: Express app with JSON body parsing, mount health (public) + `/api` router, `express.static('dist/client')`, SPA fallback `app.get('*', sendIndex)`, listen on `process.env.PORT || 8080`; ensure API 404s handled inside the api router before the SPA fallback.
- [ ] Generate `(admin)` route protection: all `/api/admin/*` and admin-only project/user mutations guarded by `requireAdmin`; admin can always authenticate via `/api/auth/login`.
- [ ] Create `lib/config.ts` with `resolveConfig(key: string): string | null` — reads `process.env[key]` first; if value equals `PLACEHOLDER_CONFIGURE_IN_SETTINGS` or is absent, reads from `SystemSetting` DB row; returns null if neither set.
- [ ] Create `GET /api/admin/settings` (list service keys for `postgresql` and `minio` with masked values + configured status) and `PATCH /api/admin/settings` (upsert key-value pairs, `requireAdmin`).
- [ ] Set up build config: `package.json` (deps + `dev`/`build`/`start` scripts), `vite.config.ts` (`base:'/e2e-enterprise-issuetracker/'`, `outDir:'dist/client'`, dev proxy `/api`), `tsconfig.json` + `tsconfig.server.json` (server outDir `dist/server`), `.gitignore`, `.dockerignore`.
- [ ] Create multi-stage `Dockerfile`: builder `node:20-slim` + build tools (`python3 make g++`) → `npm ci` + `npm run build`; runtime `node:20-slim` copying compiled `node_modules`/`dist`/`package.json`, `mkdir -p /app/data`, `ENV PORT=8080`, `EXPOSE 8080`, `CMD ["node","dist/server/index.js"]`. Delete `nginx.conf`.
- [ ] Update `README.md`: stack, dev/build/run, base-path deployment, ephemeral-data caveat. Replace `index.html` placeholder with Vite SPA entry (`<div id="root">` + module script).

## ui_agent tasks
- [ ] Create `src/main.tsx` (`<BrowserRouter basename="/e2e-enterprise-issuetracker">`) and `src/App.tsx` route table matching the Surface contract.
- [ ] Create `src/auth/AuthContext.tsx` (token in `localStorage`, `me` state, login/signup/logout) and guards `src/components/RequireAuth.tsx` + `RequireAdmin.tsx` (redirect unauthenticated → `/login`; non-admin blocked from admin routes).
- [ ] Create `src/components/AppLayout.tsx` — nav + logout (clears token); admin section links (`/admin/projects`, `/admin/users`, `/admin/settings`) visible only to admins.
- [ ] Build `LoginPage` (`/login`) and `SignupPage` (`/signup`) as public screens with forms, validation, and empty/loading/error states.
- [ ] Build `DashboardPage` (`/dashboard`) showing issues across the caller's projects, with loading/empty/error states.
- [ ] Build `ProjectsPage` (`/projects`) listing projects (ADMIN all / MEMBER joined) with empty/loading/error states.
- [ ] Build `ProjectIssuesPage` (`/projects/:projectId`) with `?status=` filter and `?modal=new-issue` `NewIssueModal`; each navigable state restores from its URL/query param.
- [ ] Build `IssueDetailPage` (`/projects/:projectId/issues/:issueId`) with `AssignControl` (`?modal=assign`, assignee dropdown from project members), `StatusControl` (Open/In Progress/Resolved), and threaded `CommentThread` (author name + timestamp, one-level replies).
- [ ] Build `AdminProjectsPage` (`/admin/projects`) — create projects + add members — and `AdminUsersPage` (`/admin/users`) — list users + role management. Both RequireAdmin.
- [ ] Build `AdminSettingsPage` (`/admin/settings`, RequireAdmin) — list each service in `postgresql`, `minio` with configured/unconfigured badge and per-service credential form, wired to `/api/admin/settings`.

## service_agent tasks
- [ ] Create `src/api/client.ts`: fetch wrapper; `API_BASE = import.meta.env.BASE_URL.replace(/\/$/,'') + '/api'`; attach `Authorization: Bearer` from stored token; on 401 redirect to `/login`.
- [ ] Add typed client methods for auth (signup/login/me) consumed by `AuthContext`.
- [ ] Add typed client methods for projects + members (list/create/get/list-members/add-member).
- [ ] Add typed client methods for issues (list by project with status filter, create, get, patch, dashboard issues).
- [ ] Add typed client methods for comments (list nested, create with optional `parentId`).
- [ ] Add typed client methods for admin settings (`GET`/`PATCH /api/admin/settings`) consumed by `AdminSettingsPage`.

## tester tasks
- [ ] Health: `GET /api/health` and `/api/health/deep` return ok (direct :8080 and via prefixed ingress).
- [ ] Auth: first signup → ADMIN, second → MEMBER; login returns JWT; unauthenticated dashboard → redirect to `/login`; guarded API returns 401 without token.
- [ ] Issues: create → status OPEN and appears in list; assign → assignee name shown; PATCH status to RESOLVED → appears under resolved filter.
- [ ] Comments: post → shows in thread with author name + timestamp; reply nests under parent.
- [ ] Projects: MEMBER sees only joined projects; selecting a project filters its issues; admin can create projects and add members.
- [ ] Routing: deep-link every route (incl. `?status=`, `?modal=`) after full reload through the ingress prefix — SPA fallback + `basename` resolve and state restores.
- [ ] Admin settings: `/admin/settings` lists `postgresql` and `minio` with configured/unconfigured badges; PATCH persists credentials and updates status.
- [ ] Build: `docker build` compiles the native `better-sqlite3` module and the image starts and serves on 8080.

## Open questions
- The spec's chosen stack is embedded SQLite ("no external DB or PVC"), but `<spec_deployments>` provisions `postgresql` and `minio`. Admin settings tasks were added per pipeline rules to surface/configure these services, but the spec defines no behaviour that consumes them. Downstream agents should confirm whether the app should actually connect to postgresql/minio or whether these provisioned services are unused for this SQLite-based build.
- `<spec_integrations>` contains only a placeholder ("None (per spec).") — no third-party integration client modules were created, consistent with the spec's "Integrations: None".
- Ephemeral data: with no PVC, SQLite resets on pod restart, requiring signup to recreate the admin. Confirm this is acceptable for the target environment (spec marks it acceptable for staging).
