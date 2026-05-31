# Sanskrit Shloka Learning

Приложение помощник в заучивании наизусть шлок (стихов) на санскрите

## Status

Initial product discovery / pre-MVP.

## Documentation

- Product requirements: `docs/prd/0001-initial-product.md`
- Domain language: `CONTEXT.md`
- Architecture decisions: `docs/adr/`

## Development

Package manager: `pnpm@9.15.9` via Corepack.

```sh
corepack enable pnpm
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm dev
```

Workspace layout:

- `apps/web` - React SPA/PWA shell.
- `apps/api` - Nest API service.
- `packages/api-contract` - TypeSpec source and generated API contract artifacts.
