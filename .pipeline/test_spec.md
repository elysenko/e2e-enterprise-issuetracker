# Test Specification

> **WARNING — `surface.json` is stale/generic.** The committed `.pipeline/surface.json`
> describes an Angular + tRPC scaffold (`/health`, `/trpc/users.findAll`, `app-root`,
> `app-home`) that does **not** match this project (React + Vite SPA on Express + SQLite).
> Its routes are therefore ignored. The API surface below is derived from the approved
> spec and the surface contract in `.pipeline/tasks.md`, which are authoritative. The
> endpoint total in the coverage summary reflects that derived surface, not `surface.json`.

## Coverage summary
- Total cases: 78
- API endpoints covered: 20 / 20 (derived from spec + tasks.md; `surface.json` disregarded as stale)
- User journeys covered: 9

All paths below are shown without the deployment base path. In the browser the SPA is
served under `/e2e-enterprise-issuetracker/` and the API under
`/e2e-enterprise-issuetracker/api/...`; probes/tests may hit `/api/...` directly on `:8080`.
Auth is JWT Bearer (`Authorization: Bearer <token>`). Roles: first signup → `ADMIN`,
subsequent signups → `MEMBER`.

## API tests

### `GET /api/health`
- **Happy path**: no auth, no body → `200` with body `{ "status": "ok" }`.
- **Validation failures**: n/a (no inputs).
- **Auth failures**: none — endpoint is public; a request with no token still returns `200`.
- **Idempotency / edge cases**: reachable both directly on `:8080/api/health` and through the ingress prefix `/e2e-enterprise-issuetracker/api/health`; repeated calls return identical body.

### `GET /api/health/deep`
- **Happy path**: no auth → `200` with body reporting DB status, e.g. `{ "status": "ok", "db": "ok" }` (a trivial `SELECT 1` succeeds).
- **Validation failures**: n/a.
- **Auth failures**: none — public.
- **Idempotency / edge cases**: if the SQLite query throws, expect a non-ok status (`503` or `{ db: "error" }`); reachable direct and via prefix.

### `POST /api/auth/signup`
- **Happy path (first user)**: `{ email, password, name }` on an empty `users` table → `200/201` with `{ token, user }` where `user.role === "ADMIN"` and no `password_hash` is returned.
- **Happy path (second user)**: same shape after one user exists → `user.role === "MEMBER"`.
- **Validation failures**: missing/blank `email`, non-email `email`, missing `password`, too-short `password`, missing `name` → `400` (zod). Duplicate `email` (UNIQUE) → `409` (or `400`) with an error message; no second row created.
- **Auth failures**: n/a — public.
- **Idempotency / edge cases**: password is stored as a bcrypt hash, never plaintext; returned token verifies against `GET /api/auth/me`.

### `POST /api/auth/login`
- **Happy path**: `{ email, password }` matching an existing user → `200` with `{ token, user }`; token is a valid JWT.
- **Validation failures**: missing `email` or `password` → `400`.
- **Auth failures**: unknown email → `401`; wrong password for known email → `401`; error message must not reveal which field was wrong.
- **Idempotency / edge cases**: login for an ADMIN and a MEMBER both succeed and return their correct `role`.

### `GET /api/auth/me`
- **Happy path**: valid Bearer token → `200` with the caller's user (`id, email, name, role`), no `password_hash`.
- **Validation failures**: n/a.
- **Auth failures**: no `Authorization` header → `401`; malformed/garbage token → `401`; expired/invalid-signature token → `401`.
- **Idempotency / edge cases**: token issued by signup and token issued by login both resolve to the same user.

### `GET /api/projects`
- **Happy path (ADMIN)**: `200` returning **all** projects.
- **Happy path (MEMBER)**: `200` returning **only** projects the caller joined via `project_members`; a project the member is not in must not appear.
- **Validation failures**: n/a.
- **Auth failures**: no token → `401`.
- **Idempotency / edge cases**: MEMBER with zero memberships → `200` with `[]`.

### `POST /api/projects`
- **Happy path (ADMIN)**: `{ name, description? }` → `200/201` with created project (`id`, `name`, `created_by` = admin id).
- **Validation failures**: missing/blank `name` → `400`.
- **Auth failures**: no token → `401`; valid MEMBER token → `403` (admin-only); no project created.
- **Idempotency / edge cases**: two projects with the same name are allowed unless the spec forbids it (spec is silent → allowed).

### `GET /api/projects/:id`
- **Happy path**: ADMIN, or a MEMBER of the project → `200` with the project.
- **Validation failures**: non-numeric/nonexistent `:id` → `404`.
- **Auth failures**: no token → `401`; MEMBER who is not a member of the project → `403` (or `404` to avoid existence leak).
- **Idempotency / edge cases**: membership check is enforced even though the id exists.

