# 01 — Настроить проверяемый backend release pipeline

**What to build:** подготовить репозиторий и подробный production runbook так, чтобы backend-related push в `main` проходил один воспроизводимый CI gate, Railway видел ту же область release-изменений, а владелец приложения получил точную пошаговую инструкцию для ручной настройки и проверки production-сервиса.

**Blocked by:** None — can start immediately

**Status:** awaiting-human-review
Accepted: 2026-07-24

- [x] Node major 24 закреплён в package metadata и одинаково используется как production runtime constraint и версия Node в CI.
- [x] Один backend CI workflow запускается для push в `main` только при изменениях API, API-контракта или их install/build/deployment-зависимостей.
- [x] Изменение самого backend CI запускает новый backend CI и считается Railway release-изменением, а frontend-only изменение не запускает ни backend CI, ни Railway deployment.
- [x] CI использует frozen pnpm install и последовательно выполняет `typecheck`, `test` и `build` для API вместе с его workspace-зависимостями.
- [x] Новый push отменяет незавершённый CI устаревшего commit в той же ветке.
- [x] GitHub path filters и Railway watch patterns синхронизированы и охватывают все общие файлы, реально влияющие на backend release pipeline.
- [x] Production runbook содержит подробную последовательность создания отдельного Railway Project, production environment и backend service в существующем Hobby account.
- [x] Runbook точно указывает настройки GitHub source, ветки `main`, корня shared monorepo, repository-owned Railway config, generated domain, региона, одной реплики, отключённого Serverless, autodeploy и `Wait for CI`.
- [x] Runbook перечисляет обязательные Railway variables, объясняет источник pooled и direct Neon endpoints одной базы, фиксирует pool size `5` и явно запрещает вручную задавать `PORT` или сохранять secrets в репозитории.
- [x] Runbook пошагово описывает единственный ручной bootstrap: сверку SHA с текущим `main` и зелёным backend CI, применение staged changes, а затем повторную проверку включённых autodeploy и `Wait for CI`.
- [x] Runbook содержит конкретные проверки Railpack build, compiled pre-deploy migrations, readiness, статуса `Active`, runtime logs и отсутствия явной утечки секретов.
- [x] Runbook содержит точные действия для smoke-check через текущий production frontend на Netlify: открыть `https://sanskrit-shloka-learning.netlify.app`, войти существующим пользователем и открыть защищённую страницу, проверив routing, CORS, auth и Neon DB.
- [x] Runbook различает сбой до активации и регрессию активной версии, описывает безопасный Railway rollback только при совместимой схеме, forward fix при несовместимой схеме и условный Railway CLI fallback при подтверждённой ненадёжности `Wait for CI`.
- [x] Runbook фиксирует временный `FRONTEND_ORIGIN=https://sanskrit-shloka-learning.netlify.app`, явно передаёт будущему VPS effort его замену на новый точный production HTTPS origin и оставляет разделение Neon environments, custom domains и monitoring за отдельными усилиями.
- [x] Backend `typecheck`, существующие тесты и production build проходят через те же workspace-команды, которые использует новый CI.
