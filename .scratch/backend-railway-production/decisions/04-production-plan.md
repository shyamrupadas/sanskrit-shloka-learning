# Согласовать пошаговый production-план

Type: grilling
Status: resolved
Blocked by: 03 - Выбрать точный release pipeline для backend

## Question

Какой минимальный набор изменений и какая точная последовательность действий доведут текущий backend до проверенного production deploy: CI, Railway Project/service, source/config paths, variables, автоматический запуск, migrations, readiness, smoke-check, rollback и передача будущих frontend/database/alerting efforts?

## Answer

Принят следующий production-план.

### 1. Изменения репозитория

До настройки Railway нужно:

- добавить один backend CI workflow для `push` в `main` с Node 24, frozen pnpm install и последовательными `typecheck`, `test`, `build` для API и его workspace-зависимостей;
- синхронизировать GitHub path filters с backend/deployment-related `watchPatterns` в `railway.json`, включая сам workflow как зависимость release pipeline;
- закрепить Node major 24 для production build;
- переписать `docs/operations/railway-production.md` под native autodeploy, принятый bootstrap, минимальный smoke-check и rollback-политику.

Изменения runtime-кода и новая DB migration для первого deploy не нужны. После слияния этих изменений `main` должен иметь успешный backend CI.

### 2. Railway bootstrap

В существующем Hobby account создаётся отдельный Railway Project с одним production environment и одним backend service. Для сервиса остаются одна реплика и выключенный Serverless; регион выбирается рядом с регионом существующей Neon DB. Новые cost alerts и Compute hard limit не настраиваются.

До первого запуска настраиваются:

- GitHub source: текущий repository, branch `main`;
- Root Directory: `/`;
- Config File: стандартный корневой `/railway.json`;
- Railway-generated public domain;
- `NODE_ENV=production`;
- `FRONTEND_ORIGIN=http://localhost:5173`;
- `DATABASE_URL`: pooled Neon endpoint;
- `DATABASE_DIRECT_URL`: direct Neon endpoint для migrations;
- `DATABASE_POOL_MAX=5`;
- `PORT` не задаётся вручную: его предоставляет Railway.

Минимальная native-схема важнее абсолютной автоматизации первого запуска. Поэтому разрешён ровно один ручной bootstrap через применение Railway staged changes. Перед ним оператор сверяет, что выбранный SHA совпадает с текущим `main` и уже прошёл backend CI. Это осознанное исключение: bootstrap не считается защищённым свежим событием `Wait for CI`.

После подключения source включаются GitHub autodeploy и Dashboard-флаг `Wait for CI`; их включённое состояние обязательно проверяется после bootstrap. Все последующие backend deployments запускаются только подходящим push в `main`. Railway CLI deploy workflow и Railway token заранее не добавляются; они остаются fallback только при подтверждённой ненадёжности `Wait for CI`.

### 3. Первый запуск и проверка

Оператор последовательно проверяет в Railway:

1. Railpack build завершился успешно.
2. Compiled pre-deploy migration runner завершился успешно или не нашёл pending migrations.
3. API запустился, `/health/ready` прошёл deployment healthcheck, deployment стал `Active`.
4. В runtime logs нет startup errors и явной утечки секретов.

Минимальный ручной smoke-check выполняется через локальный frontend, запущенный с `VITE_API_BASE_URL=https://<railway-domain>`. Нужно войти существующим пользователем и открыть одну защищённую страницу. Этого достаточно, чтобы для MVP одновременно проверить public routing, разрешённый CORS origin, auth и доступ к общей Neon DB. Отдельные ручные проверки rate limit, запрещённого origin, request ID и admin API в первый smoke-check не входят.

`FRONTEND_ORIGIN=http://localhost:5173` означает не same-origin, а один разрешённый cross-origin frontend. Backend сравнивает браузерный `Origin` с этим точным значением; остальные browser origins не разрешаются.

### 4. Ошибки и rollback

- Ошибка CI, build, pre-deploy migration или readiness до активации не требует rollback: предыдущий активный deployment продолжает работать, а причина исправляется новым commit. У первого deployment предыдущей версии нет.
- Регрессию уже активированной версии без несовместимого изменения схемы можно откатить Railway rollback на предыдущий успешный deployment.
- Railway rollback восстанавливает приложение и variables, но не откатывает Neon. Если migrations уже изменили схему, старую версию возвращают только при доказанной совместимости с новой схемой.
- При несовместимой схеме применяется forward fix. Обратный SQL вручную без отдельного recovery-плана запрещён.

### 5. Передача следующих усилий

Frontend deployment обязан заменить `FRONTEND_ORIGIN=http://localhost:5173` на точный production HTTPS origin и повторить login/CORS smoke-check. Custom `app`/`api` domains и публичный API URL во frontend остаются частью этого отдельного effort.

Разделение общей Neon DB на development и production и production monitoring/alerting остаются отдельными будущими efforts. Текущий план не добавляет cost alerts, hard limit, APM или uptime monitoring.
