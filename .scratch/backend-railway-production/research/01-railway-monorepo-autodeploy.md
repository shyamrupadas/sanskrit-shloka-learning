# Railway: автодеплой backend из pnpm-monorepo

Дата проверки: 2026-07-22.

## Вопрос

Какие актуальные возможности Railway Hobby, GitHub integration, Railpack и config-as-code позволяют надёжно деплоить только backend из pnpm-monorepo при backend-related изменениях в `main`, ждать минимальный CI gate и не активировать версию при failed build, pre-deploy migration или readiness? Какие ограничения и dashboard-настройки нельзя выразить в `railway.json`?

## Краткий вывод

Для текущего репозитория сложность монорепозитория не требует ручного redeploy или отдельного backend-репозитория. Рекомендуемая схема:

1. Один backend-сервис в отдельном Railway Project, связанный с текущим GitHub-репозиторием и веткой `main`.
2. Собирать **из корня репозитория** (`Root Directory=/`), потому что `apps/api` использует корневые `pnpm-workspace.yaml`, `pnpm-lock.yaml`, TypeScript-конфигурацию и workspace-зависимость `packages/api-contract`.
3. Оставить Railpack и задать узкую build-команду для API вместе с его workspace-зависимостями.
4. Ограничить автодеплой `watchPatterns` только путями, влияющими на backend.
5. Добавить GitHub Actions workflow на `push` в `main` с тем же набором backend-related путей и включить в Railway `Wait for CI`.
6. Миграции выполнять как `preDeployCommand`, а `/health/ready` использовать как deployment healthcheck.

Такой конвейер даёт четыре последовательных барьера: CI → image build → migration → readiness. Неуспешный барьер не делает новую версию активной. Исключение: уже выполненные миграции Railway автоматически не откатывает, поэтому миграции должны быть совместимы и безопасны для повторного запуска.

## Почему корнем должен остаться корень монорепозитория

