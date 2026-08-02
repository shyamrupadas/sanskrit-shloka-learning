# Автоматический production-выпуск ShlokaHub application

Status: awaiting-human-review

## Problem Statement

После подготовки общей VDS-платформы application frontend ShlokaHub всё ещё не имеет
собственного production release pipeline. Сборка находится в текущем pnpm monorepo,
зависит от общего API-контракта и должна получать публичный API URL во время build.
Без точных path filters, обязательных quality gates, проверенного SSH host key и
post-deploy smoke-check любой push может либо не выпустить нужное изменение, либо
записать непроверенный или неверно настроенный артефакт в production.

Владелец приложения должен получить простой автоматический выпуск из `main`, который
не требует Node.js на VDS и не допускает параллельного прерывания неатомарного
`rsync`. Одновременно MVP не должен преждевременно вводить release-каталоги,
автоматический rollback или блокирующий Playwright pipeline.

## Solution

Текущий monorepo получает один последовательный GitHub Actions workflow
`verify → build → deploy → smoke`. Он запускается после подходящего push в `main`,
устанавливает зависимости по lockfile, проверяет workspace-зависимости, lint,
typecheck, API contract и frontend unit tests, собирает application с точным
`VITE_API_BASE_URL=https://api.shlokahub.com`, а затем синхронизирует готовый
статический артефакт в отдельный application document root на VDS.

Workflow использует минимальные GitHub permissions, последовательную concurrency,
заранее проверенный `known_hosts` и key-only automation access. Выпуск считается
успешным только после автоматической проверки канонического application URL,
вложенного SPA route и публичного API readiness, а первый rollout дополнительно
принимается ручной проверкой CORS, входа существующего пользователя и защищённой
страницы.

## User Stories

1. Как владелец приложения, я хочу автоматически выпускать application после подходящего push в `main`, чтобы production соответствовал проверенному состоянию основной ветки.
2. Как разработчик, я хочу запускать application workflow только при изменениях frontend, API-контракта или общих build/deploy зависимостей, чтобы несвязанные backend-only изменения не инициировали deploy.
3. Как разработчик, я хочу считать изменение самого deploy workflow причиной нового выпуска, чтобы pipeline проверял собственные изменения.
4. Как разработчик, я хочу использовать версию Node и pnpm из repository metadata, чтобы локальная и CI-сборки не расходились по runtime.
5. Как разработчик, я хочу выполнять frozen install, чтобы release не изменял lockfile и оставался воспроизводимым.
6. Как разработчик, я хочу сначала собрать workspace-зависимости frontend, чтобы проверки application использовали актуальный сгенерированный API-контракт.
7. Как разработчик, я хочу блокировать deploy при ошибке lint, чтобы нарушение frontend-стандартов не попадало в production.
8. Как разработчик, я хочу блокировать deploy при ошибке typecheck frontend и его workspace-зависимостей, чтобы несовместимые типы не попадали в production bundle.
9. Как разработчик, я хочу блокировать deploy при ошибке API-contract tests, чтобы frontend собирался только против согласованного HTTP-контракта.
10. Как разработчик, я хочу блокировать deploy при ошибке frontend unit tests, чтобы известная продуктовая регрессия не выпускалась автоматически.
11. Как разработчик, я хочу не включать Playwright E2E в обязательный release gate, чтобы первый MVP deploy не зависел от ещё не подготовленного production E2E окружения.
12. Как владелец приложения, я хочу задавать `VITE_API_BASE_URL` как публичную Repository Variable, чтобы build использовал канонический API domain без ошибочной классификации публичного значения как Secret.
13. Как разработчик, я хочу явно проверять точное значение API URL без завершающего slash до сборки, чтобы неверная variable не создала работающий, но неправильно направленный bundle.
14. Как пользователь, я хочу, чтобы production application обращался к `https://api.shlokahub.com`, чтобы браузер использовал согласованные DNS, TLS и CORS.
15. Как разработчик, я хочу проверять наличие production entry artifact до SSH, чтобы пустая или неправильная сборка не удаляла рабочий сайт через `rsync --delete`.
16. Как владелец приложения, я хочу хранить private SSH key и проверенную host-key строку в GitHub Secrets, чтобы чувствительные данные не находились в workflow или repository.
17. Как разработчик, я хочу использовать `BatchMode`, фиксированную identity и строгую host-key verification, чтобы deploy завершался ошибкой вместо интерактивного или недоверенного SSH-соединения.
18. Как владелец приложения, я хочу, чтобы deploy-user не имел `sudo`, чтобы frontend workflow мог менять только предназначенный статический root.
19. Как разработчик, я хочу синхронизировать только содержимое готового application артефакта в выделенный root, чтобы на VDS не требовались исходники, package manager или build toolchain.
20. Как владелец приложения, я хочу удалять устаревшие файлы при deploy, чтобы production root точно соответствовал текущему артефакту.
21. Как владелец приложения, я хочу запретить отмену уже начавшегося deploy новым push, чтобы два неатомарных `rsync` не смешали содержимое разных commits.
22. Как разработчик, я хочу, чтобы более новый deploy ждал текущий в собственной concurrency queue, чтобы releases выполнялись последовательно.
23. Как пользователь, я хочу получать успешный ответ по `https://app.shlokahub.com/`, чтобы канонический application URL работал сразу после выпуска.
24. Как пользователь, я хочу напрямую открывать вложенный route `/login`, чтобы Nginx SPA fallback и frontend routing работали вместе.
25. Как владелец приложения, я хочу проверять API readiness после каждого deploy frontend, чтобы application release не считался успешным при недоступном production API.
26. Как владелец приложения, я хочу вручную проверить CORS preflight после первого выпуска, чтобы build-time API URL и Railway `FRONTEND_ORIGIN` были подтверждены в реальном браузерном маршруте.
27. Как существующий пользователь, я хочу войти в production application и открыть защищённую страницу, чтобы rollout подтвердил auth, CORS, API routing и чтение данных.
28. Как владелец приложения, я хочу проверить прямое открытие вложенного SPA route в браузере, чтобы automated HTTP check не пропустил ошибку client routing.
29. Как оператор, я хочу проверить память, swap, диск и OOM после первого deploy, чтобы подтвердить достаточность общего VDS.
30. Как разработчик, я хочу получать красный workflow при неуспешном smoke-check, чтобы сбой production-маршрута был виден в том же release pipeline.
31. Как владелец приложения, я хочу исправлять неудачный release через `git revert` и новый push в `main`, чтобы rollback сохранял один понятный механизм выпуска.
32. Как владелец приложения, я хочу выпускать landing только после успешной автоматической и ручной проверки application, чтобы порядок rollout оставался контролируемым.

