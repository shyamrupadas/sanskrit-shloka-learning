# Production-деплой backend в Railway

Status: ready-for-agent

## Problem Statement

Backend MVP технически подготовлен к Railway, но его выпуск в production пока опирается на устаревший ручной процесс: в репозитории нет обязательного backend CI, runbook требует вручную выбирать и запускать deployment, а Railway Project и его dashboard-настройки ещё не созданы. В результате владелец приложения не может безопасно полагаться на автоматический выпуск изменений из `main`: нет единого проверяемого барьера перед сборкой, не зафиксирована точная область backend-related изменений и не оформлена воспроизводимая последовательность первого запуска, проверки и rollback.

Нужен минимальный production-процесс для одного разработчика и одного backend-сервиса, который сохраняет уже реализованные барьеры сборки, миграций и readiness, но устраняет постоянное ручное продвижение релизов. При этом процесс должен учитывать осознанные ограничения MVP: общую для development и production базу Neon, временный локальный origin frontend, одну реплику и отсутствие отдельной observability-платформы.

## Solution

Backend выпускается в отдельный Railway Project штатным GitHub autodeploy из ветки `main`. Один узкий GitHub Actions workflow проверяет только API и влияющие на него workspace/deployment-зависимости на Node 24; Railway ожидает успешный CI через `Wait for CI`, затем последовательно выполняет Railpack build, compiled pre-deploy migrations, запуск API и readiness healthcheck. Изменения, относящиеся только к frontend, не запускают backend CI и deployment.

Репозиторий получает минимальную CI-конфигурацию, закреплённую major-версию Node, синхронизированные области запуска CI и Railway и обновлённый production runbook. В Railway Dashboard владелец один раз создаёт проект и сервис, подключает GitHub source, задаёт production variables и выполняет один контролируемый bootstrap зелёного SHA. После bootstrap все подходящие изменения в `main` выпускаются автоматически. Первый deployment проверяется по стадиям Railway и коротким smoke-check через локальный frontend; дальнейшие сбои и rollback обрабатываются по явно описанной политике.

## User Stories

