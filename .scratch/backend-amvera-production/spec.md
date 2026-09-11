# Временный production-деплой backend в Amvera

Status: ready-for-agent

## Problem Statement

Production backend сейчас автоматически выпускается в Railway из общего pnpm
monorepo. Railway собирает API через Railpack, ожидает успешный Backend CI, отдельно
выполняет compiled migrations, запускает NestJS-процесс и допускает deployment к
трафику после readiness-проверки. Владелец приложения переносит этот backend в
Amvera как во временную площадку перед будущим переходом на VDS; тариф и ресурсы
Amvera уже выбраны и не требуют проектирования.

Прямая привязка Amvera к `main` не подходит: Amvera не предоставляет
repository-level path filter, поэтому изменение только frontend запускало бы
ненужную сборку и перезапуск backend. Реакция на общий GitHub `Workflow runs` также
не даёт надёжной привязки именно к Backend CI, потому что в репозитории существуют
отдельные backend и frontend workflows. Одновременно нативная Node-сборка Amvera
ориентирована на `npm`, тогда как приложение использует pnpm workspaces, закреплённую
версию pnpm и workspace-зависимость на API-контракт.

Переезд не должен добавлять временный сложный delivery-контур, переносить секреты
Neon в GitHub Actions или связывать репозиторий с Amvera CLI. Нужен небольшой,
воспроизводимый container-based процесс, который сохраняет главные гарантии Railway:
frontend-only изменения не выпускают backend, непроверенный backend commit не
доходит до deployment, миграции завершаются до запуска API, а готовность приложения
проверяется вручную через health endpoints перед переключением домена.

## Solution

Backend получает умеренно оптимизированную multi-stage Docker-сборку, пригодную как
для временного запуска в Amvera, так и для будущего VDS. Стадия сборки использует
закреплённые Node 24 и pnpm, устанавливает зависимости по frozen lockfile и собирает
только API с необходимыми workspace-зависимостями. Финальная стадия содержит только
скомпилированный API и production-зависимости, запускается непривилегированным
пользователем и не включает исходники, frontend, devDependencies или production
секреты.

Существующий Backend CI остаётся единственным release gate для backend-related
изменений. После typecheck, tests, production build и успешной сборки Docker image он
перемещает постоянную служебную ветку `amvera-api` на проверенный commit. Amvera
подключается к GitHub и следит по push webhook только за этой веткой. Служебная ветка
не является веткой разработки: в неё не создают ручные commits или pull requests, а
её единственная роль — указывать на последний проверенный backend release.

Контейнер при каждом старте сначала выполняет существующий compiled migration
runner через direct endpoint Neon и только после успеха заменяет стартовый процесс
на NestJS API. Для одной реплики повторный запуск безопасен благодаря таблице
применённых миграций, checksum и PostgreSQL advisory lock. Готовность API и
подключение к Neon проверяются вручную через `/health/live` и `/health/ready`.
Настройка Kubernetes probes исключена из временного MVP по решению пользователя
от 2026-09-11; автоматический допуск трафика по `/health/ready` не гарантируется.

Первый deployment проверяется через бесплатный домен Amvera. После успешных
миграций и ручных health-проверок канонический
`api.shlokahub.com` линейно переключается с Railway на выданные Amvera DNS records.
Быстрый rollback и zero-downtime cutover не требуются, поскольку активных
пользователей нет; Railway удаляется только после подтверждённой работы канонического
домена на Amvera.

## User Stories

