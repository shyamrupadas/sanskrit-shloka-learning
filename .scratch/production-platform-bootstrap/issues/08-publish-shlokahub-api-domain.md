# 08 — Опубликовать Railway API через api.shlokahub.com

**What to build:** ShlokaHub API доступен по стабильному публичному домену с TLS под управлением Railway, чтобы будущий application release не зависел от generated hostname.

**Blocked by:** 07 — Переключить Sadhana на новый VDS

**Status:** awaiting-human-review
Accepted: 2026-08-02

- [x] `api.shlokahub.com` добавлен к существующему production backend service без создания нового сервиса.
- [x] В Cloudflare созданы ровно выданные Railway CNAME и TXT records в режиме `DNS only`.
- [x] Railway подтвердил ownership и TLS нового имени, а `https://api.shlokahub.com/health/ready` возвращает `200` и безопасный readiness-ответ.
- [x] Railway-generated hostname сохранён после проверки custom domain.
- [x] Фактические Railway targets и certificate identifiers не записаны в repository или planning artifacts.

Ручная инструкция: [`docs/operations/shlokahub-api-domain.md`](../../../docs/operations/shlokahub-api-domain.md)
