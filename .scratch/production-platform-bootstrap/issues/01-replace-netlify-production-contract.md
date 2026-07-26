# 01 — Перевести production-контракт ShlokaHub с Netlify на канонический origin

**What to build:** актуальный production-контракт ShlokaHub больше не зависит от Netlify: repository и эксплуатационная документация используют канонический application origin, а Railway принимает браузерные запросы только с этого origin.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] Netlify удалён из актуальной production-конфигурации и operational-документации; канонический frontend указан как `https://app.shlokahub.com`.
- [ ] Локальная разработка по-прежнему использует отдельный origin `http://localhost:5173`.
- [ ] Production Railway service использует ровно `FRONTEND_ORIGIN=https://app.shlokahub.com`, без localhost и прежнего Netlify origin.
- [ ] После применения изменения Railway deployment активен, а generated readiness endpoint возвращает успешный ответ.
- [ ] Runtime-значения и Secrets не добавлены в repository или отчёт о проверке.
