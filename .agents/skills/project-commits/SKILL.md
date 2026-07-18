---
name: project-commits
description: Create one commit with all current repository changes using this repository's Conventional Commit rules. Use when the user asks to commit the current work.
---

# Project Commits

## Workflow

1. Treat the current task and conversation as the complete commit intent. Immediately stage every tracked, untracked, modified, and deleted file with `git add -A`. Do not inspect, classify, filter, or exclude files based on whether they appear to belong to the task, and do not split the changes into multiple commits.
2. If the staged diff is empty, report that there is nothing to commit and stop.
3. Use `type(scope): subject`. Scope is mandatory. Choose the type, scope, and subject from the current task. Write the subject in English, imperative mood, lowercase after the colon, with no trailing period.
4. Do not run tests, linters, builds, type checks, generators, or other validation as part of this skill unless the user explicitly requests it in the same request.
5. Commit all staged changes with `git commit -m "<subject>"`. Add a body only for necessary context.
6. Report in Russian: hash, subject, and whether the worktree is clean after the commit.

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
- `scratch` - `.scratch` tickets and planning artifacts.
- `docs` - `docs/`, `CONTEXT.md`, specs, ADRs.
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
