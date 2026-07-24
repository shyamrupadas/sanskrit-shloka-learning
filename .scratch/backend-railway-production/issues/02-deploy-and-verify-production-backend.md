# 02 — Развернуть и проверить production backend в Railway

**What to build:** вручную настроить по production runbook отдельный Railway Project и backend service, выполнить контролируемый первый deployment проверенного commit и подтвердить через Railway и production frontend на Netlify, что production API готов обслуживать пользователя.

**Blocked by:** 01 — Настроить проверяемый backend release pipeline

**Status:** awaiting-human-review
Accepted: 2026-07-24

- [x] В существующем Railway Hobby account создан отдельный Project с одним production environment и одним backend service.
- [x] Для сервиса выбраны одна реплика, отключённый Serverless и регион рядом с существующей Neon DB; новые cost alerts и Compute hard limit не добавлены.
- [x] Сервис подключён к текущему GitHub-репозиторию и ветке `main`, собирается из корня shared monorepo и использует repository-owned Railway config.
- [x] Для сервиса создан Railway-generated public domain; custom domains не настраиваются.
- [x] В Railway заданы `NODE_ENV=production`, `FRONTEND_ORIGIN=https://sanskrit-shloka-learning.netlify.app`, pooled `DATABASE_URL`, direct `DATABASE_DIRECT_URL` той же Neon DB и `DATABASE_POOL_MAX=5`; `PORT` вручную не задан.
- [x] Secrets не сохранены в репозитории, GitHub Actions config, тикете или отчёте о deployment.
- [x] Перед bootstrap выбранный SHA сверен с текущим `main` и имеет успешный backend CI.
- [x] Ровно один ручной bootstrap выполнен через применение Railway staged changes; отдельный Railway CLI workflow и Railway token не создавались.
- [x] После bootstrap в Dashboard подтверждены включённые GitHub autodeploy и `Wait for CI` для последующих backend-related push в `main`.
- [x] Railpack build завершился успешно, compiled pre-deploy runner применил pending migrations или безопасно подтвердил отсутствие pending migrations, а `/health/ready` пропустил deployment в состояние `Active`.
- [x] Build, pre-deploy и runtime logs проверены на startup errors и явную утечку database URLs или других secrets.
- [x] Production frontend на Netlify настроен на Railway-generated API URL; существующий пользователь успешно вошёл и открыл одну защищённую страницу.
- [x] Результат smoke-check подтвердил public routing, точный CORS origin, auth и доступ API к общей Neon DB.
- [x] Railway-generated domain и проверенный commit SHA зафиксированы без чувствительных значений; по решению владельца Railway deployment ID не записывается.
- [x] Если реальный запуск выявил отсутствие или ненадёжность `Wait for CI`, native autodeploy отключён до отдельного решения о Railway CLI fallback, а проблема зафиксирована без добавления token или непроверенного обходного пути.

## Ход ручного выполнения

- Railway-generated API URL: `https://sanskrit-shloka-learningapi-production.up.railway.app`
- Проверенный commit SHA: `ea64971e205de428279c1860c46c40eb5d670758`
- Backend CI для этого SHA завершился успешно.
- Владелец подтвердил успешные build, pre-deploy migrations, переход в `Active`, отсутствие ошибок и явной утечки secrets в runtime logs, а также включённые autodeploy и `Wait for CI`.
- Публично проверены ответы `200` от `/health/live` и `/health/ready`, доступ API к Neon DB через readiness и точный CORS для `https://sanskrit-shloka-learning.netlify.app`.
- Финальный smoke-check через frontend на Netlify завершён успешно: существующий
  пользователь вошёл и открыл защищённую страницу через production API; подтверждены
  public routing, точный CORS origin, auth и доступ API к общей Neon DB.
