# 02 — Автоматизировать проверяемый production-выпуск application

**What to build:** подходящий push в `main` автоматически проходит все согласованные проверки, собирает application с каноническим публичным API URL, безопасно синхронизирует проверенный статический артефакт в production и завершает выпуск только после успешной проверки application и API снаружи.

**Blocked by:** 01 — Подготовить доверенный контур выпуска application

**Status:** ready-for-agent

- [ ] Один application production workflow запускается только для push в `main` при изменениях web application, API-contract workspace, корневых dependency/workspace metadata, общих TypeScript/Turbo build settings или самого workflow.
- [ ] Backend-only изменения, не затрагивающие API-контракт или общие build-зависимости application, не запускают выпуск; ручной dispatch и GitHub Environment approval не добавлены.
- [ ] Workflow имеет только `contents: read` и отдельную application concurrency group с `cancel-in-progress: false`, поэтому новый выпуск ждёт уже начавшийся неатомарный deploy.
- [ ] Node и pnpm берутся из repository package metadata, а зависимости устанавливаются из lockfile в frozen mode.
- [ ] До production build последовательно выполняются build workspace-зависимостей web, web lint, typecheck web вместе с зависимостями, API-contract tests и web unit tests.
- [ ] Playwright E2E не входит в обязательный release gate.
- [ ] До build проверяется, что Repository Variable `VITE_API_BASE_URL` равна ровно `https://api.shlokahub.com`, после чего это значение явно передаётся Vite production build.
- [ ] До любого SSH-соединения и до операции с `--delete` workflow подтверждает наличие production entry artifact в ожидаемом результате web build.
- [ ] SSH использует фиксированную identity, `BatchMode`, `IdentitiesOnly` и строгую host-key verification по сохранённой `known_hosts` строке; runtime `ssh-keyscan` и интерактивный fallback отсутствуют.
- [ ] Только содержимое готового application artifact синхронизируется прямым `rsync --delete` в выделенный ShlokaHub application root; исходники и build toolchain на VDS не передаются.
- [ ] После фактического deploy workflow с ограниченными retries и fail-on-error проверяет канонический application URL, прямой `/login` и `https://api.shlokahub.com/health/ready`.
- [ ] Неуспешный smoke-check делает workflow красным и не запускает автоматический rollback; восстановление выполняется исправлением или `git revert` с новым push в `main`.
- [ ] Те же scoped workspace-команды, которые использует workflow, успешно проходят для текущего commit.
