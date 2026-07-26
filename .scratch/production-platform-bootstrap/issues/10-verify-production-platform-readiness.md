# 10 — Подтвердить готовность общей production-платформы

**What to build:** оператор получает проверенное подтверждение, что общая платформа безопасно обслуживает Sadhana и готова принять будущие ShlokaHub application и landing releases без дополнительных инфраструктурных решений.

**Blocked by:** 08 — Опубликовать Railway API через api.shlokahub.com; 09 — Подготовить DNS и TLS статических сайтов ShlokaHub

**Status:** ready-for-agent

- [ ] Оба production-сайта Sadhana доступны по каноническим HTTPS-адресам, включая прямое открытие вложенного application route.
- [ ] Публичный ShlokaHub API readiness endpoint возвращает `200`, а статические ShlokaHub имена имеют корректные DNS, TLS и redirect-контракты до первого deploy.
- [ ] Повторно подтверждены SSH-матрица, firewall, фактически открытые порты, Nginx routing, безопасный default host, ownership и Certbot dry run.
- [ ] Зафиксированы безопасные показатели диска, `MemAvailable`, swap, OOM, load, traffic, размеров журналов и `reboot-required`.
- [ ] Итоговый отчёт содержит timestamps и безопасные результаты, но не раскрывает IP, ключи, host-key строку, Railway targets, certificate identifiers или Secret values.
- [ ] Не выполнены ShlokaHub application или landing deploy: они остаются работой следующих двух спецификаций.
