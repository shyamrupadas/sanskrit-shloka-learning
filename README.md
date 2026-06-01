# Sanskrit Shloka Learning

Приложение помощник в заучивании наизусть шлок (стихов) на санскрите

## Status

Initial product discovery / pre-MVP.

## Documentation

- Product requirements: `docs/prd/0001-initial-product.md`
- Domain language: `CONTEXT.md`
- Architecture decisions: `docs/adr/`

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

API local environment:

```sh
cp apps/api/.env.example apps/api/.env.local
```

Set `DATABASE_URL` to the Neon PostgreSQL connection string with `sslmode=require`.

Workspace layout:

- `apps/web` - React SPA/PWA shell.
- `apps/api` - Nest API service.
- `packages/api-contract` - TypeSpec source and generated API contract artifacts.
