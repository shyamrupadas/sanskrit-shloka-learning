# 06 — Завершить coexistence и удалить Railway

**What to build:** После подтверждённой работы канонического домена завершить временное сосуществование площадок, чтобы production backend обслуживался только Amvera и repository больше не содержал устаревший Railway deployment contract.

**Blocked by:** 05 — Переключить api.shlokahub.com на Amvera

**Status:** awaiting-human-review
Accepted: 2026-09-11

- [x] Railway service удалён только после принятого canonical-domain smoke-check, и больше не создаёт расходов или параллельного production deployment.
- [x] Railway-specific deployment configuration и устаревшие operational instructions удалены из repository без несвязанных инфраструктурных рефакторингов.
- [x] Актуальная документация описывает Amvera как временный production runtime, `amvera-api` как release pointer, startup migrations как однорепличное ограничение и порядок обычного выпуска backend.
- [x] Документация фиксирует, что при будущем переходе на VDS служебная ветка удаляется, image становится immutable по SHA/digest, а migrations выносятся в отдельный release step до масштабирования.
- [x] После удаления Railway канонические health endpoints и пользовательский smoke-check через `https://api.shlokahub.com` остаются успешными.
- [x] Временная схема не расширена registry, Amvera CLI, дополнительными probes, мониторингом, автоматическим rollback или иной инфраструктурой вне текущего переезда.

## Parent

`.scratch/backend-amvera-production/spec.md`


## Результаты и приёмка — 2026-09-11

Пользователь сообщил об удалении проекта Railway, подтвердил работающий сайт
и явно поручил закрыть тикет и спеку после очистки репозитория. Последовательность
удаления и предыдущей приёмки учитывается с уточнением из тикета 05; удаление проекта
и пользовательский smoke-check приняты по подтверждению владельца. Биллинг и
интерфейс Railway агентом не проверялись.

- Удалены `railway.json`, его path filter в Backend CI и устаревшие гайдбуки
  `railway-production.md` и `shlokahub-api-domain.md`.
- Актуальные инструкции и ссылки обновлены под Amvera; описаны обычный выпуск,
  одна реплика, startup migrations и будущий переход на VDS с immutable image,
  отдельным release step для миграций и удалением `amvera-api`/promotion job.
- Поиск по текущим файлам вне `.scratch` не находит Railway/Railpack ни в содержимом,
  ни в именах файлов. Старые тикеты и спеки сохранены как история.
- Все 29 локальных Markdown-ссылок в README и operations ведут на существующие файлы.
- Агент повторно проверил `/health/live` и `/health/ready` канонического HTTPS API
  после сообщения об удалении проекта: оба HTTP `200`, `{"status":"ok"}`.
- Точечный API-тест HTTP guardrails: 4/4; `pnpm typecheck` и `pnpm test` успешны.
  В полном запуске API: 106/106; неизменённые web/contract проверки взяты из Turbo cache.
- Итоговое ревью Standards и Spec: замечаний нет. Новая инфраструктура и миграции БД
  не добавлялись.
