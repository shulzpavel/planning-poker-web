# planning-poker-web

React/Vite SPA: CMS admin, manager cockpit, participant voting links, retrospectives.

**Local:** http://localhost:5173 (`npm run dev`) or http://localhost:3001 (compose/nginx)

## Role in the stack

| Owns | Does **not** |
|---|---|
| UI routes, loading/error/empty states | Business logic (scope metrics, RBAC, Jira) |
| Typed API clients (`cmsClient.ts`, …) | Secrets in localStorage (CMS uses httpOnly cookie) |
| WebSocket clients for live sessions | Direct Jira calls |

Canonical docs: [planning-poker-dev/docs/TECHNICAL.md](https://github.com/shulzpavel/planning-poker-dev/blob/main/docs/TECHNICAL.md)

## Documentation

| Doc | Topic |
|---|---|
| [contracts/API.md](https://github.com/shulzpavel/planning-poker-dev/blob/main/docs/contracts/API.md) | Backend endpoints |
| [development/GUIDE.md](https://github.com/shulzpavel/planning-poker-dev/blob/main/docs/development/GUIDE.md) | UI patterns, buttons, mobile CMS, list pagination |
| [development/LISTS.md](https://github.com/shulzpavel/planning-poker-dev/blob/main/docs/development/LISTS.md) | Cursor pagination (`LIST_PAGE_SIZE=10`) |

## Run locally

```bash
npm ci
npm run dev
```

With full stack (API + cookie auth):

```bash
# from planning-poker-dev
docker compose up -d web voting-service
```

Set `VITE_API_BASE` for non-default API host — see `src/app/config.ts`.

## Routes

| Path | Feature |
|---|---|
| `/cms` | CMS admin (overview, planner, sessions, scope, retro, users) |
| `/manage` | Manager session list |
| `/cms/sessions/:id/cockpit` | Manager cockpit |
| `/s/:token` | Participant voting |
| `/r/:token` | Participant retro |
| `/demo` | Demo without Jira |

Navigation source of truth: `src/features/cms/navigation.ts`.

## Layout

```text
src/features/cms/     CMS pages (scope, sessions, planner, retro, …)
src/features/manager/ Manager cockpit
src/shared/api/       HTTP helpers, ApiError
src/design-system/    Shared UI components
src/hooks/            useRealtimeChannel, list paging hooks
```

## Rules

- All CMS calls via `cmsFetch` / domain APIs with `credentials: "include"`.
- List APIs: `useCmsList` + explicit «Показать ещё» — no auto-fetch all pages.
- 401 → clear auth hint; 409 session conflict → refetch + retry once.
- Reuse design-system `Button` intents — delete always goes through built-in confirm.

## Tests

```bash
npm run test        # vitest
npm run test:e2e    # Playwright smoke
npm run build       # production build
```

From `planning-poker-dev`: `make frontend-test`, `make frontend-e2e`, `make check`.

Push to `main` deploys web via `planning-poker-dev` CI or service-repo workflow when wired.

Scope/CMS backend changes usually require **both** voting-service and web deploy — see [GUIDE.md](https://github.com/shulzpavel/planning-poker-dev/blob/main/docs/development/GUIDE.md).

## Related repos

- [planning-poker-voting-service](https://github.com/shulzpavel/planning-poker-voting-service) — API backend
- [planning-poker-dev](https://github.com/shulzpavel/planning-poker-dev) — compose, Caddy, deploy scripts