1. Как владелец приложения, я хочу временно разместить существующий production backend в Amvera, чтобы отказаться от Railway до подготовки целевого VDS.
2. Как владелец приложения, я хочу оставить выбранный тариф и объём ресурсов Amvera неизменными, чтобы migration effort не переоткрывал уже принятое коммерческое решение.
3. Как разработчик, я хочу сохранить frontend и backend отдельными deployable applications внутри monorepo, чтобы смена backend hosting не затрагивала frontend release lifecycle.
4. Как разработчик, я хочу собирать API в Docker, чтобы Amvera не пыталась устанавливать pnpm workspace через нативный npm toolchain.
5. Как разработчик, я хочу использовать Node 24 и версию pnpm из package metadata, чтобы локальная, CI и production-сборки использовали одинаковый toolchain.
6. Как разработчик, я хочу устанавливать зависимости по frozen lockfile, чтобы deployment не получал незапланированные версии пакетов.
7. Как разработчик, я хочу собирать только API и необходимые ему workspace-зависимости, чтобы не тратить время и память Amvera на frontend build.
8. Как владелец приложения, я хочу получить компактный runtime image без devDependencies и исходников, чтобы снизить расход диска, время передачи образа и поверхность атаки.
9. Как владелец приложения, я хочу запускать API непривилегированным пользователем контейнера, чтобы компрометация процесса не давала root-доступ внутри контейнера.
10. Как разработчик, я хочу исключить локальные dependencies, build outputs, Git metadata, scratch-артефакты и frontend из Docker build context, чтобы сборка была быстрее и не могла случайно захватить локальные секреты.
11. Как разработчик, я хочу кешировать установку зависимостей отдельно от копирования исходников, чтобы обычное изменение backend-кода не заставляло повторно загружать весь dependency graph.
12. Как разработчик, я хочу проверять production Docker image в Backend CI, чтобы ошибки container-сборки обнаруживались до передачи commit в Amvera.
13. Как разработчик, я хочу сохранить существующие typecheck, API tests и production build перед Docker-проверкой, чтобы container validation дополняла, а не заменяла текущие барьеры качества.
14. Как разработчик, я хочу запускать Backend CI только для API, API-контракта и влияющих на них workspace, CI и container-файлов, чтобы frontend-only изменения не тратили backend CI.
15. Как владелец приложения, я хочу, чтобы неуспешный Backend CI не изменял release-кандидат Amvera, чтобы непроверенный commit не запускал deployment.
16. Как владелец приложения, я хочу использовать постоянную служебную ветку `amvera-api` как указатель на последний проверенный backend commit, чтобы Amvera реагировала только на реальные backend releases.
17. Как разработчик, я хочу, чтобы служебная ветка обновлялась автоматически после полного успеха Backend CI, чтобы не выполнять ручное продвижение каждого релиза.
18. Как разработчик, я хочу перемещать служебную ветку обычным fast-forward push без принудительной перезаписи истории, чтобы неожиданное расхождение остановило promotion вместо скрытой потери истории.
19. Как разработчик, я хочу выдавать право записи содержимого репозитория только promotion job, чтобы остальные CI jobs оставались read-only.
20. Как разработчик, я хочу использовать короткоживущий repository-scoped GitHub token для promotion, чтобы не хранить Amvera credentials или общий GitHub PAT без необходимости.
21. Как разработчик, я хочу, чтобы push служебной ветки не запускал Backend CI повторно, чтобы release pipeline не входил в рекурсию.
22. Как владелец приложения, я хочу подключить Amvera к GitHub и ветке `amvera-api` через штатный push webhook, чтобы Amvera сама получала проверенный исходный код и собирала Docker image.
23. Как владелец приложения, я хочу, чтобы frontend-only push в `main` не менял `amvera-api`, чтобы Amvera не пересобирала и не перезапускала неизменившийся backend.
24. Как владелец приложения, я хочу сохранить Neon как внешнюю production database, чтобы переезд hosting не превращался в перенос данных.
25. Как владелец приложения, я хочу передавать работающему API pooled Neon endpoint, чтобы runtime использовал предназначенный для него тип соединения.
26. Как владелец приложения, я хочу передавать migration runner отдельный direct Neon endpoint, чтобы миграции не выполнялись через pooler.
27. Как владелец приложения, я хочу хранить database URLs в секретах Amvera, чтобы они не попадали в Docker image, GitHub Actions, репозиторий или документацию.
28. Как разработчик, я хочу, чтобы production variables были доступны только во время запуска контейнера, чтобы Docker build оставался воспроизводимым и не зависел от секретов.
29. Как владелец приложения, я хочу выполнять compiled migrations автоматически при старте контейнера, чтобы каждый deployment проверял готовность схемы без ручного локального шага.
30. Как владелец приложения, я хочу, чтобы ошибка миграции предотвращала запуск API, чтобы новая версия не работала поверх неподготовленной схемы.
31. Как владелец приложения, я хочу, чтобы после успешной миграции стартовый процесс передавал управление непосредственно Node.js, чтобы API корректно получал SIGTERM и выполнял graceful shutdown.
32. Как владелец приложения, я хочу запускать одну реплику API, чтобы миграции при старте не конкурировали между несколькими одновременно создаваемыми контейнерами.
33. Как владелец приложения, я хочу проверить успешный `/health/ready` перед переключением домена, чтобы подтвердить соединение API с Neon.
34. Как владелец приложения, я хочу ограничиться ручной проверкой health endpoints, чтобы упростить настройку временного deployment.
35. Как разработчик, я хочу сохранить строгую обработку proxy headers после Railway, чтобы rate limiting различал реальных клиентов и не доверял подделанному адресу от прямого клиента.
36. Как разработчик, я хочу убрать зависимость request tracing от Railway-specific request ID, чтобы API генерировал или продолжал безопасный идентификатор независимо от hosting provider.
37. Как владелец приложения, я хочу сначала проверить API через бесплатный HTTPS-домен Amvera, чтобы подтвердить работу deployment до изменения канонического DNS.
38. Как владелец приложения, я хочу проверить логи сборки, миграций и запуска без публикации секретов, чтобы обнаружить deployment-проблемы до переключения домена.
39. Как владелец приложения, я хочу войти существующей учетной записью через production frontend и открыть защищённую страницу, чтобы одним smoke-check проверить routing, CORS, auth и чтение Neon.
40. Как владелец приложения, я хочу сохранить `api.shlokahub.com` каноническим API origin, чтобы frontend не требовал отдельного release из-за смены backend provider.
41. Как владелец приложения, я хочу переключить DNS на Amvera только после успешной проверки бесплатного домена, чтобы не диагностировать container build и custom domain одновременно.
42. Как владелец приложения, я хочу дождаться выпуска TLS для `api.shlokahub.com` и повторить readiness и пользовательский smoke-check, чтобы завершить перенос на проверенном HTTPS origin.
43. Как владелец приложения, я хочу оставить Railway работающим до подтверждения Amvera, чтобы прежнюю площадку не удалять до окончания линейного cutover.
44. Как владелец приложения, я хочу удалить Railway service и устаревшую Railway-конфигурацию после подтверждённого cutover, чтобы не оплачивать и не сопровождать два production backend.
45. Как будущий оператор VDS, я хочу повторно использовать Docker image contract, чтобы последующий перенос не требовал возвращения к provider-specific Node buildpack.
46. Как будущий оператор VDS, я хочу удалить временную promotion-ветку и заменить startup migrations отдельным release step, когда появятся собственная оркестрация или несколько реплик.

