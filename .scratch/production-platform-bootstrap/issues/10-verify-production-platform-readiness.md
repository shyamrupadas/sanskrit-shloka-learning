# 10 — Подтвердить готовность общей production-платформы

**What to build:** оператор получает проверенное подтверждение, что общая платформа безопасно обслуживает Sadhana и готова принять будущие ShlokaHub application и landing releases без дополнительных инфраструктурных решений.

**Blocked by:** 08 — Опубликовать Railway API через api.shlokahub.com; 09 — Подготовить DNS и TLS статических сайтов ShlokaHub

**Status:** awaiting-human-review
Accepted: 2026-08-02

- [x] Оба production-сайта Sadhana доступны по каноническим HTTPS-адресам, включая прямое открытие вложенного application route.
- [x] Публичный ShlokaHub API readiness endpoint возвращает `200`, а статические ShlokaHub имена имеют корректные DNS, TLS и redirect-контракты до первого deploy.
- [x] Повторно подтверждены SSH-матрица, firewall, фактически открытые порты, Nginx routing, безопасный default host, ownership и Certbot dry run.
- [x] Зафиксированы безопасные показатели диска, `MemAvailable`, swap, OOM, load, traffic, размеров журналов и `reboot-required`.
- [x] Итоговый отчёт содержит timestamps и безопасные результаты, но не раскрывает IP, ключи, host-key строку, Railway targets, certificate identifiers или Secret values.
- [x] Не выполнены ShlokaHub application или landing deploy: они остаются работой следующих двух спецификаций.

## Итоговый отчёт

- `2026-08-02T14:48:58Z` — публичные DNS, TLS, HTTP redirects, оба сайта
  Sadhana, вложенный application route, статические имена ShlokaHub и API readiness:
  PASS.
- `2026-08-02T14:52:25Z`–`2026-08-02T14:52:54Z` — automation SSH,
  запрет password/forwarding/TTY, активные host services, публичные TCP listeners
  только `22`, `80`, `443`, ownership и безопасный default host: PASS.
- `2026-08-02T14:52:54Z` — root filesystem занят на 58%, доступно 4072 МиБ;
  `MemAvailable` 751 МиБ; swap использует 1 МиБ; load average за 15 минут 0.09;
  журналы Nginx занимают 1 МиБ, system journal — 8 МиБ; `reboot-required`
  отсутствует.
- `2026-08-02T14:54:41Z` — оператор повторно подтвердил SSH-матрицу с
  административным доступом, firewall, Nginx syntax/routing, отсутствие OOM events,
  безопасный уровень месячного traffic и успешный Certbot dry run: PASS.
- ShlokaHub application и landing deploy не выполнялись.

Итог: **PASS**. Отчёт намеренно не содержит IP, ключи, host-key строку, Railway
targets, certificate identifiers или Secret values.
