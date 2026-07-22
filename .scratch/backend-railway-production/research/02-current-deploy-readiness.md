# Аудит готовности backend к Railway deployment

Дата аудита: 2026-07-22.

## Краткий вывод

Backend уже близок к немедленному Railway autodeploy: monorepo сам по себе не требует
Dockerfile или ручного redeploy. В репозитории уже зафиксированы workspace-aware build,
скомпилированные pre-deploy migrations, production start, readiness deploy gate и
graceful draining. Runtime строго валидирует production environment до старта,
слушает `0.0.0.0:$PORT`, разделяет pooled runtime URL и direct migration URL, а
health endpoints дают Railway подходящие liveness/readiness сигналы.

До выбранной цели остаются два обязательных репозиторных разрыва:

1. В текущем checkout нет CI-конфигурации (`.github/` отсутствует), поэтому требование
   «минимальный CI gate перед deploy» пока ничем не реализовано.
2. Production runbook сознательно описывает прежнюю политику: без CI и autodeploy,
   с ручным продвижением первых релизов. Его нужно переписать под выбранный pipeline и
   backend-only первый запуск до появления frontend/custom domains.

По локальным файлам обязательных изменений runtime-кода, migration runner или health
endpoints не обнаружено. `railway.json` также не требует локально очевидной переделки;
его возможные корректировки зависят от отдельного исследования актуальных Railway
возможностей (CI wait/dashboard-only settings). Новая DB migration для подготовки
deploy не нужна.

## Область и метод аудита

Аудит был статическим и read-only по production-коду, конфигурации, принятым
production-hardening артефактам и `/Users/shyam/projects/sadhana-backend`. Реальные
секреты и `.env.local`/`.env` не читались. Тесты и production build не перезапускались,
чтобы не создавать build/cache artifacts в рамках read-only ticket; итоговый CI и
предрелизная проверка должны подтвердить состояние исполняемыми командами.

## Что уже готово

### 1. Monorepo build и область автодеплоя