## Implementation Decisions

- Спецификация продолжает принятые архитектурные решения: API остаётся отдельным NestJS deployable application в pnpm monorepo, а Neon — внешней PostgreSQL database. Новый ADR не требуется, потому что конкретный provider уже намеренно оставлен заменяемой инфраструктурной деталью.
- Amvera является временным container runtime перед VDS. Выбранный тариф, регион и доступные ресурсы не пересматриваются.
- Repository-owned deployment contract строится вокруг корневого Dockerfile. Отдельный Amvera manifest не добавляется, пока не появится настройка, которую нельзя выразить Dockerfile или выполнить вручную в Dashboard; Amvera использует порт `80`; в Dashboard явно задаётся runtime-переменная `PORT=80`.
- Docker image использует multi-stage build на Debian slim с Node 24. Alpine не выбирается, чтобы не вводить musl-совместимость и дополнительные различия с текущим runtime.
- Toolchain включает Corepack и точную версию pnpm из package metadata. Install выполняется по frozen lockfile только для API и его workspace-зависимостей.
- Dependency metadata копируется до исходников, чтобы Docker layer с установкой зависимостей переиспользовался при изменениях кода без изменения lockfile или manifests. Сложные удалённые BuildKit caches для временной площадки не вводятся.
- Production runtime формируется workspace-aware deployment-механизмом pnpm либо эквивалентным проверенным способом и содержит только compiled API, необходимые workspace artifacts и production dependencies. DevDependencies, TypeScript sources, frontend и build toolchain в финальный слой не попадают.
- Docker build context исключает Git metadata, локальные environment-файлы, dependencies, локальные build outputs, test artifacts, `.scratch`, frontend и прочие данные, не нужные для сборки API. Правила не должны исключать API-контракт или root workspace metadata.
- Финальный контейнер запускается непривилегированным пользователем и не требует writable application filesystem или persistent volume.
- Runtime entrypoint последовательно выполняет compiled migration runner, а после его успешного завершения через process replacement запускает compiled NestJS API. Отдельного Amvera pre-deploy hook нет; ручные локальные миграции не являются штатной частью release flow.
- Существующие миграции остаются идемпотентными по registry/checksum и используют PostgreSQL advisory lock. Целевая Amvera-топология ограничена одной репликой. Переход к нескольким репликам требует сначала вынести миграции в отдельный release job.
- Runtime получает `NODE_ENV=production`, точный `FRONTEND_ORIGIN=https://app.shlokahub.com`, pooled `DATABASE_URL`, direct `DATABASE_DIRECT_URL` той же Neon database и `DATABASE_POOL_MAX=5`. Database URLs создаются как secrets; нечувствительные значения могут быть обычными variables. `PORT=80` задаётся вручную как обычная переменная с этапом «Запуск».
- Backend CI сохраняет существующие typecheck, tests и production build и добавляет сборку финального production Docker target. Docker image не публикуется в GHCR для Amvera: Amvera получает source commit и сама собирает тот же Dockerfile.
- Backend-related path filters включают API, API-контракт, root dependency/workspace metadata, TypeScript build configuration, Dockerfile, Docker ignore rules и сам Backend CI. Изменения только frontend, frontend release или общих документов не должны запускать backend release.
- После успешного verify job отдельный promotion job передвигает постоянную ветку `amvera-api` на точный проверенный commit. Ветка создаётся первым успешным promotion и дальше обновляется только fast-forward; force push запрещён.
- Promotion job получает job-scoped `contents: write`, использует штатный короткоживущий `GITHUB_TOKEN` и не получает Amvera или database secrets. Остальные jobs сохраняют `contents: read`.
- Backend CI запускается только для backend-related push в `main`; push в `amvera-api` не входит в его branch filter и не создаёт рекурсию. Существующая concurrency-политика отменяет устаревший незавершённый release при более новом backend commit.
- Ветка `amvera-api` является release pointer, а не долгоживущей веткой разработки: ручные commits, pull requests, merge-back в `main` и независимые изменения в ней запрещены.
- В Amvera вручную подключаются текущий GitHub repository, push event и target branch `amvera-api`. Для приватного repository владелец предоставляет Amvera минимально достаточный GitHub read token по инструкции платформы; этот token не сохраняется в repository.
- Первый promotion подтверждает, что внешний Amvera webhook получает push служебной ветки, выполненный через `GITHUB_TOKEN`. Если наблюдаемая интеграция Amvera игнорирует такой push, допускается узкий fallback: отдельный fine-grained GitHub token только с минимальным правом обновлять contents этого repository, сохранённый как GitHub secret и используемый только promotion job. Схема со служебной веткой при этом не меняется.
- GitHub `Workflow runs` webhook не используется: он не даёт подтверждённой фильтрации по конкретному backend workflow при наличии независимого frontend workflow. Amvera CLI/API, прямой push в Amvera repository и публикация image в registry также не входят в основной путь.
- По решению пользователя от 2026-09-11 Kubernetes readiness probe исключена из объёма переезда. `/health/ready` проверяется вручную на бесплатном и каноническом доменах. Автоматическое исключение экземпляра из трафика при недоступности Neon в этом MVP не обеспечивается нашей конфигурацией. Доступность настройки probes на выбранном тарифе не подтверждена.
- Railway-specific proxy terminology и request ID fallback в HTTP guardrails заменяются provider-neutral контрактом. Валидный `X-Request-Id` может продолжаться; при его отсутствии API генерирует UUID. Railway-only request ID после завершения coexistence не является частью контракта.
- Адрес клиента для auth rate limiting может браться из ingress forwarding header только когда непосредственный socket peer принадлежит явно доверенному внутреннему proxy range. Безусловный `trust proxy`, доверие произвольной длине forwarding chain или принятие forwarded address от публичного peer запрещены. Ручная проверка поведения Amvera ingress при bootstrap исключена по решению пользователя от 2026-09-11; реализация proxy contract сохраняется.
- Переезд выполняется поэтапно. Сначала repository получает Docker/CI/promotion возможность без отключения Railway. Затем создаётся `amvera-api`, Amvera подключается к ней, получает variables/secrets и бесплатный HTTPS domain, после чего выполняются deployment и smoke-check.
- Smoke-check бесплатного Amvera origin подтверждает успешную Docker build, migration startup, readiness, отсутствие startup errors и явных секретов в logs. Пользовательский smoke-check через production frontend выполняется после переключения канонического домена в тикете 05.
- После успешного generated-origin smoke-check в Amvera добавляется `api.shlokahub.com`. В Cloudflare удаляются конфликтующие Railway records и создаются точные `A` и `TXT`, выданные Amvera; на время verification используются настройки DNS, совместимые с прямой проверкой ownership и выпуском Let's Encrypt certificate.
- Cutover линейный: специальное уменьшение TTL, traffic splitting и автоматический rollback не требуются. После готовности TLS повторяются `/health/live`, `/health/ready` и пользовательский smoke-check через `https://api.shlokahub.com`.
- Railway service, provider-specific config и устаревшие Railway operational instructions удаляются только после успешного канонического smoke-check. Документация repository должна описывать Amvera bootstrap, variables, webhook, ручные health-проверки, логи, DNS, проверку и завершение Railway coexistence.
- Канонический API origin не меняется, поэтому production frontend build configuration и видимый UI не требуют изменений.
- Новые DB migrations и изменения публичного API-контракта для переезда не требуются.

