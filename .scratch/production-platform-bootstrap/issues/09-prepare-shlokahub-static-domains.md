# 09 — Подготовить DNS и TLS статических сайтов ShlokaHub

**What to build:** канонические landing и application имена ShlokaHub направлены на изолированные virtual hosts нового VDS и готовы безопасно принять первые артефакты из следующих production-release спецификаций.

**Blocked by:** 07 — Переключить Sadhana на новый VDS

**Status:** awaiting-human-review
Accepted: 2026-08-02

- [x] Три статических имени ShlokaHub резолвятся на новый VDS через A-записи в режиме `DNS only`.
- [x] Выпущены отдельные certificate groups для landing с его `www`-именем и application без `www`-имени.
- [x] HTTP перенаправляется на HTTPS; `www`-имя landing постоянно перенаправляется на канонический адрес с сохранением path и query.
- [x] Application virtual host поддерживает SPA fallback, неизвестный `Host` не раскрывает сайт, а пустые roots могут безопасно возвращать `404` до будущих deploy.
- [x] Nginx проходит синтаксическую проверку, сертификаты проходят dry run обновления, а фактические certificate identifiers не сохранены в repository.

Ручная инструкция: [`docs/operations/shlokahub-static-domains.md`](../../../docs/operations/shlokahub-static-domains.md)
