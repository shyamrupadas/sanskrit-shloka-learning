# 04 — Развернуть и проверить API на бесплатном домене Amvera

**What to build:** Запустить проверенный backend release в Amvera, не затрагивая Railway и канонический DNS, и подтвердить на бесплатном HTTPS-домене платформы, что container startup, Neon, ingress и пользовательский сценарий работают вместе.

**Blocked by:** 02 — Сделать HTTP boundary независимым от Railway; 03 — Продвигать в Amvera только проверенный backend commit

**Status:** ready-for-human

- [ ] Amvera подключена к текущему GitHub repository, push webhook и target branch `amvera-api`; служебная ветка не используется для ручных commits или pull requests.
- [ ] Приложение использует root Docker contract, одну API replica и platform-provided port без отдельного Amvera manifest.
- [ ] Runtime настроен с production mode, точным frontend origin, pooled runtime database endpoint, direct migration endpoint и pool limit; database URLs хранятся как Amvera secrets и отсутствуют в repository и GitHub Actions.
- [ ] Первый promotion через штатный `GITHUB_TOKEN` вызывает синхронизацию и deployment; узкий fine-grained token вводится только если фактическая интеграция Amvera не реагирует на штатный push.
- [ ] На бесплатном HTTPS-домене успешно отвечают `/health/live` и `/health/ready`, а логи подтверждают успешные build, migrations и startup без ошибок и явной утечки секретов.
- [ ] Фактическое поведение ingress forwarding headers соответствует безопасному provider-neutral proxy contract; недоверенный публичный peer не может подменить client address.
- [ ] Через production frontend выполнены вход существующей учётной записью и загрузка одной защищённой страницы, подтверждающие routing, CORS, auth и чтение Neon.
- [x] Repository documentation описывает минимальный bootstrap, variables/secrets, webhook, ручную проверку health endpoints, проверку логов и smoke-check без чувствительных значений.

## Parent

`.scratch/backend-amvera-production/spec.md`

## Подготовка ручного bootstrap — 2026-09-10

По решению пользователя настройки Amvera и внешние проверки выполняются вручную.
Пошаговая инструкция: `docs/operations/amvera-production.md`.

Удалённые `main` и `amvera-api` проверены через `git ls-remote`: обе указывают на
`7261f72fa7c859af27c1d85e332b984b43381cb2`. Это подтверждает наличие release-ветки,
но не успех Backend CI, доставку webhook или deployment. Эти результаты, runtime
настройки, ingress и пользовательский smoke-check ещё не подтверждены.

Тикет остаётся `ready-for-human` до завершения ручной настройки и проверок.

## Уточнение объёма — 2026-09-11

По решению пользователя настройка Kubernetes readiness probe исключена из этого
переезда. Ручные проверки `/health/live` и `/health/ready` остаются обязательными.
Зависимость доступности редактора probes от тарифа не подтверждена.
