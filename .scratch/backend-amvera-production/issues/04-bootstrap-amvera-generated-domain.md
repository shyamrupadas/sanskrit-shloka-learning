# 04 — Развернуть и проверить API на бесплатном домене Amvera

**What to build:** Запустить проверенный backend release в Amvera, не затрагивая Railway и канонический DNS, и подтвердить на бесплатном HTTPS-домене платформы, что API запускается и подключается к Neon.

**Blocked by:** 02 — Сделать HTTP boundary независимым от Railway; 03 — Продвигать в Amvera только проверенный backend commit

**Status:** awaiting-human-review
Accepted: 2026-09-11

- [x] Amvera подключена к текущему GitHub repository, push webhook и target branch `amvera-api`; служебная ветка не используется для ручных commits или pull requests.
- [x] Приложение использует root Docker contract, одну API replica и порт `80` с явно заданной runtime-переменной `PORT=80` без отдельного Amvera manifest.
- [x] Runtime настроен с production mode, точным frontend origin, pooled runtime database endpoint, direct migration endpoint и pool limit; database URLs хранятся как Amvera secrets и отсутствуют в repository и GitHub Actions.
- [x] Первый promotion через штатный `GITHUB_TOKEN` вызывает синхронизацию и deployment; узкий fine-grained token вводится только если фактическая интеграция Amvera не реагирует на штатный push.
- [x] На бесплатном HTTPS-домене успешно отвечают `/health/live` и `/health/ready`, а логи подтверждают успешные build, migrations и startup без ошибок и явной утечки секретов.
- [x] Repository documentation описывает минимальный bootstrap, variables/secrets, webhook, ручную проверку health endpoints, проверку логов и HTTP-проверки без чувствительных значений.

## Parent

`.scratch/backend-amvera-production/spec.md`

## Подготовка ручного bootstrap — 2026-09-10

По решению пользователя настройки Amvera и внешние проверки выполняются вручную.
Пошаговая инструкция: `docs/operations/amvera-production.md`.

Удалённые `main` и `amvera-api` проверены через `git ls-remote`: обе указывают на
`7261f72fa7c859af27c1d85e332b984b43381cb2`. Это подтверждает наличие release-ветки,
но не успех Backend CI, доставку webhook или deployment. Эти результаты, runtime
настройки, ingress и пользовательский smoke-check ещё не подтверждены.

На момент подготовки ручная настройка и проверки ожидали выполнения.

## Уточнение объёма — 2026-09-11

По решению пользователя настройка Kubernetes readiness probe исключена из этого
переезда. Ручные проверки `/health/live` и `/health/ready` остаются обязательными.
Зависимость доступности редактора probes от тарифа не подтверждена.

## Результаты и приёмка — 2026-09-11

Пользователь выполнил ручную настройку, подтвердил успешную проверку и явно
попросил закрыть тикет. Критерии настройки приняты по подтверждению пользователя.
Непосредственно в сессии получены следующие свидетельства:

- Docker build завершился с exit code `0`, образ опубликован в реестре.
- После добавления runtime-переменной `PORT=80` интерфейс показывает «Запущено», реплики `1 / 1`.
- `https://shlokahub-api-shyam.amvera.io/health/live` — HTTP `200`, `{"status":"ok"}`.
- `https://shlokahub-api-shyam.amvera.io/health/ready` — HTTP `200`, `{"status":"ok"}`.
- Оба HTTP-ответа проверены агентом; пользователь также подтвердил успешный повтор команд.

По решению пользователя пункты 8, 9 и 10 инструкции исключены из приёмки:
пользовательский сценарий через временную подмену origin, ручная проверка
client-IP/rate limiting и отдельный отчёт. Они не выполнялись и не отмечаются
как успешно проверенные.