## Testing Decisions

- Основной автоматизированный seam — полный Backend CI для backend-related commit. Хорошая проверка наблюдает release contract целиком: typecheck и существующие tests успешны, production artifacts собираются, а финальный Docker image создаётся из чистого repository context без runtime secrets.
- Docker-проверка должна собирать именно финальный production target, который будет использовать Amvera, а не отдельный упрощённый test image. Успех промежуточной build stage без финального runtime layer недостаточен.
- Existing API unit/integration tests остаются prior art для environment validation, platform port bind, migration runner, health endpoints, graceful shutdown и HTTP guardrails. Их нельзя дублировать Docker-specific тестами без нового внешнего поведения.
- Тесты HTTP guardrails обновляются на provider-neutral формулировки и проверяют два внешних сценария: валидный client address принимается только от доверенного непосредственного proxy, а forwarded headers публичного или неизвестного peer игнорируются. Отдельно проверяется продолжение валидного `X-Request-Id` и генерация нового UUID без Railway-specific header.
- Migration runner tests продолжают подтверждать идемпотентность, checksum, advisory lock, direct connection configuration и ненулевой результат ошибки. Новый тест нужен только если реализация меняет сам runner; простое включение существующей compiled-команды в container entrypoint не должно дублировать его внутренние тесты.
- Promotion проверяется поведением workflow: при падении любого verify step ветка `amvera-api` не изменяется; после полного успеха она указывает ровно на проверенный SHA; frontend-only изменение не запускает workflow и не перемещает ветку. Не требуется отдельный custom test harness для GitHub Actions.
- Первый deployment является обязательной интеграционной проверкой внешней платформы. На бесплатном Amvera origin проверяются `/health/live` и `/health/ready`, успешный startup migration result и отсутствие startup errors или явной утечки secrets в build/runtime logs.
- После DNS/TLS cutover те же health endpoints проверяются через `https://api.shlokahub.com`, затем production frontend выполняет вход существующей учетной записью и загрузку одной защищённой страницы. Это верхний пользовательский seam для routing, TLS, CORS, auth и Neon.
- Проверки логов и итоговый отчёт не должны содержать database URLs, passwords, access tokens, webhook secrets, authorization headers, полные forwarding headers, Amvera internal identifiers или пользовательские данные.
- Реализационные tickets, которые изменяют или добавляют тесты, обязаны использовать repository workflow для backend-тестов.

