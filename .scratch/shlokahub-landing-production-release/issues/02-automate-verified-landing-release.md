# 02 — Автоматизировать проверяемый production-выпуск landing

**What to build:** каждый push в `main` готового landing repository последовательно проверяет release artifact, безопасно синхронизирует его в production и завершает выпуск только после успешной внешней проверки канонического landing и API readiness.

**Blocked by:** 01 — Подготовить доверенный контур выпуска landing

**Status:** ready-for-agent

- [ ] Один production workflow запускается на любой push в `main` без path filters, ручного dispatch и GitHub Environment approval.
- [ ] Workflow состоит из одного последовательного job: checkout, предусмотренные готовым repository verify/build-шаги, artifact guard, SSH/rsync deploy и production smoke-check.
- [ ] Если готовому repository нужны runtime, package manager и зависимости, workflow использует закреплённые repository-версии, lockfile и frozen/immutable install; committed artifact без install/build также поддерживается.
- [ ] Workflow имеет только `contents: read` и отдельную landing concurrency group с `cancel-in-progress: false`, поэтому новый выпуск ждёт уже начавшийся неатомарный deploy.
- [ ] До любого SSH-соединения и до операции, способной удалить production-файлы, workflow подтверждает наличие `dist/index.html`.
- [ ] SSH использует фиксированную identity, `BatchMode`, `IdentitiesOnly` и строгую host-key verification по сохранённой `known_hosts` строке; runtime `ssh-keyscan` и интерактивный fallback отсутствуют.
- [ ] Только содержимое готового `dist/` синхронизируется прямым `rsync --delete` в выделенный landing root; устаревшие production-файлы удаляются, а исходники и build toolchain на VDS не передаются.
- [ ] После фактического deploy workflow с ограниченными retries и fail-on-error проверяет `https://shlokahub.com/` и `https://api.shlokahub.com/health/ready`.
- [ ] Неуспешный smoke-check делает workflow красным и не запускает автоматический rollback; исправление или возврат выполняется новым commit, обычно через `git revert`, и push в `main`.
- [ ] Проверки и workflow logs не выводят private key, host IP, host-key строку, Secret values или access tokens.
