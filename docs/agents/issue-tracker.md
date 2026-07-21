# Issue tracker: Local Markdown

Tickets and specs for this repo live as markdown files in `.scratch/`.
The workflow is `to-spec → to-tickets`: create or refine the spec first, then decompose it into implementation tickets.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation tickets are `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- Implementation tickets use the exact local-ticket metadata format emitted by `to-tickets`: `**Blocked by:** ...` and `**Status:** ...`.
- Specs record workflow state as a plain `Status:` line near the top of the file (see `triage-labels.md` for the triage role strings).
- Accepted tickets and specs include an `Accepted: YYYY-MM-DD` line directly after their status line. Treat `Accepted:` as the local completion marker; do not add non-canonical values like `done` to either status format.

## Status semantics

Triage and implementation lifecycle are separate state machines:

- Incoming issue triage: `needs-triage` → `needs-info` | `ready-for-agent` | `ready-for-human` | `wontfix`.
- Implementation lifecycle: `ready-for-agent` → `awaiting-human-review` → `Accepted: YYYY-MM-DD`.

The canonical triage role `ready-for-human` means that implementation requires a human. It does not mean that implementation is complete. `awaiting-human-review` is the only status that means implementation and required checks are complete and the ticket or spec awaits human review. If a human implements a `ready-for-human` ticket, change its status to `awaiting-human-review` before acceptance.

## Dependency graph

- `**Blocked by:**` is either `None — can start immediately` or one or more `NN — Ticket title` references separated by `; `.
- The two-digit `NN` is the blocker identity and must resolve to exactly one ticket in the same `issues/` directory. The title is for readability; report a mismatch, but resolve the edge by number.
- `to-tickets` numbers tickets in dependency order. When publishing tickets or changing an edge, require blockers to exist and have lower numbers; reject duplicate, self, missing, ambiguous, or malformed references. This keeps the graph acyclic.
- Keep published edges after blockers are accepted. Edit them only to correct an explicit planning error or dependency decision, then validate the graph again.
- A blocker is accepted only when its ticket has an exact top-level `Accepted: YYYY-MM-DD` line directly after `**Status:**`; ignore body mentions.
- A ticket is on the frontier when it has `**Status:** ready-for-agent`, has no `Accepted:` marker, and every blocker is accepted. Invalid references remain unresolved and must be reported instead of being removed silently.

## Implementation ticket format

New implementation tickets use the `to-tickets` local template without local alternatives:

```markdown
# <NN> — <Ticket title>

**What to build:** the end-to-end behaviour this ticket makes work, from the user's perspective.

**Blocked by:** blocker references in the exact `NN — Ticket title; NN — Ticket title` form, or "None — can start immediately".

**Status:** ready-for-agent

- [ ] Acceptance criterion 1
- [ ] Acceptance criterion 2
```

Project-specific supporting sections, such as `## Parent`, `## Pencil references`, or `## UI Contract Collision`, follow the acceptance criteria. Do not publish new implementation tickets with plain `Status:` metadata or `## Заблокировано` / `## Blocked by` sections.

## UI-contract requirements

Specs and tickets that create or change visible frontend UI must follow `docs/design/frontend-design-system.md`, which defines Pencil sources of truth, references, collisions, backend-only exceptions, and final reporting. A visible UI ticket without `## Pencil references` or `## UI Contract Collision` is not ready for `ready-for-agent`.

## When an agent finishes a ticket

After completing the implementation and required checks:

- Change `**Status:** ready-for-agent` to `**Status:** awaiting-human-review`.
- Do not add `Accepted:`. Acceptance remains a human action.
- If the ticket touched visible UI, include the final `Pencil references` report with used screens, components and exceptions.
- Report the ticket as ready for human review.

## Publishing to the ticket tracker

`to-spec` creates or updates `.scratch/<feature-slug>/spec.md`. `to-tickets` reads that spec and creates numbered implementation tickets under `.scratch/<feature-slug>/issues/`.

Before publishing implementation tickets, validate the complete graph using `Dependency graph`. Do not publish until every inconsistency is corrected.

## Wayfinding operations

`wayfinder` uses the local tracker to map and resolve decisions before work is converted into specs and implementation tickets. Wayfinding artifacts are planning artifacts: they do not use triage statuses or the human-acceptance flow for implementation tickets.

- **Map:** `.scratch/<effort-slug>/map.md`. It contains `Destination`, `Notes`, `Decisions so far`, `Not yet specified`, and `Out of scope`.
- **Decision ticket:** `.scratch/<effort-slug>/decisions/<NN>-<slug>.md`, numbered from `01`. Keep decision tickets out of `issues/`, which is reserved for implementation tickets created by `to-tickets`.
- **Type:** a `Type:` line records `research`, `prototype`, `grilling`, or `task`.
- **Status:** a `Status:` line records `open`, `claimed`, or `resolved`. Do not use `ready-for-agent`, `ready-for-human`, `awaiting-human-review`, or `Accepted:` for decision tickets.
- **Blocking:** a `Blocked by:` line lists the numbers and titles of the decisions that must be resolved first, or `None - can start immediately`.
- **Frontier:** scan `.scratch/<effort-slug>/decisions/` for `open` decisions whose blockers are all `resolved`. The lowest-numbered frontier decision wins unless the user names another frontier decision.
- **Claim:** change `Status: open` to `Status: claimed` and save before working on the decision.
- **Resolve:** append the resolution under `## Answer`, change `Status: claimed` to `Status: resolved`, then append a one-line gist and relative link to the decision under the map's `Decisions so far`.

When the route to the destination is clear, use the map and the relevant resolved decisions as sources for `to-spec`. Each independently deliverable result gets its own `.scratch/<feature-slug>/spec.md`; its implementation tickets then live under that feature's `issues/`. Record ordering between multiple deliverables in the final map decision and preserve it when starting their specs.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the ticket number directly.

## When an agent starts a ticket

Before implementation, verify that the selected ticket is on the frontier:

- Apply the `Dependency graph` rules to the selected ticket.
- If the graph is inconsistent, stop and report the invalid references. If any blocker is unresolved, stop and report it.
- Start implementation only for a frontier ticket. Do not remove or rewrite resolved edges.

## When a human accepts a ticket

Local markdown tickets do not have a separate "closed" state. When the user says a ticket is accepted, complete, done, or ready to close:

- Keep the `**Status:**` line unchanged.
- Accept only a ticket with `**Status:** awaiting-human-review`. `ready-for-human` means that human implementation is still required and is not an acceptance state.
- Add or update an `Accepted: YYYY-MM-DD` line directly after `**Status:**`.
- Treat that ticket as complete for dependency resolution.
- Keep every ticket's `**Blocked by:**` field unchanged. Acceptance resolves an edge through the referenced ticket's `Accepted:` marker; it does not delete the edge.
- Evaluate the other `.scratch/<feature-slug>/issues/*.md` files using `Dependency graph`; report invalid references instead of resolving them.
- If all tickets under the same `.scratch/<feature-slug>/issues/` directory now have `Accepted: YYYY-MM-DD`, change the parent `.scratch/<feature-slug>/spec.md` status to `awaiting-human-review`.
- Report the next ticket with `**Status:** ready-for-agent` whose referenced blockers are all accepted, oldest/lowest-numbered first.

## When a spec is accepted

A spec becomes ready for human acceptance when all implementation tickets under `.scratch/<feature-slug>/issues/` have `Accepted: YYYY-MM-DD`; its status is then `awaiting-human-review`. When the user explicitly accepts the spec, require that status, keep it unchanged, and add or update `Accepted: YYYY-MM-DD` directly after it.
