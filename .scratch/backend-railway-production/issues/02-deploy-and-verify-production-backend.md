# 02 — Развернуть и проверить production backend в Railway

**What to build:** вручную настроить по production runbook отдельный Railway Project и backend service, выполнить контролируемый первый deployment проверенного commit и подтвердить через Railway и локальный frontend, что production API готов обслуживать пользователя.

**Blocked by:** 01 — Настроить проверяемый backend release pipeline

**Status:** ready-for-human

- [ ] В существующем Railway Hobby account создан отдельный Project с одним production environment и одним backend service.
- [ ] Для сервиса выбраны одна реплика, отключённый Serverless и регион рядом с существующей Neon DB; новые cost alerts и Compute hard limit не добавлены.
- [ ] Сервис подключён к текущему GitHub-репозиторию и ветке `main`, собирается из корня shared monorepo и использует repository-owned Railway config.
- [ ] Для сервиса создан Railway-generated public domain; custom domains не настраиваются.
- [ ] В Railway заданы `NODE_ENV=production`, `FRONTEND_ORIGIN=http://localhost:5173`, pooled `DATABASE_URL`, direct `DATABASE_DIRECT_URL` той же Neon DB и `DATABASE_POOL_MAX=5`; `PORT` вручную не задан.
- [ ] Secrets не сохранены в репозитории, GitHub Actions config, тикете или отчёте о deployment.
- [ ] Перед bootstrap выбранный SHA сверен с текущим `main` и имеет успешный backend CI.
- [ ] Ровно один ручной bootstrap выполнен через применение Railway staged changes; отдельный Railway CLI workflow и Railway token не создавались.
- [ ] После bootstrap в Dashboard подтверждены включённые GitHub autodeploy и `Wait for CI` для последующих backend-related push в `main`.
- [ ] Railpack build завершился успешно, compiled pre-deploy runner применил pending migrations или безопасно подтвердил отсутствие pending migrations, а `/health/ready` пропустил deployment в состояние `Active`.
- [ ] Build, pre-deploy и runtime logs проверены на startup errors и явную утечку database URLs или других secrets.
- [ ] Локальный frontend запущен с Railway-generated API URL; существующий пользователь успешно вошёл и открыл одну защищённую страницу.
- [ ] Результат smoke-check подтвердил public routing, точный CORS origin, auth и доступ API к общей Neon DB.
- [ ] Railway-generated domain, проверенный commit SHA и идентификатор успешного deployment зафиксированы в предусмотренном runbook checklist без чувствительных значений.
- [ ] Если реальный запуск выявил отсутствие или ненадёжность `Wait for CI`, native autodeploy отключён до отдельного решения о Railway CLI fallback, а проблема зафиксирована без добавления token или непроверенного обходного пути.
