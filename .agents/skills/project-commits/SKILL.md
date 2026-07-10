---
name: project-commits
description: Create commits with this repository's Conventional Commit rules.
---

# Project Commits

## Workflow

1. Inspect `git status --short`, staged diffs, and unstaged diffs for files that may belong to the commit.
2. Treat existing staged files as user intent. If they conflict with the requested commit, stop and ask. Stage additional files only by exact path: `git add -- <path>...`.
3. Use `type(scope): subject`. Scope is mandatory. Pick one allowed type and one allowed scope. Write the subject in English, imperative mood, lowercase after the colon, with no trailing period.
4. Run focused checks for executable code, generated contracts, or tests. Stop on failed or skipped checks unless the user explicitly says to commit anyway.
5. Commit with `git commit -m "<subject>"`. Add a body only for necessary context.
6. Report in Russian: hash, subject, checks, and intentionally uncommitted files.

## Types

- `feat` - product, API, or domain capability.
- `fix` - broken or unintended behavior.
- `test` - tests only.
- `docs` - documentation only.
- `refactor` - behavior-preserving code change.
- `chore` - maintenance.
- `build` - dependencies, scripts, bundling, TypeScript/Vite/Turbo config.
- `ci` - CI/CD automation.
- `perf` - performance.
- `revert` - revert.

## Scopes

- `repo` - root workspace, shared package metadata, root tooling.
- `agents` - `AGENTS.md`, project skills, agent workflow docs.
- `scratch` - `.scratch` issues and planning artifacts.
- `docs` - `docs/`, `CONTEXT.md`, PRDs, ADRs.
- `design` - Pencil files, design requirements, icons, visual assets.
- `api` - Nest API app outside a narrower scope.
- `web` - React app outside a narrower scope.
- `contract` - TypeSpec and generated API contract package.
- `database` - migrations, schema, persistence plumbing.
- `auth` - authentication, accounts, sessions, roles, authorization.
- `catalog` - shloka source/catalog domain.
- `admin` - admin catalog management.
- `library` - user library browsing and selection.
- `dashboard` - dashboard and daily learning entry point.
