# Planning Poker — Web

React/Vite SPA for manager cockpit, participant voting, CMS, and retrospectives.

## Documentation

Central docs in [planning-poker-dev/docs](https://github.com/shulzpavel/planning-poker-dev/tree/main/docs):

- [TECHNICAL.md](https://github.com/shulzpavel/planning-poker-dev/blob/main/docs/TECHNICAL.md) — developer entry point
- [contracts/API.md](https://github.com/shulzpavel/planning-poker-dev/blob/main/docs/contracts/API.md) — HTTP endpoints
- [development/GUIDE.md](https://github.com/shulzpavel/planning-poker-dev/blob/main/docs/development/GUIDE.md) — best practices

## Run locally

```bash
npm ci
npm run dev
```

Default: http://localhost:5173 (or via compose: http://localhost:3001).

## Key routes

| Path | Feature |
|---|---|
| `/cms` | CMS admin (overview, planner, sessions, scope, retro, access) |
| `/cms/sessions/:id/cockpit` | Manager cockpit |
| `/s/:token` | Participant voting |
| `/r/:token` | Participant retro |
| `/demo` | Demo session without Jira |

CMS navigation source of truth: `src/features/cms/navigation.ts`.

Scope board UI: `src/features/cms/scope/**`.

## Tests

```bash
npm run test       # vitest
npm run test:e2e   # Playwright smoke
npm run build      # production build
```

From dev repo: `make frontend-test`, `make frontend-e2e`, `make frontend-build`.