## Out of Scope

- Выбор или изменение тарифа, региона, CPU, RAM, диска и иных ресурсов Amvera.
- Перенос Neon, разделение development и production databases, изменение connection topology или создание новых DB migrations.
- Изменение публичного API-контракта, пользовательских сценариев, frontend-кода, видимого UI или production frontend origin.
- Публикация Docker image в GHCR или другой registry для текущего Amvera deployment.
- Установка Docker, Compose, Nginx или TLS на VDS и фактический перенос backend на VDS.
- Docker Compose, несколько container process types, workers, cron jobs или отдельный migration service в Amvera.
- Несколько API replicas. Перед масштабированием startup migrations должны быть заменены отдельным release job.
- Zero-downtime DNS migration, traffic splitting, canary release и автоматический быстрый rollback.
- Kubernetes readiness probe, startup probe, liveness probe, Docker healthcheck, постоянный uptime monitoring, alerting и новая observability-платформа.
- Amvera CLI, MCP, собственный API client или отдельный GitHub-to-Amvera credentials-based deploy pipeline.
- Создание отдельного backend repository или перенос frontend из текущего monorepo.
- Оптимизации Docker build через remote BuildKit cache, custom base image, distroless runtime или архитектурно-зависимые native images.
- Общий рефакторинг HTTP guardrails, rate limiting, logging или migration framework за пределами provider-neutral hosting contract.
- Подготовка implementation tickets; она выполняется следующим шагом `to-tickets`.