- Railway config запускается от корня репозитория и собирает API вместе с его workspace
  dependencies через `pnpm --filter @sanskrit-shloka-learning/api... build`.
  [`railway.json`](../../../railway.json#L3-L14)
- Это соответствует структуре workspace `apps/*` + `packages/*` и реальной зависимости
  API от `@sanskrit-shloka-learning/api-contract`.
  [`pnpm-workspace.yaml`](../../../pnpm-workspace.yaml#L1-L3),
  [`apps/api/package.json`](../../../apps/api/package.json#L15-L25)
- `watchPatterns` уже охватывают `apps/api/**`, `packages/api-contract/**`, lockfile,
  workspace/root TypeScript metadata и сам `railway.json`. Поэтому frontend-only
  изменение не входит в заявленную область rebuild, а изменения backend и его
  deployment/build dependencies входят.
  [`railway.json`](../../../railway.json#L6-L14)
- API и contract имеют обычные production build scripts; контракт публикует runtime
  exports из собственного `dist`, поэтому построение workspace dependency действительно
  необходимо и уже учтено фильтром с многоточием.
  [`apps/api/package.json`](../../../apps/api/package.json#L6-L13),
  [`packages/api-contract/package.json`](../../../packages/api-contract/package.json#L6-L25)

Следствие: отдельный Railway Project может подключать весь GitHub repository с Root
Directory в корне. Выносить backend в отдельный repository или добавлять Dockerfile
только из-за monorepo оснований нет.

### 2. Build, pre-deploy, start и traffic gate

`railway.json` уже фиксирует полный deploy tracer bullet:

- build API и workspace dependencies;
- pre-deploy из скомпилированного `apps/api/dist/database/migrate.js`;
- start из скомпилированного `apps/api/dist/main.js`;
- `/health/ready` как healthcheck;
- 10 секунд draining и ограниченный restart-on-failure.

Источник: [`railway.json`](../../../railway.json#L3-L25).

Команды согласованы с package scripts: TypeScript пишет API в `dist`, production
migration/start используют `node`, а не `tsx` или другую dev-only runtime dependency.
[`apps/api/package.json`](../../../apps/api/package.json#L6-L13),
[`apps/api/tsconfig.build.json`](../../../apps/api/tsconfig.build.json#L1-L10)

### 3. Production environment и startup

- В production обязательны `PORT`, `FRONTEND_ORIGIN`, `DATABASE_URL` и
  `DATABASE_DIRECT_URL`; `DATABASE_POOL_MAX` имеет небольшой default `5`.
  Конфигурация проверяется до создания Nest application.
  [`apps/api/src/shared/env.ts`](../../../apps/api/src/shared/env.ts#L37-L107),
  [`apps/api/src/main.ts`](../../../apps/api/src/main.ts#L17-L25)
- Production не читает dotenv, тогда как development/test сохраняют локальный workflow.
  [`apps/api/src/shared/env.ts`](../../../apps/api/src/shared/env.ts#L41-L46),
  [`apps/api/src/shared/env.ts`](../../../apps/api/src/shared/env.ts#L268-L274)
- API всегда получает `host: "0.0.0.0"` и валидированный numeric port, что подходит
  для Railway-provided `PORT`.
  [`apps/api/src/shared/env.ts`](../../../apps/api/src/shared/env.ts#L110-L121),
  [`apps/api/src/shared/env.ts`](../../../apps/api/src/shared/env.ts#L163-L180)
- `FRONTEND_ORIGIN` — ровно один HTTP(S) origin без wildcard/path/query; CORS сравнивает
  browser Origin именно с ним, но не блокирует server-to-server/healthcheck запрос без
  Origin. Для текущей Bearer-аутентификации credentials выключены.
  [`apps/api/src/shared/env.ts`](../../../apps/api/src/shared/env.ts#L198-L219),
  [`apps/api/src/shared/http-guardrails.ts`](../../../apps/api/src/shared/http-guardrails.ts#L63-L88)
- Neon topology валидируется: runtime Neon URL должен быть pooled, migration URL —
  direct. Это разные endpoints одной базы, а не требование разных databases.
  [`apps/api/src/shared/env.ts`](../../../apps/api/src/shared/env.ts#L247-L266)

Таким образом, до frontend deploy нужен не code workaround, а выбранное временное
валидное значение `FRONTEND_ORIGIN` в Railway. Окончательный `app.<domain>` и CORS
переключаются позже в отдельном frontend effort.

### 4. Migration runner

- Production command соединяется только через валидированный `databaseDirectUrl`,
  задает ограниченные connection/lock/statement timeouts, возвращает exit code `1` при
  ошибке и редактирует database URL из сообщения об ошибке.
  [`apps/api/src/database/migrate.ts`](../../../apps/api/src/database/migrate.ts#L12-L21),
  [`apps/api/src/database/migrate.ts`](../../../apps/api/src/database/migrate.ts#L36-L84),
  [`apps/api/src/database/migrate.ts`](../../../apps/api/src/database/migrate.ts#L96-L103)
- Runner берет session advisory lock до чтения истории, хранит checksum каждой
  примененной migration и пропускает уже примененную migration только при совпадении
  checksum.
  [`apps/api/src/database/migration-runner.ts`](../../../apps/api/src/database/migration-runner.ts#L35-L63),
  [`apps/api/src/database/migration-runner.ts`](../../../apps/api/src/database/migration-runner.ts#L65-L95)
- Каждая новая migration и запись в `schema_migrations` выполняются одним
  transactional batch; история не зависит от наличия исходных `.sql` файлов в runtime
  image.
  [`apps/api/src/database/migration-runner.ts`](../../../apps/api/src/database/migration-runner.ts#L126-L168)

Это существенно надежнее референса и уже соответствует pre-deploy модели. При первом
реальном deploy остается операционная проверка: Railway variables должны содержать
pooled и direct endpoints той же Neon database, а pre-deploy log — подтвердить
совпадение существующей migration history/checksums. Поскольку development и production
временно используют одну database, pre-deploy обычно должен безопасно пропустить уже
примененные migrations; он все равно остается обязательным gate.

### 5. Health, shutdown и минимальная диагностика

- `/health/live` не обращается к DB; `/health/ready` вызывает короткий DB readiness
  query и превращает отказ в безопасный `503` без внутренних деталей.
  [`apps/api/src/health/health.controller.ts`](../../../apps/api/src/health/health.controller.ts#L9-L26),
  [`apps/api/src/database/database.service.ts`](../../../apps/api/src/database/database.service.ts#L116-L125)
- Nest включает `SIGTERM` shutdown hooks, а DB service закрывает pool в lifecycle hook.
  [`apps/api/src/main.ts`](../../../apps/api/src/main.ts#L21-L25),
  [`apps/api/src/database/database.service.ts`](../../../apps/api/src/database/database.service.ts#L95-L114)
- Уже есть JSON access log с request ID, method, route, status и duration; secrets/body
  в эту запись не входят.
  [`apps/api/src/shared/http-guardrails.ts`](../../../apps/api/src/shared/http-guardrails.ts#L105-L127)

Эти механизмы достаточны для deploy gate и ручного smoke-check. Они не заменяют будущий
постоянный uptime monitoring — это правильно вынесено в отдельное исследование карты.

## Какие решения были сознательно ручными

Предыдущая production-hardening spec сознательно выбрала одну долгоживущую реплику без
serverless/autoscaling, config-as-code, compiled pre-deploy migrations и ручное
продвижение первых релизов без нового CI.
[`backend-production-hardening/spec.md`](../../backend-production-hardening/spec.md#L73-L85),
[`backend-production-hardening/spec.md`](../../backend-production-hardening/spec.md#L107-L114)

Runbook реализует именно эту прежнюю политику: прямо исключает CI/autodeploy и требует
отключить GitHub autodeploy, локально прогнать проверки и вручную запустить выбранный
commit.
[`docs/operations/railway-production.md`](../../../docs/operations/railway-production.md#L1-L5),
[`docs/operations/railway-production.md`](../../../docs/operations/railway-production.md#L76-L94)

Это не случайный дефект прежней реализации, а теперь отмененное продуктовое решение.
Новая карта сохраняет технические safety gates, но заменяет manual promotion на
немедленный GitHub autodeploy из `main` после минимального CI gate. Следовательно,
исправлять надо policy/automation/runbook, а не ослаблять migration/readiness gates.

Остальные разумные MVP-ограничения можно сохранить:

- одна реплика и небольшой pool;
- без Dockerfile, serverless и autoscaling;
- одна DB-role для runtime/migrations при разных pooled/direct endpoints;
- ручной smoke-check и чтение логов после первого автоматического deploy;
- короткое maintenance window для редкой несовместимой migration вместо полного
  expand/migrate/contract процесса.

Эти границы зафиксированы в принятой spec.
[`backend-production-hardening/spec.md`](../../backend-production-hardening/spec.md#L76-L110)

## Что дает и чего не дает `sadhana-backend`

### Применимо

Референс подтверждает только простой operational UX подключения GitHub repository к
Railway. Из его кода применимы базовые идеи, которые в текущем проекте уже реализованы
строже:

- binding к `0.0.0.0` и platform `PORT`;
  [`sadhana-backend/src/server.ts`](/Users/shyam/projects/sadhana-backend/src/server.ts#L10-L19)
- централизованная env schema и запрет dotenv в production;
  [`sadhana-backend/src/plugins/env.ts`](/Users/shyam/projects/sadhana-backend/src/plugins/env.ts#L5-L42)
- явный browser CORS allowlist и разрешение запросов без Origin.
  [`sadhana-backend/src/plugins/cors.ts`](/Users/shyam/projects/sadhana-backend/src/plugins/cors.ts#L4-L28)

### Неприменимо или хуже текущего решения

- Это single-package npm repository, поэтому его `npm start` (build на каждом start)
  нельзя копировать как monorepo pipeline; текущему проекту нужен install/build от
  workspace root и отдельный быстрый start готового artifact.
  [`sadhana-backend/package.json`](/Users/shyam/projects/sadhana-backend/package.json#L9-L16)
- В референсе нет repository-owned `railway.json`, Dockerfile или CI workflow. Значимые
  Railway settings находятся вне кода и не являются воспроизводимым образцом для
  config-as-code текущего проекта.
- В референсе нет отдельного readiness endpoint: root route лишь отвечает `{root:true}`
  и не проверяет DB.
  [`sadhana-backend/src/routes/root.ts`](/Users/shyam/projects/sadhana-backend/src/routes/root.ts#L1-L7)
- Его migration runner читает исходные SQL-файлы, последовательно запускает все файлы
  при каждом вызове, не ведет history/checksums и не берет advisory lock; он также
  использует runtime `DATABASE_URL` и `rejectUnauthorized: false`. Это нельзя переносить.
  [`sadhana-backend/src/db/migrate.ts`](/Users/shyam/projects/sadhana-backend/src/db/migrate.ts#L1-L40)
- `CORS_ORIGIN` объявлен в env schema, но фактический allowlist hardcoded; `trustProxy:
  true` без ограничения proxy chain слабее текущей настройки.
  [`sadhana-backend/src/plugins/env.ts`](/Users/shyam/projects/sadhana-backend/src/plugins/env.ts#L30-L34),
  [`sadhana-backend/src/plugins/cors.ts`](/Users/shyam/projects/sadhana-backend/src/plugins/cors.ts#L4-L7),
  [`sadhana-backend/src/app.ts`](/Users/shyam/projects/sadhana-backend/src/app.ts#L5-L10)

Итог: перенимать следует простоту GitHub source connection, но не его build/start,
migration, health или config management. Текущий проект уже имеет более подходящую для
production основу.

## Минимальные разрывы и рекомендуемое закрытие

| Приоритет | Разрыв | Минимальное действие |
| --- | --- | --- |
| Обязательно | Нет CI workflow и, следовательно, проверяемого backend CI status | Добавить один минимальный GitHub Actions workflow с frozen pnpm install и проверками API + его workspace dependency; включить только backend/deployment path triggers. Точный механизм ожидания CI в Railway выбирается после исследования возможностей Railway. |
| Обязательно | Runbook требует manual deploy и предполагает уже существующие `app`/`api` domains/frontend | Переписать release section под autodeploy из `main`, CI gate и Railway-generated backend domain; разделить первый backend-only smoke-check и будущий frontend/custom-domain smoke-check. |
| Обязательно, dashboard | Еще не заданы Project/service/source/settings/variables | Создать отдельный Railway Project, один service/replica, подключить GitHub `main`, root repo + `/railway.json`, задать `NODE_ENV`, временный точный `FRONTEND_ORIGIN`, pooled/direct Neon URLs и pool max; секреты не переносить в repository. |
| Обязательно, первый запуск | Не подтвержден реальный pre-deploy и текущая migration history общей Neon DB | Дождаться автоматического build/pre-deploy/readiness, прочитать безопасные logs и выполнить backend smoke-check на generated domain. Не запускать migrations вручную в обход gate. |
| Условно | Node runtime version не закреплена через `engines`/version file; закреплен только `pnpm@11.5.0` | Проверить в Railway capability research, как Railpack выбирает Node. Если используется изменяемый default, закрепить совместимую Node version также в CI/deploy. [`package.json`](../../../package.json#L1-L17) |

### Что не является минимальным блокером

- Dockerfile или выделение backend из monorepo.
- Изменение API product contract/runtime framework.
- Новый migration runner или новая schema migration.
- Отдельная production database на текущем MVP-этапе.
- Custom domain до frontend effort.
- Внешний alerting/APM до отдельного исследования.
- Несколько реплик/shared rate-limit storage.

## Готовность по компонентам

| Компонент | Оценка | Комментарий |
| --- | --- | --- |
| `railway.json` | Готов локально, условно после Railway research | Build/pre-deploy/start/readiness/draining и monorepo watch scope уже заданы. |
| API build/start | Готов | Production запускает заранее собранный JS от workspace root. |
| Production env | Готов | Fail-fast, no dotenv, exact origin, pooled/direct URL validation. Нужны только реальные dashboard values. |
| Migrations | Готов | Compiled command, direct endpoint, lock, history/checksums, transactional migration, non-zero failure. |
| Health/shutdown | Готов | Раздельные live/ready, DB readiness, safe 503, SIGTERM/pool cleanup. |
| Backend-only trigger | Почти готов | Railway watch patterns есть; CI path filters отсутствуют. |
| CI gate | Не готов | Workflow отсутствует; dashboard integration зависит от отдельного Railway research. |
| Runbook | Частично устарел | Технические variables/failure/smoke разделы полезны, release policy нужно заменить. |

## Рекомендация для следующего decision ticket

Выбирать pipeline вокруг уже существующего `railway.json`, а не заменять его:

1. GitHub workflow дает один однозначный backend CI status для backend-related changes.
2. Railway GitHub source следит за `main`; `watchPatterns` отсекают frontend-only deploy.
3. Railway должен начинать/продолжать deploy только после успешного CI тем механизмом,
   который подтвердит исследование Railway; если надежного native wait нет, fallback
   должен менять orchestration, но сохранять текущие build/pre-deploy/readiness gates.
4. После зеленого CI Railway автоматически build → migrate → start → ready, без
   отдельного ручного первого promotion.
5. Владелец вручную выполняет только настройку dashboard и проверку результата/logs.

Главное: не переносить простоту референса ценой удаления уже реализованных safety gates.
Минимальная работа — добавить CI и синхронизировать runbook/policy; backend runtime уже
подготовлен.