Railway различает изолированный и shared monorepo. Для изолированного приложения можно поставить подкаталог как Root Directory, но Root Directory ограничивает доступный source snapshot этим каталогом; build/deploy-команды также исполняются относительно него. Для shared JavaScript monorepo Railway рекомендует собирать из общего корня и задавать package-specific build/start commands. Railway умеет автоматически распознавать pnpm workspaces ([Railway: Deploying a Monorepo](https://docs.railway.com/deployments/monorepo), [Railway: Build Configuration](https://docs.railway.com/builds/build-configuration)).

Текущий API не изолирован:

- менеджер и версия пакетов заданы в корневом `package.json` как `pnpm@11.5.0`;
- список workspaces находится в корневом `pnpm-workspace.yaml`;
- единственный lockfile — корневой `pnpm-lock.yaml`;
- `apps/api` зависит от `@sanskrit-shloka-learning/api-contract` через `workspace:*`;
- build-команда и start/pre-deploy paths в текущем `railway.json` рассчитаны на cwd в корне репозитория.

Следовательно, `Root Directory=/apps/api` скроет необходимые корневые и workspace-файлы и является неверной оптимизацией. Для backend-сервиса следует оставить `/` (значение по умолчанию).

Railpack поддерживает pnpm workspaces нативно: обнаруживает `pnpm-workspace.yaml`, устанавливает workspace-зависимости, сохраняет workspace links и cache; поле `packageManager` используется для выбора package manager через Corepack ([Railpack: Node.js / Monorepo Support](https://railpack.com/languages/node)). Поэтому для MVP отдельный Dockerfile не нужен. Явный `buildCommand` всё равно полезен: он фиксирует, какой workspace нужно собирать, вместо неявного корневого `pnpm run build`.

Текущая команда:

```text
pnpm --filter @sanskrit-shloka-learning/api... build
```

соответствует выбранной модели: сборка запускается для API и его workspace-зависимостей. Её фактическую успешность следует отдельно подтвердить production-like build-тестом перед настройкой сервиса; это уже проверка кода, а не ограничение Railway.

## Автодеплой только при backend-related изменениях

Railway-сервис, связанный с GitHub, автоматически создаёт deployment при push в выбранную ветку. Ветка выбирается в Service Settings; автоматический deploy можно включать и выключать там же ([Railway: GitHub Autodeploys](https://docs.railway.com/deployments/github-autodeploys)). Для этого проекта trigger branch должен быть `main`.

`watchPatterns` — gitignore-подобные шаблоны. Если ни один изменённый файл не совпал, Railway пропускает создание нового deployment. Шаблоны считаются от корня `/` даже при настроенном Root Directory ([Railway: Build Configuration](https://docs.railway.com/builds/build-configuration)).

Текущий набор в `railway.json` покрывает непосредственный API, его workspace-зависимость и корневые файлы, способные изменить dependency graph или сборку:

```json
[
  "/apps/api/**",
  "/packages/api-contract/**",
  "/package.json",
  "/pnpm-lock.yaml",
  "/pnpm-workspace.yaml",
  "/tsconfig.base.json",
  "/railway.json"
]
```

Это разумная исходная граница. При появлении новой общей package/config-зависимости её путь нужно добавить одновременно в Railway watch patterns и в CI paths. Изменения только в `apps/web` не должны создавать backend deployment. При включённых watch patterns пустой commit также не форсирует deployment; для этого Railway предлагает Dashboard-команду `Deploy Latest Commit` ([Railway: GitHub Autodeploys](https://docs.railway.com/deployments/github-autodeploys)).

## Минимальный CI gate и `Wait for CI`

Railway `Wait for CI` работает с GitHub Check Suites. У репозитория должен существовать GitHub Actions workflow с trigger `push`. После включения флага deployment остаётся в состоянии `WAITING`; если любой workflow завершился ошибкой, deployment получает `SKIPPED`, а после успеха всех workflows Railway продолжает deployment ([Railway: GitHub Autodeploys](https://docs.railway.com/deployments/github-autodeploys)).

Минимальный backend workflow должен:

- запускаться на `push` в `main`;
- иметь GitHub `paths`, семантически совпадающие с `watchPatterns` Railway (в GitHub пути указываются без начального `/`);
- устанавливать зависимости из lockfile (`pnpm install --frozen-lockfile`);
- запускать хотя бы typecheck, тесты и production build для API и его workspace-зависимостей.

Рекомендуемый минимальный смысл gate:

```text
pnpm --filter @sanskrit-shloka-learning/api... typecheck
pnpm --filter @sanskrit-shloka-learning/api... test
pnpm --filter @sanskrit-shloka-learning/api... build
```

GitHub поддерживает одновременные `branches` и `paths` filters; workflow запускается только при выполнении обоих условий ([GitHub Actions: Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onpushbranchestagsbranches-ignoretags-ignore), [GitHub Actions: path filters](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onpushpull_requestpull_request_targetpathspaths-ignore)).

Важно синхронизировать два списка путей. Официальная документация Railway не фиксирует поведение `Wait for CI`, когда Railway watch pattern совпал, но соответствующий GitHub workflow не был создан из-за несовпадающего path filter. Совпадающие фильтры устраняют этот неопределённый сценарий. При последующем включении GitHub branch protection нужно также учитывать особенность GitHub: workflow, целиком пропущенный path filter, может оставить required check в `Pending`; эту проблему обычно решают job-level condition или отдельным всегда создаваемым aggregate check ([GitHub: Troubleshooting required status checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks#handling-skipped-but-required-checks)). Для самого MVP-autodeploy branch protection не является обязательным.

CI и Railway build намеренно дублируют production build: CI решает, можно ли начинать deploy, а Railpack затем строит собственный deployable image. Переход к сборке и публикации одного image в CI для нагрузки 10–100 пользователей был бы лишней инфраструктурой.

## Гарантии deployment lifecycle

### Ошибка CI

С `Wait for CI` Railway не начинает build при неуспешном GitHub workflow: deployment становится `SKIPPED` ([Railway: GitHub Autodeploys](https://docs.railway.com/deployments/github-autodeploys)).

### Ошибка image build

Новая версия проходит в `Deploying` только после успешного build. Ошибка build переводит deployment в `Failed`, поэтому новая версия не становится `Active` ([Railway: Deployments Reference](https://docs.railway.com/deployments/reference)).

### Ошибка миграции

`preDeployCommand` выполняется после build и до запуска приложения, в отдельном контейнере с environment variables и private network. При ненулевом exit code команда не повторяется, и deployment дальше не идёт. Volume не подключается, а изменения отдельной файловой системы не сохраняются ([Railway: Pre-Deploy Command](https://docs.railway.com/deployments/pre-deploy-command)).

Это подходящее место для текущей команды:

```text
node apps/api/dist/database/migrate.js
```

Ограничение: Railway останавливает deployment, но не откатывает изменения во внешней Neon DB. Если миграция успела частично изменить схему или успешно завершилась, а readiness затем упал, старая версия приложения продолжит обслуживать трафик уже поверх новой схемы. Поэтому production-миграции должны быть транзакционными там, где это возможно, идемпотентными и backward-compatible (expand/contract при несовместимых изменениях).

### Ошибка readiness

При настроенном healthcheck Railway вызывает endpoint до получения HTTP `200`; только после этого новая версия становится активной, а предыдущая — неактивной. Если endpoint не ответил `200` за timeout, deployment считается failed ([Railway: Healthchecks](https://docs.railway.com/deployments/healthchecks), [Railway: Deployments Reference](https://docs.railway.com/deployments/reference)).

Текущие настройки подходят по назначению:

```json
{
  "healthcheckPath": "/health/ready",
  "healthcheckTimeout": 30
}
```

Чтобы этот барьер был содержательным, приложение должно слушать предоставленный Railway `PORT`, а `/health/ready` — возвращать `200` только когда API действительно готов принимать запросы и установил необходимые зависимости, включая DB, если доступность DB входит в readiness. Railway использует healthcheck только при выпуске новой версии и **не выполняет непрерывный uptime-monitoring** после активации ([Railway: Healthchecks](https://docs.railway.com/deployments/healthchecks)). Это подтверждает правильность отдельной будущей задачи по исследованию alerting, но не добавляет её в текущий deploy pipeline.

В первом deployment предыдущей активной версии ещё нет: любой из этих сбоев оставит сервис без активного backend, но не активирует сломанную версию.

## Что хранить в `railway.json`, а что остаётся в Dashboard

Railway config-as-code описывает **один deployment** и охватывает настройки секций Build и Deploy. При каждом deployment Railway объединяет Dashboard settings и файл, но значения из кода имеют приоритет и не записываются обратно в Dashboard. Полный порядок: environment-specific config in code → base config in code → service settings. Источник итогового значения можно увидеть в deployment details ([Railway: Config as Code](https://docs.railway.com/config-as-code/reference)).

### В `railway.json`

Для текущего решения следует версионировать:

- builder (`RAILPACK`);
- targeted build command;
- backend watch patterns;
- pre-deploy migration command;
- start command;
- healthcheck path и timeout;
- restart policy;
- draining/overlap lifecycle settings при необходимости.

Текущий корневой `railway.json` уже находится в стандартном месте, поэтому отдельный Config File Path не нужен.

### Только Dashboard/API, не `railway.json`

Следующие необходимые настройки находятся вне Build/Deploy config schema:

- создание Railway Project, environment и backend service;
- подключение GitHub repository и разрешения Railway GitHub App;
- trigger branch `main`, включение autodeploy и `Wait for CI`;
- Root Directory (`/` в данном случае);
- нестандартный абсолютный Config File Path, если файл когда-либо будет перенесён;
- environment variables и secrets (`DATABASE_URL`, auth secrets, CORS origin и другие runtime values);
- Railway/public/custom domain и его DNS/target-port configuration;
- CPU/RAM replica limits, serverless toggle, usage alerts/hard limit и другие cost controls.

Это следует из заявленной границы config-as-code («everything in build and deploy sections») и исчерпывающего списка поддерживаемых ключей, куда source integration, variables, domains, Root Directory и workspace billing controls не входят ([Railway: Using Config as Code](https://docs.railway.com/config-as-code), [Railway: Config as Code Reference](https://docs.railway.com/config-as-code/reference)). Root Directory и путь к нестандартному config-файлу явно настраиваются через Service Settings; config-файл не следует за Root Directory автоматически ([Railway: Build Configuration](https://docs.railway.com/builds/build-configuration)).

Практическое следствие при диагностике: если одно и то же build/deploy значение задано и в Dashboard, и в `railway.json`, фактически победит файл. Менять такую настройку только в Dashboard бессмысленно.

## Ограничения Hobby, значимые для этого решения

Текущая таблица Railway указывает для Hobby до 50 projects и до 50 services на project, три concurrent builds, 40-минутный build timeout, 100 GB build image и 7 дней хранения логов. Поэтому отдельный project с одним backend service укладывается в план с большим запасом ([Railway Pricing: Compare features](https://railway.com/pricing#compare-features)).

Hobby стоит минимум $5 в месяц и включает $5 usage; CPU, RAM и egress нового сервиса увеличат общее фактическое usage, а превышение включённой суммы оплачивается дополнительно ([Railway: Pricing Plans](https://docs.railway.com/pricing/plans)). Для MVP важнее следить за суммарным Usage после запуска, чем оптимизировать build architecture заранее.

Удалённые deployment images на Hobby сохраняются 72 часа для rollback; более старую версию придётся rebuild/redeploy из исходного source ([Railway: Pricing Plans — Image retention](https://docs.railway.com/pricing/plans#image-retention-policy)). Это не мешает автодеплою, но ограничивает окно быстрого rollback.

В официальной документации `GitHub repo deployment`, config-as-code и healthchecks доступны на Hobby; страница `Wait for CI` не указывает отдельного Pro-требования. Для появления toggle нужны GitHub workflow с `push`, contributor access, доступ Railway GitHub App к repository и принятые обновлённые GitHub permissions ([Railway: GitHub Autodeploys](https://docs.railway.com/deployments/github-autodeploys)).

## Рекомендуемое решение по исследованному вопросу

Принять автоматический deploy из shared monorepo как штатный путь, без ручного redeploy:

- source: текущий GitHub repository;
- branch: `main`;
- Root Directory: `/`;
- Config File Path: стандартный корневой `/railway.json` (явно задавать не требуется);
- builder: Railpack;
- build/watch/start/pre-deploy/healthcheck: версионировать в `railway.json`;
- backend CI: GitHub Actions `push main` с синхронизированными paths;
- Railway `Wait for CI`: включить в Dashboard;
- secrets, Neon credentials, domains и source controls: настроить вручную в Dashboard.

Открытые технические проверки перед фактическим deploy — не новые платформенные решения, а критерии реализации:

1. production build действительно создаёт `apps/api/dist/main.js`, `apps/api/dist/database/migrate.js` и собранный `api-contract`;
2. процесс слушает Railway `PORT` на `0.0.0.0`;
3. `/health/ready` возвращает корректные коды и укладывается в выбранные 30 секунд;
4. migration runner корректно завершает процесс ненулевым кодом при ошибке и безопасен для повторного запуска;
5. списки backend-related путей в GitHub Actions и `railway.json` остаются синхронизированы.
