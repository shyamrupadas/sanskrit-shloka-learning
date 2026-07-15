# Сделать runtime-работу с Neon предсказуемой при сбоях

Status: ready-for-agent

## Родитель

`.scratch/backend-production-hardening/PRD.md` — пользовательские истории 1–8, 14–19 и 35–37.

## Что сделать

Провести полный failure-path от `pg` pool до HTTP-ответа: runtime использует небольшой Neon-compatible pool, безопасное чтение получает не более одной повторной попытки после классифицированного обрыва, а запись и query timeout никогда автоматически не повторяются.

DB-модуль становится единственным владельцем pool policy, transaction lifecycle, классификации инфраструктурных ошибок и безопасной DB-диагностики. После исчерпания безопасной попытки защищенный API возвращает контролируемый `503`. Auth и authorization не принимают stale-сессию при failed DB refresh; ограниченный stale fallback остается только у некритичных публичных чтений каталога.

Raw SQL, `pg`, существующие repository interfaces и продуктовые результаты сохраняются. Новая система idempotency keys и server-side query cancellation не создается.

## Критерии приемки

- [ ] Runtime pool использует pooled database URL из валидированной конфигурации и явный небольшой maximum, рассчитанный на одну Railway-реплику; постоянный minimum не удерживается.
- [ ] Минутный `maxLifetimeSeconds` удален, connection timeout и TCP keepalive заданы осознанно, а увеличение pool требует изменения конфигурации, а не переписывания кода.
- [ ] `statement_timeout` и `lock_timeout` не передаются Neon PgBouncer как неподдерживаемые startup parameters.
- [ ] TLS не отключает проверку сертификата через `rejectUnauthorized: false` и сохраняет совместимость с официальным Neon connection string.
- [ ] DB-модуль централизованно различает transient connection error, client query timeout, SQL/constraint error и неизвестную ошибку; repository и сервисы не содержат собственных копий message matching для доступности БД.
- [ ] Read-only операция повторяется не более одного раза только после классифицированного transient connection error; warning log содержит категорию, duration и номер попытки без SQL values.
- [ ] Client query timeout не запускает retry, поскольку исходный SQL может продолжать выполняться на сервере.
- [ ] Универсальный retryable/idempotent write API удален; все существующие записи выполняются один раз и сохраняют прежние продуктовые ответы.
- [ ] Транзакция продолжает использовать один client для `begin`, операций, `commit`/`rollback`; поврежденный client не возвращается в pool как исправный.
- [ ] После неуспешного безопасного retry временная недоступность БД преобразуется в единый безопасный `503`; SQL-конфликты и неизвестные ошибки сохраняют свои корректные semantics.
- [ ] Auth lookup больше не использует stale-сессию после transient DB error. Короткий fresh cache имеет конечный размер и очищает истекшие записи.
- [ ] Stale fallback сохраняется только для некритичных публичных данных общей библиотеки; auth, authorization и административные чтения fail closed.
- [ ] При pool/connection error логируются безопасная категория ошибки и counters pool; токены, пароли, SQL-параметры и персональные данные не логируются.
- [ ] Тесты публичного DB-service seam покрывают обычное чтение, один допустимый retry, запрет retry для timeout/SQL error/write, transaction cleanup, pool shutdown и итоговый DB-unavailable error.
- [ ] Тесты AuthService подтверждают отсутствие stale fallback и ограниченность fresh cache; repository tests подтверждают, что записи больше не используют автоматический retry.
- [ ] Существующие API tests, typecheck и build проходят; schema migration, ORM и изменение HTTP product contract не требуются.

## Заблокировано

- `.scratch/backend-production-hardening/issues/01-secure-production-bootstrap.md`