1. Как владелец приложения, я хочу иметь отдельный Railway Project для production backend, чтобы production-ресурсы не смешивались с другими проектами и окружениями.
2. Как владелец приложения, я хочу запускать один backend-сервис в одном production environment, чтобы топология MVP оставалась простой и предсказуемой.
3. Как владелец приложения, я хочу использовать одну постоянно работающую реплику без Serverless, чтобы поведение API и стоимость соответствовали принятым ограничениям MVP.
4. Как разработчик, я хочу подключить Railway к текущему GitHub-репозиторию и ветке `main`, чтобы подходящие изменения автоматически становились кандидатами на production deployment.
5. Как разработчик, я хочу собирать backend из корня pnpm monorepo, чтобы сборка видела общий lockfile, workspace-конфигурацию, TypeScript-конфигурацию и API-контракт.
6. Как разработчик, я хочу запускать backend CI только для изменений API, API-контракта и их build/deployment-зависимостей, чтобы frontend-only изменения не тратили время на ненужный backend pipeline.
7. Как разработчик, я хочу, чтобы Railway watch patterns и GitHub Actions path filters описывали одну и ту же область изменений, чтобы CI и deployment не расходились в решении о необходимости релиза.
8. Как разработчик, я хочу, чтобы изменение самого backend CI считалось изменением release pipeline, чтобы новая версия CI была проверена до следующего автоматического deployment.
9. Как разработчик, я хочу использовать Node 24 и frozen pnpm install в CI и production build, чтобы release pipeline был воспроизводимым и не зависел от изменяемых defaults платформы.
10. Как разработчик, я хочу последовательно выполнять typecheck, тесты и production build API вместе с его workspace-зависимостями, чтобы до Railway доходил только проверенный commit.
11. Как разработчик, я хочу отменять незавершённую CI-проверку устаревшего commit при новом push, чтобы pipeline не тратил ресурсы и Railway не ожидал уже неактуальный результат.
12. Как владелец приложения, я хочу, чтобы Railway ожидал успешный GitHub CI перед продолжением deployment, чтобы непроверенный commit не становился активной production-версией.
13. Как владелец приложения, я хочу выполнить ровно один контролируемый ручной bootstrap, чтобы создать первый deployment без добавления постоянного ручного promotion шага.
14. Как владелец приложения, я хочу перед bootstrap сверить SHA с текущим `main` и его успешным backend CI, чтобы осознанное исключение первого запуска не ослабляло проверку выбранного кода.
15. Как владелец приложения, я хочу после bootstrap проверить, что GitHub autodeploy и `Wait for CI` включены, чтобы все последующие backend-релизы проходили выбранный автоматический pipeline.
16. Как владелец приложения, я хочу использовать Railway-generated public domain до frontend-деплоя, чтобы backend можно было проверить без преждевременной настройки custom domains.
17. Как владелец приложения, я хочу хранить production variables и secrets только в Railway Dashboard, чтобы чувствительные значения не попадали в репозиторий и CI-конфигурацию.
18. Как владелец приложения, я хочу передать API pooled endpoint существующей Neon DB, а migration runner — direct endpoint той же базы, чтобы runtime и миграции использовали предназначенные для них соединения.
19. Как владелец приложения, я хочу ограничить backend pool пятью соединениями, чтобы одна реплика MVP не создавала избыточную нагрузку на общую Neon DB.
20. Как владелец приложения, я хочу позволить Railway самостоятельно предоставить `PORT`, чтобы сервис корректно запускался в managed runtime без ручной привязки порта.
21. Как владелец приложения, я хочу временно разрешить точный origin локального frontend, чтобы проверить браузерный login и защищённые страницы до отдельного frontend deployment.
22. Как пользователь, я хочу, чтобы production API становился активным только после успешной сборки, миграций и readiness, чтобы незапускающаяся версия не перехватывала пользовательский трафик.
23. Как владелец приложения, я хочу видеть, что pre-deploy migration runner успешно применил pending migrations или безопасно пропустил уже применённые, чтобы состояние общей Neon DB было подтверждено перед активацией версии.
24. Как владелец приложения, я хочу, чтобы неуспешный pre-deploy завершал deployment, чтобы API не запускался поверх неподготовленной схемы БД.
25. Как владелец приложения, я хочу, чтобы readiness проверял доступность БД до переключения трафика, чтобы Railway активировал только действительно готовый backend.
26. Как владелец приложения, я хочу после первого запуска проверить build, pre-deploy, runtime и readiness в Railway, чтобы подтвердить работу всей release-цепочки, а не только отдельного процесса API.
27. Как владелец приложения, я хочу проверить production backend через вход существующего пользователя и открытие защищённой страницы в локальном frontend, чтобы одним smoke-check подтвердить public routing, CORS, auth и доступ к общей Neon DB.
28. Как владелец приложения, я хочу проверить runtime logs на startup errors и явную утечку секретов, чтобы обнаружить критические эксплуатационные проблемы до завершения первого запуска.
29. Как пользователь, я хочу, чтобы предыдущий активный deployment продолжал обслуживать запросы при ошибке CI, сборки, миграции или readiness новой версии, чтобы неудачный релиз не создавал лишний простой.
30. Как владелец приложения, я хочу откатывать регрессию активированной версии через Railway rollback только при совместимости схемы, чтобы восстановление приложения не повреждало данные.
31. Как владелец приложения, я хочу использовать forward fix после несовместимого изменения схемы, чтобы не выполнять опасный обратный SQL без отдельного recovery-плана.
32. Как разработчик, я хочу иметь актуальный runbook настройки, первого запуска, проверки, ошибок и rollback, чтобы production-процесс можно было повторить без восстановления решений из истории обсуждений.
33. Как разработчик, я хочу сохранить Railway CLI deployment только как документированный fallback, чтобы не добавлять token и второй механизм оркестрации до подтверждённой проблемы с `Wait for CI`.
34. Как владелец приложения, я хочу явно передать frontend effort обязанность заменить временный CORS origin на точный production HTTPS origin, чтобы браузерный доступ сохранился после frontend deployment.
35. Как владелец приложения, я хочу вынести разделение Neon environments, custom domains, monitoring и alerting в отдельные усилия, чтобы первый backend production deployment оставался сфокусированным и достижимым.

