# QANAKAGON Think Fast. Calculate Faster.

A fast mobile math game where players choose an operation and difficulty, solve as many problems as possible in four minutes, and review their personal scores.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/math-challenge/app/index.tsx` — first playable game flow, question engine, timer, scoring, local history, and leaderboard placeholder.
- `artifacts/math-challenge/constants/colors.ts` — light and dark semantic theme tokens.
- `artifacts/math-challenge/assets/images/icon.png` — generated app icon.
- `lib/api-spec/openapi.yaml` — shared API contract, currently unchanged while the first build uses local persistence.

## Architecture decisions

- The first milestone is frontend-first and uses AsyncStorage for local score history so the game can be tested on an iPhone without paid backend services.
- The game engine keeps operation and digit ranges centralized and generates division questions with whole-number answers.
- Public rankings are intentionally labeled as a future phase; competitive scores must be server-validated before being shown publicly.
- The Expo app uses one root route with local screen state for setup, gameplay, results, score history, and leaderboard preview.

## Product

- Select addition, subtraction, multiplication, or division.
- Select one through four digit difficulty.
- Play a timed 240-second round with rapid numeric answer entry.
- See correct answers, accuracy, attempted, missed, and personal-best results.
- Review locally saved score history.
- Preview the planned category-based leaderboard experience.

## User preferences

- Keep paid services optional until the game needs them for accounts, secure rankings, or store release.

## Gotchas

- Expo Go can run the current playable build from the Replit phone preview without a Mac.
- The React Native DevTools helper may log a missing GLib library in this environment; Metro still starts and the app preview remains available.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