## Further Notes

- На момент подготовки спецификации Amvera документирует автоматическую синхронизацию внешнего Git repository по push webhook с выбором target branch, сборку корневого Dockerfile, стандартный container port `80`, runtime variables/secrets и ручную конфигурацию Kubernetes probes.
- Amvera не предоставляет документированный эквивалент Railway `preDeployCommand`; официальный migration guidance объединяет release-команду и запуск application process. Поэтому startup migrations являются осознанным временным решением для одной реплики.
- Время сборки Amvera может быть заметно больше локальной сборки. Служебная ветка предотвращает ненужные backend builds при активной frontend-разработке.
- Railway config сохраняется на стадии coexistence и удаляется после успешного canonical-domain smoke-check, чтобы добавление Docker pipeline само по себе не выключило действующий backend преждевременно.
- Служебная ветка должна быть удалена вместе с Amvera promotion job после перехода на VDS. Целевой VDS flow должен публиковать immutable image по commit SHA/digest и выполнять migration ровно один раз отдельным release step до замены API container.
- Доменные термины продукта и ADR не изменяются: работа касается deployment infrastructure, а не модели шлок, учетных записей или пользовательского обучения.
- Новые DB migrations не требуются.
- Источники по Amvera: [Docker](https://docs.amvera.ru/applications/configuration/docker.html), [GitHub webhook](https://docs.amvera.ru/applications/git/webhooks.html), [variables и secrets](https://docs.amvera.ru/applications/configuration/variables.html), [network и domains](https://docs.amvera.ru/applications/configuration/network.html), [Kubernetes probes](https://docs.amvera.ru/general/k8sprobe.html), [migration pattern](https://docs.amvera.ru/applications/configuration/heroku-migration.html).
- Источник по promotion token: [GitHub `GITHUB_TOKEN`](https://docs.github.com/en/actions/concepts/security/github_token).

## Приёмка bootstrap — 2026-09-11

Пользователь подтвердил успешную проверку и принял тикет 04. Из его объёма
исключены пункты 8–10 инструкции: вход через подмену API origin в браузере,
ручная проверка client-IP/rate limiting и заполнение отдельного отчёта. Эти
проверки не выполнялись и не считаются пройденными. Проверки канонического
домена в тикете 05 сохраняются.
