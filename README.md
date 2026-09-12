# Sanskrit Shloka Learning

Приложение помощник в заучивании наизусть шлок (стихов) на санскрите

## Status

Initial product discovery / pre-MVP.

## Documentation

- Product spec: `.scratch/initial-product/spec.md`
- Domain language: `CONTEXT.md`
- Architecture decisions: `docs/adr/`
- Amvera/Neon production runbook: [настройка и обычный выпуск backend](docs/operations/amvera-production.md)
- ShlokaHub API custom-domain runbook: [домен API в Amvera](docs/operations/amvera-domain-cutover.md)
- ShlokaHub static-domain runbook: `docs/operations/shlokahub-static-domains.md`
- ShlokaHub application release-inputs runbook: `docs/operations/shlokahub-application-release-inputs.md`
- VDS secure-access runbook: `docs/operations/vds-secure-access.md`
- VDS isolated HTTP platform runbook: `docs/operations/vds-http-platform.md`
- VDS security/resource baseline runbook: `docs/operations/vds-security-resource-baseline.md`

## Development

Runtime: Node.js 24.15+ (24.x LTS). Package manager: `pnpm@12.4.1` via Corepack.

Builds and typechecks use TypeScript 7 (`@typescript/native`). The `typescript`
alias provides the TypeScript 6 API required by ESLint and other tooling.

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

For a manual run of compiled migrations after `pnpm build`:

```sh
pnpm --filter @sanskrit-shloka-learning/api db:migrate:production
```

Production in Amvera runs compiled migrations automatically at container startup,
before the API starts. Keep one replica; a separate release step for migrations is
required before scaling. See the [production runbook](docs/operations/amvera-production.md).

Workspace layout:

- `apps/web` - React SPA/PWA shell.
- `apps/api` - Nest API service.
- `packages/api-contract` - TypeSpec source and generated API contract artifacts.
