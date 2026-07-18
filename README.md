# Sanskrit Shloka Learning

Приложение помощник в заучивании наизусть шлок (стихов) на санскрите

## Status

Initial product discovery / pre-MVP.

## Documentation

- Product spec: `.scratch/initial-product/spec.md`
- Domain language: `CONTEXT.md`
- Architecture decisions: `docs/adr/`
- Railway/Neon production runbook: `docs/operations/railway-production.md`

## Development

Package manager: `pnpm@11.5.0` via Corepack.

```sh
corepack enable pnpm
pnpm install
pnpm contract:generate
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

Playwright e2e tests need a local browser binary:

```sh
pnpm --filter @sanskrit-shloka-learning/web exec playwright install chromium
```

API local environment:

```sh
cp apps/api/.env.example apps/api/.env.local
```

Set `DATABASE_URL` to the Neon PostgreSQL connection string with `sslmode=require`.
For production, set `DATABASE_DIRECT_URL` to the separate direct Neon endpoint. Local
development may omit `DATABASE_DIRECT_URL`; local migrations then use `DATABASE_URL`
unchanged and never derive a hostname by removing `-pooler`.

Run local migrations from TypeScript:

```sh
pnpm --filter @sanskrit-shloka-learning/api db:migrate
```

Use the compiled artifact for Railway pre-deploy after `pnpm build`:

```sh
pnpm --filter @sanskrit-shloka-learning/api db:migrate:production
```

Workspace layout:

- `apps/web` - React SPA/PWA shell.
- `apps/api` - Nest API service.
- `packages/api-contract` - TypeSpec source and generated API contract artifacts.
