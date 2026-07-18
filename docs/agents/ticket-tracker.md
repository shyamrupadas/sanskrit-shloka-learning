# Ticket tracker: Local Markdown

Tickets and specs for this repo live as markdown files in `.scratch/`.
The workflow is `to-spec → to-tickets`: create or refine the spec first, then decompose it into implementation tickets.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation tickets are `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- Triage state is recorded as a `Status:` line near the top of each ticket or spec file (see `triage-labels.md` for the role strings)
- Completed tickets and accepted specs may include an `Accepted: YYYY-MM-DD` line after `Status:`. Treat `Accepted:` as the local completion marker; do not add non-canonical values like `done` to `Status:`.

## UI-contract requirements

Specs and tickets that create or change visible frontend UI must follow `docs/design/frontend-design-system.md`.

- Include `## Pencil references` with human-readable Pencil names and `nodeId` values for relevant screens, states and reusable components.
- If the UI contract is missing or conflicts with the requirement, include a structured `## UI Contract Collision`; do not leave a free-form note or ask the agent to improvise.
- Use `docs/design/pencil-design-map.md` as the navigation index for preparing tickets and for reviewer checks.
- Treat `design/pencil-design.pen` as the canonical UI contract. `design/new-design.pen` is deprecated.
- Keep functional behavior in spec, domain docs, ADR and API contracts. Pencil references define visual UI, screen states, components and tokens.
- Backend/API-only tickets do not need Pencil references when they do not introduce a visible user scenario. If they introduce a future user scenario, the spec/ticket must either link to the future UI contract or explicitly state that frontend implementation is blocked until a UI contract exists.

A visible UI ticket without `## Pencil references` or `## UI Contract Collision` is not ready for `ready-for-agent`.

## When an agent finishes a ticket

After completing the implementation and required checks:

- Change `Status: ready-for-agent` to `Status: ready-for-human`.
- Do not add `Accepted:`. Acceptance remains a human action.
- If the ticket touched visible UI, include the final `Pencil references` report with used screens, components and exceptions.
- Report the ticket as ready for human review.

## Publishing to the ticket tracker

`to-spec` creates or updates `.scratch/<feature-slug>/spec.md`. `to-tickets` reads that spec and creates numbered implementation tickets under `.scratch/<feature-slug>/issues/`.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the ticket number directly.

## When a human accepts a ticket

Local markdown tickets do not have a separate "closed" state. When the user says a ticket is accepted, complete, done, or ready to close:

- Keep the `Status:` line unchanged.
- Add or update an `Accepted: YYYY-MM-DD` line near the top of the file, directly after `Status:`.
- Treat that ticket as complete for dependency resolution.
- Search other `.scratch/<feature-slug>/issues/*.md` files for references to the accepted ticket in `## Заблокировано` or `## Blocked by`.
- Remove the accepted ticket from those blocker lists.
- If a blocker list becomes empty, replace it with `Нет - можно начинать сразу`.
- If all tickets under the same `.scratch/<feature-slug>/issues/` directory now have `Accepted: YYYY-MM-DD`, change the parent `.scratch/<feature-slug>/spec.md` status to `ready-for-human`.
- Report the next unblocked `ready-for-agent` ticket, oldest/lowest-numbered first.

## When a spec is accepted

A spec becomes ready for human acceptance when all implementation tickets under `.scratch/<feature-slug>/issues/` have `Accepted: YYYY-MM-DD`. When the user explicitly accepts the spec, keep `Status:` unchanged and add or update `Accepted: YYYY-MM-DD` directly after it.
