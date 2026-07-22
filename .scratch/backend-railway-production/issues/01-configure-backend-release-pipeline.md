# 01 — Настроить проверяемый backend release pipeline

**What to build:** подготовить репозиторий и подробный production runbook так, чтобы backend-related push в `main` проходил один воспроизводимый CI gate, Railway видел ту же область release-изменений, а владелец приложения получил точную пошаговую инструкцию для ручной настройки и проверки production-сервиса.

**Blocked by:** None — can start immediately

**Status:** awaiting-human-review
Accepted: 2026-07-23

- [ ] Node major 24 закреплён в package metadata и одинаково используется как production runtime constraint и версия Node в CI.
- [ ] Один backend CI workflow запускается для push в `main` только при изменениях API, API-контракта или их install/build/deployment-зависимостей.
- [ ] Изменение самого backend CI запускает новый backend CI и считается Railway release-изменением, а frontend-only изменение не запускает ни backend CI, ни Railway deployment.
- [ ] CI использует frozen pnpm install и последовательно выполняет `typecheck`, `test` и `build` для API вместе с его workspace-зависимостями.
- [ ] Новый push отменяет незавершённый CI устаревшего commit в той же ветке.
- [ ] GitHub path filters и Railway watch patterns синхронизированы и охватывают все общие файлы, реально влияющие на backend release pipeline.
- [ ] Production runbook содержит подробную последовательность создания отдельного Railway Project, production environment и backend service в существующем Hobby account.
- [ ] Runbook точно указывает настройки GitHub source, ветки `main`, корня shared monorepo, repository-owned Railway config, generated domain, региона, одной реплики, отключённого Serverless, autodeploy и `Wait for CI`.
- [ ] Runbook перечисляет обязательные Railway variables, объясняет источник pooled и direct Neon endpoints одной базы, фиксирует pool size `5` и явно запрещает вручную задавать `PORT` или сохранять secrets в репозитории.
- [ ] Runbook пошагово описывает единственный ручной bootstrap: сверку SHA с текущим `main` и зелёным backend CI, применение staged changes, а затем повторную проверку включённых autodeploy и `Wait for CI`.
- [ ] Runbook содержит конкретные проверки Railpack build, compiled pre-deploy migrations, readiness, статуса `Active`, runtime logs и отсутствия явной утечки секретов.
- [ ] Runbook содержит точные действия для smoke-check через локальный frontend: передать Railway-generated API URL, войти существующим пользователем и открыть защищённую страницу, проверив routing, CORS, auth и Neon DB.
- [ ] Runbook различает сбой до активации и регрессию активной версии, описывает безопасный Railway rollback только при совместимой схеме, forward fix при несовместимой схеме и условный Railway CLI fallback при подтверждённой ненадёжности `Wait for CI`.
- [ ] Runbook явно передаёт будущему frontend effort замену временного `FRONTEND_ORIGIN` на точный production HTTPS origin и оставляет разделение Neon environments, custom domains и monitoring за отдельными усилиями.
- [ ] Backend `typecheck`, существующие тесты и production build проходят через те же workspace-команды, которые использует новый CI.