## Implementation Decisions

- Эта спецификация реализуется только после завершения `production-platform-bootstrap`; готовые VDS document root, DNS, TLS, Railway custom domain, production CORS и automation account являются предусловиями.
- В текущем pnpm/Turbo monorepo добавляется один application production workflow с одним последовательным job: checkout, install, verify, build, artifact guard, deploy и smoke.
- Trigger — только push в `main`. Ручной `workflow_dispatch` и GitHub Environment approval не добавляются.
- Path filters охватывают web application, API-contract workspace, root dependency/workspace metadata, общие TypeScript/Turbo build settings и сам application workflow.
- Workflow имеет только `contents: read`.
- Concurrency выделена для application production deploy; `cancel-in-progress: false`, чтобы уже начавшийся прямой `rsync` не прерывался и следующий запуск ожидал его завершения.
- Node major и pnpm берутся из repository package metadata; зависимости устанавливаются в frozen mode.
- Release gates выполняются в согласованном порядке: build workspace-зависимостей web, web lint, typecheck web вместе с зависимостями, API-contract tests, web unit tests и production build.
- Playwright E2E не блокирует deploy. Первый production пользовательский сценарий выполняется вручную после автоматического smoke-check.
- Публичная Repository Variable `VITE_API_BASE_URL` обязана точно равняться `https://api.shlokahub.com` без завершающего slash. Workflow валидирует это до build и явно передаёт значение процессу Vite.
- Repository Variables также содержат deployment host и пользователя `deploy`; private key и полная проверенная `known_hosts` строка хранятся как Secrets.
- Workflow не выполняет runtime `ssh-keyscan` и использует batch/key-only SSH со строгой host-key verification.
- Production build обязан создать `dist/index.html` application. Artifact guard выполняется до соединения с VDS и до любой операции с `--delete`.
- В VDS передаётся только содержимое готового application `dist`; синхронизация выполняется прямым `rsync --delete` в выделенный ShlokaHub application root.
- На VDS не устанавливаются Node.js, pnpm и исходный код приложения; Nginx раздаёт статический артефакт со SPA fallback, подготовленным платформенной спецификацией.
- После deploy workflow автоматически проверяет `https://app.shlokahub.com/`, прямой `/login` и `https://api.shlokahub.com/health/ready` с fail-on-error и ограниченными retries.
- Ошибка smoke-check делает workflow неуспешным, но не запускает автоматический rollback. Восстановление выполняется исправлением или `git revert` с новым push в `main`.
- Первый release принимается только после ручных CORS preflight, входа существующего пользователя, загрузки защищённой страницы, прямого открытия вложенного route и проверки ресурсов VDS.
- Release landing не начинается, пока application не прошёл автоматические и ручные проверки.
- Изменения backend runtime, API contract, пользовательского UI, схемы БД и новые DB migrations не требуются.

