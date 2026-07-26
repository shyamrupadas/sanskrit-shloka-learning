# 09 — Подготовить DNS и TLS статических сайтов ShlokaHub

**What to build:** канонические landing и application имена ShlokaHub направлены на изолированные virtual hosts нового VDS и готовы безопасно принять первые артефакты из следующих production-release спецификаций.

**Blocked by:** 07 — Переключить Sadhana на новый VDS

**Status:** ready-for-agent

- [ ] Четыре статических имени ShlokaHub резолвятся на новый VDS через A-записи в режиме `DNS only`.
- [ ] Выпущены отдельные certificate groups для landing с его `www`-именем и application с его `www`-именем.
- [ ] HTTP перенаправляется на HTTPS; оба `www`-имени постоянно перенаправляются на соответствующие канонические адреса с сохранением path и query.
- [ ] Application virtual host поддерживает SPA fallback, неизвестный `Host` не раскрывает сайт, а пустые roots могут безопасно возвращать `404` до будущих deploy.
- [ ] Nginx проходит синтаксическую проверку, сертификаты проходят dry run обновления, а фактические certificate identifiers не сохранены в repository.