### `GET /api/projects/:id/members`
- **Happy path**: ADMIN or a project member → `200` with a list of members (`user id`, `name`, `email`/`role`).
- **Validation failures**: nonexistent project → `404`.
- **Auth failures**: no token → `401`; non-member MEMBER → `403`.
- **Idempotency / edge cases**: newly created project with only its creator (or none) returns a well-formed list.

### `POST /api/projects/:id/members`
- **Happy path (ADMIN)**: `{ userId }` → `200/201`; the user now appears in `GET .../members` and, for that user, the project appears in their `GET /api/projects`.
- **Validation failures**: missing `userId` → `400`; unknown `userId` → `400/404`; nonexistent project → `404`.
- **Auth failures**: no token → `401`; MEMBER token → `403`.
- **Idempotency / edge cases**: adding an already-member user must not create a duplicate row (composite PK `(project_id,user_id)`) — expect `200`/no-op or `409`, never a 500.

### `GET /api/projects/:id/issues?status=`
- **Happy path**: member/ADMIN, no filter → `200` with all issues in the project. With `?status=RESOLVED` → only `RESOLVED` issues; `?status=OPEN` and `?status=IN_PROGRESS` similarly scoped.
- **Validation failures**: invalid `status` value (e.g. `?status=DONE`) → `400` (or ignored/empty per implementation — assert 400 preferred); nonexistent project → `404`.
- **Auth failures**: no token → `401`; non-member MEMBER → `403`.
- **Idempotency / edge cases**: results are project-scoped only (no issues from other projects leak in); empty project → `[]`.

### `POST /api/projects/:id/issues`
- **Happy path**: member/ADMIN, `{ title, description?, priority? }` → `200/201` with issue where `status === "OPEN"` and `priority === "MEDIUM"` when omitted; `created_by` = caller; `assignee_id` null.
- **Validation failures**: missing/blank `title` → `400`; `priority` outside `LOW|MEDIUM|HIGH` → `400`; nonexistent project → `404`.
- **Auth failures**: no token → `401`; non-member MEMBER → `403`.
- **Idempotency / edge cases**: created issue immediately appears in `GET .../issues` and under the `?status=OPEN` filter.

### `GET /api/issues/:id`
- **Happy path**: member/ADMIN → `200` with full issue detail (title, description, priority, status, assignee_id, timestamps).
- **Validation failures**: nonexistent `:id` → `404`.
- **Auth failures**: no token → `401`; MEMBER not in the issue's project → `403` (or `404`).
- **Idempotency / edge cases**: membership is evaluated against the issue's parent project.

### `PATCH /api/issues/:id`
- **Happy path (assign)**: `{ assignee_id }` set to a project member → `200`; subsequent GET shows the new assignee.
- **Happy path (status)**: `{ status: "IN_PROGRESS" }` then `{ status: "RESOLVED" }` → `200`; `updated_at` is bumped and greater than `created_at`.
- **Happy path (edit fields)**: `{ title, description, priority }` → `200` with updated values.
- **Validation failures**: `status` not in enum → `400`; `priority` not in enum → `400`; `assignee_id` referencing a non-member/unknown user → `400/422`; empty `title` on edit → `400`.
- **Auth failures**: no token → `401`; non-member MEMBER → `403`.
- **Idempotency / edge cases**: setting `assignee_id` to null unassigns; after `status=RESOLVED`, the issue drops out of the `?status=OPEN` list and into `?status=RESOLVED`.

### `GET /api/dashboard/issues`
- **Happy path**: `200` with issues aggregated across all projects the caller belongs to (ADMIN sees issues across all/owned projects per implementation).
- **Validation failures**: n/a.
- **Auth failures**: no token → `401`.
- **Idempotency / edge cases**: MEMBER with no projects → `[]`; issues from projects the caller is not in must not appear.

### `GET /api/issues/:id/comments`
- **Happy path**: member/ADMIN → `200` with comments joined to author `name`, ordered chronologically, and nested: top-level comments plus replies grouped under their `parent_id`.
- **Validation failures**: nonexistent issue → `404`.
- **Auth failures**: no token → `401`; non-member MEMBER → `403`.
- **Idempotency / edge cases**: issue with no comments → `[]`; a reply's `parent_id` matches an existing top-level comment.

### `POST /api/issues/:id/comments`
- **Happy path (top-level)**: `{ body }` → `200/201`; comment records `author_id` = caller and a `created_at` timestamp; appears in the thread.
- **Happy path (reply)**: `{ body, parentId }` referencing an existing comment → nested under that parent (one level).
- **Validation failures**: missing/blank `body` → `400`; `parentId` referencing a nonexistent comment → `400/404`; nonexistent issue → `404`.
- **Auth failures**: no token → `401`; non-member MEMBER → `403`.
- **Idempotency / edge cases**: replying to a reply should still resolve to one visible level of threading (spec: one-level threading).