## Testing Decisions

- Главный тестовый шов — публичный production application: канонический `/`, прямой вложенный `/login` и API readiness. Хороший тест проверяет HTTP/TLS/SPA поведение после фактического deploy и не привязывается к внутренним steps или тексту workflow.
- До deploy используются существующие высокоуровневые repository gates: web lint, typecheck, Vitest unit/component/integration suite и API-contract tests. Они тестируют внешний модульный контракт и пользовательское поведение, а не новую инфраструктурную реализацию.
- Prior art для frontend — существующие Vitest/React Testing Library tests публичных страниц и app flows; они уже покрывают login, session state, routing и защищённую оболочку без реальной сети.
- Prior art для API contract — существующий contract test сгенерированного OpenAPI и client/server типов; изменение contract не должно миновать этот gate.
- Prior art для production auth — существующие Playwright login/logout scenarios. Они не становятся автоматическим release gate, но задают ручной первый smoke-сценарий: вход существующего пользователя и открытие защищённой страницы.
- Проверка `/login` выполняется прямым HTTP-запросом после deploy, чтобы отдельно подтвердить Nginx SPA fallback; браузерная проверка подтверждает, что client router действительно открывает route.
- API readiness проверяется в том же post-deploy job, чтобы release не считался успешным при рассогласованном frontend/API cutover.
- Artifact guard проверяет внешний build contract `dist/index.html`; тестирование конкретной структуры bundle и содержимого workflow не требуется.
- Новые продуктовые тесты добавляются только если реализация обнаружит изменение наблюдаемого поведения. Изменение одной deployment automation не должно порождать unit tests её внутренних shell-команд.
- Ручной отчёт первого выпуска не содержит access token, private key, пароли, host IP или другие Secrets.

## Out of Scope

- Bootstrap VDS, перенос Sadhana, Cloudflare DNS, Nginx/TLS и Railway custom domain; это предусловия из `production-platform-bootstrap`.
- Создание и выпуск ShlokaHub landing; это следующая спецификация.
- Новая frontend-функциональность, изменение видимого UI или Pencil-контракта.
- Изменение API product contract, backend runtime, Railway deployment topology или Neon.
- Playwright как блокирующий CI gate для каждого production deploy.
- Ручной `workflow_dispatch`, GitHub Environment approval и отдельный promotion job.
- Передача артефактов между jobs, release archives и provenance/attestation.
- Атомарные release-каталоги, symlink switch, автоматический rollback и хранение истории релизов на VDS.
- Docker, container registry, Kubernetes и self-hosted runner.
- Cloudflare proxy/CDN/WAF и постоянный uptime monitoring.
- Разделение общего automation user или SSH-ключа между repositories в рамках MVP.
- Новые DB migrations.

## Further Notes

- Источник решений — шаг 7 итогового production-плана карты `shlokahub-vds-production`.
- Прямой `rsync --delete` принят как простой MVP-механизм. Поэтому artifact guard и последовательная concurrency являются обязательными защитами, а прерывание текущего deploy запрещено.
- Публичный API URL не является секретом и должен оставаться Repository Variable. SSH private key и проверенная host-key строка являются Secrets.
- После успешного первого выпуска эта спецификация разблокирует `shlokahub-landing-production-release`.
- Спецификация готова к декомпозиции через `to-tickets`: trigger, gates, deploy contract, smoke-check и rollback policy определены.
