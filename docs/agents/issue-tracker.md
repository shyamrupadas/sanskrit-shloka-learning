# Issue tracker: Local Markdown

Issues and PRDs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The PRD is `.scratch/<feature-slug>/PRD.md`
- Implementation issues are `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings)
- Completed issues may include an `Accepted: YYYY-MM-DD` line after `Status:`. Treat `Accepted:` as the local completion marker; do not add non-canonical values like `done` to `Status:`.

## When an agent finishes an issue

After completing the implementation and required checks:

- Change `Status: ready-for-agent` to `Status: ready-for-human`.
- Do not add `Accepted:`. Acceptance remains a human action.
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
- Report the next unblocked `ready-for-agent` issue, oldest/lowest-numbered first.