## Implementation Decisions

- Production-топология состоит из отдельного Railway Project, одного production environment, одного backend service и одной реплики. Serverless отключён; регион выбирается близко к существующей Neon DB. Новые cost alerts и Compute hard limit в рамках этой спецификации не настраиваются.
- Deployment source — текущий GitHub-репозиторий и ветка `main`. Сервис собирается из корня shared pnpm monorepo с помощью Railpack и repository-owned Railway config.
- Основной release pipeline — native Railway GitHub autodeploy. Постоянный ручной promotion и заранее подготовленный Railway CLI workflow не используются.
- В репозитории добавляется один backend CI workflow для push в `main`. Он использует Node major 24, версию pnpm из package metadata, frozen install и последовательно запускает `typecheck`, `test`, `build` для API и его workspace-зависимостей.
- Node major 24 закрепляется в package metadata так, чтобы одно ограничение учитывали локальные инструменты, GitHub Actions и Railpack.
- CI использует concurrency по ветке и отменяет незавершённый запуск для устаревшего commit после нового push.
- Path filters CI охватывают API, API-контракт и все общие файлы, влияющие на их install, typecheck, tests, build или deployment. Railway watch patterns синхронизируются с этой областью и дополнительно считают изменение backend CI изменением release pipeline. Frontend-only изменения не запускают backend CI или Railway deployment.
- Railway Dashboard хранит настройки, которые нельзя надёжно выразить config-as-code: GitHub source и branch, autodeploy, `Wait for CI`, service root, variables, secrets, generated domain, region и replica/serverless settings.
- До первого запуска задаются `NODE_ENV=production`, точный временный `FRONTEND_ORIGIN=http://localhost:5173`, pooled `DATABASE_URL`, direct `DATABASE_DIRECT_URL` той же Neon DB и `DATABASE_POOL_MAX=5`. `PORT` вручную не задаётся.
- Существующая Neon DB временно общая для development и production. Это принятый MVP-риск, а не целевая изоляция окружений. Миграции продолжают выполняться только compiled pre-deploy runner через direct endpoint.
- Новая DB migration и изменения runtime-кода для этого production deployment не нужны. Существующие production env validation, bind к platform port, CORS guardrail, migration runner, health endpoints и graceful shutdown сохраняются.
- Допускается один ручной bootstrap через применение Railway staged changes. Перед ним оператор проверяет, что выбранный SHA равен текущему `main` и имеет успешный backend CI. После него оператор обязательно проверяет включённые autodeploy и `Wait for CI`; все дальнейшие подходящие push выпускаются автоматически.
- Railway выполняет барьеры в порядке: успешный GitHub CI, Railpack build, compiled pre-deploy migrations, запуск API, `/health/ready`, активация deployment. Ошибка любого барьера до активации не заменяет предыдущую активную версию.
- Первый deployment принимается только после проверки Railway-стадий и runtime logs, а затем ручного smoke-check через локальный frontend с production API base URL. Smoke-check включает вход существующего пользователя и открытие одной защищённой страницы.
- В первый smoke-check не входят отдельные проверки rate limit, запрещённого origin, request ID и admin API: выбранный сценарий уже покрывает критический пользовательский путь public routing + CORS + auth + DB.
- Railway rollback разрешён для регрессии уже активированной версии только после подтверждения совместимости со схемой Neon. Railway не откатывает миграции; при несовместимом изменении схемы применяется forward fix, а обратный SQL требует отдельного recovery-плана.
- Если реальный запуск подтвердит отсутствие или ненадёжность `Wait for CI`, native autodeploy отключается и отдельным изменением вводится GitHub Actions deploy job с Railway CLI для проверенного commit. Только тогда создаются Railway token в GitHub Secrets и второй этап CI; Railpack build, pre-deploy migrations и readiness остаются прежними.
- Production runbook обновляется под выбранный autodeploy pipeline и описывает bootstrap, dashboard settings, variables, первый запуск, smoke-check, failure handling, rollback и границы следующих усилий.