### `GET /api/admin/settings`
- **Happy path (ADMIN)**: `200` listing service/credential keys for `postgresql` and `minio` with **masked** values and a `configured` boolean per key.
- **Validation failures**: n/a.
- **Auth failures**: no token → `401`; MEMBER token → `403`.
- **Idempotency / edge cases**: raw secret values are never returned in cleartext; unconfigured keys report `configured: false`.

### `PATCH /api/admin/settings`
- **Happy path (ADMIN)**: `{ key: value, ... }` upsert → `200`; a subsequent `GET /api/admin/settings` shows the affected keys as `configured: true`.
- **Validation failures**: unknown/empty key or non-object body → `400`.
- **Auth failures**: no token → `401`; MEMBER token → `403`.
- **Idempotency / edge cases**: re-PATCHing the same key updates the value and `updated_at`, without creating duplicate rows (`key` is PK).

### `GET /api/users`  *(admin user listing — backs AdminUsersPage)*
- **Happy path (ADMIN)**: `200` with all users (`id, email, name, role`), no `password_hash`.
- **Validation failures**: n/a.
- **Auth failures**: no token → `401`; MEMBER token → `403`.
- **Idempotency / edge cases**: list includes the ADMIN itself.

### `PATCH /api/users/:id`  *(role management — backs AdminUsersPage)*
- **Happy path (ADMIN)**: `{ role: "ADMIN" | "MEMBER" }` → `200`; the target user's role changes and is reflected in `GET /api/users`.
- **Validation failures**: `role` not in `ADMIN|MEMBER` → `400`; nonexistent `:id` → `404`.
- **Auth failures**: no token → `401`; MEMBER token → `403`.
- **Idempotency / edge cases**: an admin demoting the last remaining admin — spec is silent; assert no 500 (behaviour under "Out of scope").

## UI / journey tests

### Journey: signup *(flow: signup, route `/signup`, public)*
- **Steps**: navigate to `/signup` → fill name, email, password → submit.
- **Expected outcomes**: on success token is stored in `localStorage`, `me` populated, redirect to `/dashboard`; the very first account created is ADMIN (admin nav links visible), a later account is MEMBER (admin links hidden). Page root carries `data-flow="signup"`.
- **Negative path**: duplicate email or invalid input shows an inline error and stays on `/signup`; no token stored.

### Journey: login *(flow: login, route `/login`, public)*
- **Steps**: navigate to `/login` → enter credentials → submit.
- **Expected outcomes**: valid credentials → token stored → redirect to `/dashboard`; `data-flow="login"` present.
- **Negative path**: wrong credentials show an error message and remain on `/login`; visiting a guarded route while unauthenticated redirects to `/login`.

### Journey: dashboard *(flow: dashboard, route `/dashboard`, auth)*
- **Steps**: authenticate → land on `/dashboard`.
- **Expected outcomes**: shows issues across the caller's projects (from `GET /api/dashboard/issues`); loading state while fetching, empty state when none, `data-flow="dashboard"` present.
- **Negative path**: API 401 → redirect to `/login`; API error → visible error state.

### Journey: projects-list *(flow: projects-list, route `/projects`, auth)*
- **Steps**: navigate to `/projects`.
- **Expected outcomes**: MEMBER sees only joined projects; ADMIN sees all; clicking a project navigates to `/projects/:projectId`. Loading/empty/error states present; `data-flow="projects-list"`.
- **Negative path**: empty list shows empty state (not a crash); API error shows error state.

### Journey: project-issues *(flow: project-issues, route `/projects/:projectId`, auth)*
- **Steps**: open a project → observe issue list → apply status filter (`?status=OPEN|IN_PROGRESS|RESOLVED`) → open New Issue modal (`?modal=new-issue`) → submit a new issue.
- **Expected outcomes**: issue list is project-scoped; changing the filter updates the list and the `?status=` query param; the new issue is created with status OPEN and appears in the list. Deep-linking `/projects/:id?status=RESOLVED&modal=new-issue` after a full reload restores both the filter and the open modal. `data-flow="project-issues"`.
- **Negative path**: submitting the modal with a blank title shows validation error; server error keeps the modal open with an error message.

### Journey: issue-detail *(flow: issue-detail, route `/projects/:projectId/issues/:issueId`, auth)*
- **Steps**: open an issue → change status via StatusControl → open assign modal (`?modal=assign`) and pick an assignee from the project members → add a comment → reply to that comment.
- **Expected outcomes**: status change persists (PATCH) and updates the badge; assignee dropdown lists **project members** and the chosen assignee's name shows on the issue; a posted comment appears with author name + timestamp; a reply nests one level under its parent. Deep-link `.../issues/:issueId?modal=assign` after reload reopens the assign modal. `data-flow="issue-detail"`.
- **Negative path**: empty comment body is rejected inline; PATCH failure surfaces an error and leaves prior state intact.

