# Issue tracker: Local Markdown

Issues and PRDs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The PRD is `.scratch/<feature-slug>/PRD.md`
- Implementation issues are `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- Triage state is recorded as a `Status:` line near the top of each issue or PRD file (see `triage-labels.md` for the role strings)
- Completed issues and accepted PRDs may include an `Accepted: YYYY-MM-DD` line after `Status:`. Treat `Accepted:` as the local completion marker; do not add non-canonical values like `done` to `Status:`.

## UI-contract requirements

PRDs and issues that create or change visible frontend UI must follow `docs/design/frontend-design-system.md`.

- Include `## Pencil references` with human-readable Pencil names and `nodeId` values for relevant screens, states and reusable components.
- If the UI contract is missing or conflicts with the requirement, include a structured `## UI Contract Collision`; do not leave a free-form note or ask the agent to improvise.
- Use `docs/design/pencil-design-map.md` as the navigation index for preparing issues and for reviewer checks.
- Treat `design/pencil-design.pen` as the canonical UI contract. `design/new-design.pen` is deprecated.
- Keep functional behavior in PRD, domain docs, ADR and API contracts. Pencil references define visual UI, screen states, components and tokens.
- Backend/API-only issues do not need Pencil references when they do not introduce a visible user scenario. If they introduce a future user scenario, the PRD/issue must either link to the future UI contract or explicitly state that frontend implementation is blocked until a UI contract exists.

A visible UI issue without `## Pencil references` or `## UI Contract Collision` is not ready for `ready-for-agent`.

## When an agent finishes an issue

After completing the implementation and required checks:

- Change `Status: ready-for-agent` to `Status: ready-for-human`.
- Do not add `Accepted:`. Acceptance remains a human action.
- If the issue touched visible UI, include the final `Pencil references` report with used screens, components and exceptions.
- Report the issue as ready for human review.

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## When a human accepts an issue

Local markdown issues do not have a separate "closed" state. When the user says an issue is accepted, complete, done, or ready to close:

- Keep the `Status:` line unchanged.
- Add or update an `Accepted: YYYY-MM-DD` line near the top of the file, directly after `Status:`.
- Treat that issue as complete for dependency resolution.
- Search other `.scratch/<feature-slug>/issues/*.md` files for references to the accepted issue in `## Заблокировано` or `## Blocked by`.
- Remove the accepted issue from those blocker lists.
- If a blocker list becomes empty, replace it with `Нет - можно начинать сразу`.
- If all issues under the same `.scratch/<feature-slug>/issues/` directory now have `Accepted: YYYY-MM-DD`, change the parent `.scratch/<feature-slug>/PRD.md` status to `ready-for-human`.
- Report the next unblocked `ready-for-agent` issue, oldest/lowest-numbered first.

## When a PRD is accepted

A PRD becomes ready for human acceptance when all implementation issues under `.scratch/<feature-slug>/issues/` have `Accepted: YYYY-MM-DD`. When the user explicitly accepts the PRD, keep `Status:` unchanged and add or update `Accepted: YYYY-MM-DD` directly after it.