## Testing Decisions

- Основной автоматизированный тестовый шов — один обязательный backend CI status на уровне deployable API и его workspace-зависимостей. Он проверяет наблюдаемый release-контракт: выбранный commit устанавливается из lockfile, проходит typecheck и существующие тесты и создаёт production build. Проверки не должны зависеть от внутренней структуры workflow или дублировать реализацию Railway.
- CI запускает существующие проверки API и API-контракта через их публичные workspace scripts. Это сохраняет уже используемый в monorepo способ проверять backend и не вводит отдельный тестовый интерфейс только ради deployment.
- Хороший автоматизированный тест здесь доказывает внешне значимый результат: API и контракт совместимы, тесты проходят, production artifacts собираются. Он не проверяет текст YAML, конкретные шаги action по отдельности или внутреннее устройство Nest-модулей.
- Высший end-to-end шов для первого production deployment — ручной smoke-check уже активного Railway domain через локальный frontend: вход существующего пользователя и открытие защищённой страницы. Этот сценарий одновременно подтверждает routing, точный CORS origin, auth, API contract на реальном запросе и доступ к Neon.
- Deployment gates проверяются по внешнему поведению Railway: failed CI/build/pre-deploy/readiness не активирует кандидат, успешный readiness переводит deployment в `Active`, а предыдущая версия остаётся активной при неуспешном кандидате.
- Существующие образцы для проверок — workspace-команды `typecheck`, `test`, `build`, backend-тесты на встроенном Node test runner, проверки API-контракта, compiled migration runner и раздельные liveness/readiness endpoints. Runbook использует те же швы для воспроизводимой ручной проверки.
- Новые runtime unit или integration tests не требуются, поскольку спецификация не меняет поведение API, миграций, health endpoints или доменную логику. Если реализация выйдет за эти границы, тесты добавляются на самом высоком затронутом внешнем шве.

## Out of Scope

- Deployment frontend и настройка окончательного публичного API URL во frontend.
- Custom `app`/`api` domains, DNS, TLS и окончательный production `FRONTEND_ORIGIN`.
- Разделение общей Neon DB на отдельные development и production environments, перенос данных или смена database provider.
- Новая DB migration, изменение schema, migration runner или runtime-кода API.
- Production alerting, внешний uptime monitoring, incident workflow, APM и полноценная observability-платформа.
- Autoscaling, Serverless, несколько Railway-реплик и shared storage для rate limits.
- Новые cost alerts или Compute hard limit.
- Предварительная реализация Railway CLI deploy workflow или создание Railway token в GitHub Secrets.
- Автоматический браузерный end-to-end smoke-check production и расширенная ручная проверка rate limits, запрещённых origins, request ID или admin API.
- Автоматический rollback DB, обратные SQL-миграции и recovery-план для несовместимых изменений схемы.

## Further Notes

- Настройки Railway и первый deployment требуют ручных действий владельца в Railway Dashboard; изменения репозитория сами по себе production-сервис не создают.
- `FRONTEND_ORIGIN=http://localhost:5173` — временный точный cross-origin allowlist, а не same-origin режим и не wildcard. Frontend deployment обязан заменить его на точный production HTTPS origin и повторить login/CORS smoke-check.
- Railway healthcheck является deployment gate, но не постоянным monitoring после активации. Отсутствие внешнего мониторинга принято только как временная граница MVP.
- Общая Neon DB означает, что pre-deploy runner, вероятнее всего, увидит уже применённые migrations; успешная проверка history и checksums всё равно остаётся обязательной частью deployment.
- Реализацию следует начинать с изменений репозитория и зелёного backend CI в `main`, а затем выполнять Railway bootstrap по обновлённому runbook.