### Journey: admin-projects *(flow: admin-projects, route `/admin/projects`, RequireAdmin)*
- **Steps**: as ADMIN navigate to `/admin/projects` → create a project → add a member to it.
- **Expected outcomes**: project is created and listed; added member appears in the project's members and, for that member, the project appears in their `/projects`. `data-flow="admin-projects"`.
- **Negative path**: a MEMBER navigating to `/admin/projects` is blocked/redirected (guard); blank project name shows validation error.

### Journey: admin-users *(flow: admin-users, route `/admin/users`, RequireAdmin)*
- **Steps**: as ADMIN open `/admin/users` → view user list → change a user's role.
- **Expected outcomes**: all users listed with role; changing a role persists and re-renders. `data-flow="admin-users"`.
- **Negative path**: MEMBER access is blocked/redirected by RequireAdmin.

### Journey: admin-settings *(flow: admin-settings, route `/admin/settings`, RequireAdmin)*
- **Steps**: as ADMIN open `/admin/settings` → view `postgresql` and `minio` service entries → fill a credential form → save.
- **Expected outcomes**: each service shows a configured/unconfigured badge; saving persists via `PATCH /api/admin/settings` and flips the badge to configured; values render masked. `data-flow="admin-settings"`.
- **Negative path**: MEMBER access blocked/redirected; save failure shows an error.

### Cross-cutting: routing / deep-link + SPA fallback
- **Steps**: for each route (`/login`, `/signup`, `/dashboard`, `/projects`, `/projects/:id`, `/projects/:id/issues/:iid`, `/admin/projects`, `/admin/users`, `/admin/settings`, including `?status=` and `?modal=` variants) perform a full browser reload through the ingress prefix `/e2e-enterprise-issuetracker/...`.
- **Expected outcomes**: Express SPA fallback serves `index.html`, the router `basename` resolves the path, assets load under the base path, and query-param state (`status`, `modal`) restores. `/` redirects to `/dashboard`.
- **Negative path**: an unknown `/api/*` path returns a JSON `404` from the API router (not the SPA HTML fallback).

## Data integrity tests
- After signup: exactly one `users` row per email (`email` UNIQUE enforced); `password_hash` is a bcrypt hash, never plaintext; the first-ever user has `role = ADMIN`, all later users `MEMBER`.
- After `POST /api/projects`: one `projects` row with `created_by` = the admin's id.
- After `POST /api/projects/:id/members`: one `project_members` row; re-adding the same `(project_id,user_id)` never creates a duplicate (composite PK holds).
- After `POST /api/projects/:id/issues`: one `issues` row with `status = OPEN`, `priority = MEDIUM` (defaults), `assignee_id` NULL, `created_at = updated_at` at creation.
- After `PATCH /api/issues/:id`: mutated columns change, `updated_at` strictly increases, and `assignee_id` (when set) references a user who is a member of the issue's project.
- After `POST /api/issues/:id/comments`: one `comments` row with `author_id` = caller, a `created_at` timestamp, and `parent_id` either NULL (top-level) or a valid existing comment id (reply).
- After `PATCH /api/admin/settings`: one `SystemSetting` row per key (`key` PK); repeated writes update `value`/`updated_at` in place without duplicates.
- Referential integrity: issues belong to exactly one project; comments belong to exactly one issue; deleting/absent parents never leaves orphaned rows queried by the read endpoints.

## Out of scope
- **Data persistence across restarts** — SQLite is ephemeral (no PVC); the spec accepts data loss on pod restart, so persistence is not tested (only that signup can recreate an admin on a fresh DB).
- **Actual connectivity to `postgresql` / `minio`** — the spec's stack is embedded SQLite and defines no behaviour that consumes these provisioned services; only the admin-settings CRUD/masking is tested, not live connections (open question flagged in `tasks.md`).
- **Third-party integrations** — spec declares "Integrations: None"; nothing to test.
- **JWT expiry/refresh semantics and token TTL** — spec does not define an expiry policy; only accept-valid / reject-invalid is tested.
- **Rate limiting, CSRF, password-reset, email verification** — not in scope of the spec.
- **Demoting the last admin / self-role-change edge cases** — spec is silent on guardrails; asserted only to not 500.
- **`surface.json` scaffold routes** (`/trpc/users.*`, Angular components) — stale artifact, not part of this application.
- **Docker/native-build verification** (`better-sqlite3` compiles, image serves on 8080) — an infra/build check, exercised by the pipeline's build step rather than as an application test case.
