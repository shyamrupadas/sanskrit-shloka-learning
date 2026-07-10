Do not change the git index (`git add`, `git restore --staged`) or commit unless explicitly asked.
When explicitly asked to commit, use `.agents/skills/project-commits/SKILL.md`.
Issues/PRDs live in `.scratch/<feature-slug>/`; details: `docs/agents/issue-tracker.md`.
Triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`; details: `docs/agents/triage-labels.md`.
Domain docs: `CONTEXT.md` and `docs/adr/`; details: `docs/agents/domain.md`.
When touching tests for any reason, including feature or bugfix work, use `.agents/skills/write-tests/SKILL.md`.
For changes in `apps/web`, read `apps/web/AGENTS.md` first.
New DB migrations: explicitly mention in the final task report that they must be applied.
