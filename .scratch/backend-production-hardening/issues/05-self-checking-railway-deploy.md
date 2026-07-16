# Сделать Railway deploy самопроверяемым

Status: ready-for-agent

## Родитель

`.scratch/backend-production-hardening/PRD.md` — пользовательские истории 1, 23, 27, 30–33 и 38–42.

## Что сделать

Завершить production tracer bullet от собранного monorepo до активной Railway-реплики. API предоставляет раздельные liveness/readiness endpoints, корректно закрывается по `SIGTERM`, а Railway config-as-code фиксирует build, compiled migration pre-deploy, start, readiness healthcheck и graceful draining.

В том же срезе подготовить короткий production runbook для одного разработчика: обязательные Railway/Neon variables, ручное продвижение первых релизов, локальные проверки, smoke-check после deploy, диагностика failed migration и явно отложенные security/reliability задачи.

Railway healthcheck используется как deploy gate, а не объявляется постоянным monitoring. Новый CI, APM или real-Postgres test environment не создается.

## Критерии приемки

- [ ] Liveness endpoint возвращает `200`, когда Node/Nest process способен обслужить HTTP, и не обращается к БД.
- [ ] Readiness endpoint выполняет короткую проверку PostgreSQL через итоговый DB-service seam, возвращает `200` при готовности и безопасный `503` при timeout/connection error.
- [ ] Health responses не раскрывают connection string, SQL, stack trace или внутренние DB-сообщения.
- [ ] Nest shutdown hooks включены; `SIGTERM` инициирует graceful shutdown и закрытие pool через lifecycle hook до Railway force kill.
- [ ] Railway config-as-code содержит workspace-aware API build, скомпилированную pre-deploy migration command, start command, readiness path и ограниченный draining interval.
- [ ] Failed build, migration или readiness не активирует новую версию; успешная версия слушает Railway-provided port на `0.0.0.0`.
- [ ] Конфигурация рассчитана на одну долгоживущую реплику без serverless/autoscaling и не добавляет Dockerfile без доказанной необходимости.
- [ ] Production runbook перечисляет `NODE_ENV`, `PORT`, точный frontend origin, pooled runtime URL и direct migration URL без включения реальных секретов.
- [ ] Runbook описывает ручной порядок: локальные tests/typecheck/build, ручное подтверждение deploy, чтение pre-deploy logs и проверка readiness.
- [ ] Smoke-checklist покрывает разрешенный/запрещенный Origin, login, auth rate limit, одно чтение каталога, одну существующую пользовательскую запись, request ID и отсутствие секретов в логах.
- [ ] Runbook объясняет, что Railway healthcheck проверяет новую версию при deploy, но не заменяет постоянный uptime monitoring после активации.
- [ ] Failed migration оставляет понятный порядок действий: не редактировать примененную migration, исправить причиной или следующей migration и повторить deploy.
- [ ] Как обязательный post-production follow-up записан переход от Bearer/localStorage к отдельно спроектированному безопасному session transport с HttpOnly cookie и CSRF-защитой.
- [ ] Как будущие задачи записаны разделение runtime/migration DB-ролей, runtime HTTP validation, shared rate-limit storage до второй реплики и real-Postgres tests при росте проекта.
- [ ] Автоматические health/lifecycle tests и весь существующий API regression-набор проходят; затем выполнен и задокументирован ручной Railway/Neon smoke-check без вывода секретов.
- [ ] Frontend UI, Pencil-контракт, продуктовые endpoints и schema БД не меняются; новые DB migrations не требуются.

## Заблокировано

- `.scratch/backend-production-hardening/issues/03-safe-production-migrations.md`
