# 07 — Переключить Sadhana на новый VDS

**What to build:** пользователи продолжают открывать оба сайта Sadhana по прежним каноническим адресам после контролируемого DNS cutover, при этом несвязанные API и почтовые сервисы остаются без изменений.

**Blocked by:** 05 — Восстановить Sadhana application на новом VDS; 06 — Восстановить Sadhana landing на новом VDS

**Status:** awaiting-human-review
Accepted: 2026-07-30

- [x] Только статические A-записи landing, `www` и application переведены на новый VDS в режиме `DNS only`; Railway API CNAME и почтовые записи не изменены.
- [x] После публичного DNS resolution выпущены отдельные certificate groups для landing-имён и application-имени.
- [x] HTTP перенаправляется на HTTPS, а `www` landing постоянно перенаправляется на канонический адрес с сохранением path и query.
- [x] Nginx проходит синтаксическую проверку, сертификаты проходят dry run обновления, оба публичных сайта Sadhana доступны по HTTPS.
- [x] Прямое открытие вложенного application route и неизвестный `Host` дают ожидаемые безопасные результаты.

Ручная инструкция: [`docs/operations/sadhana-dns-cutover.md`](../../../docs/operations/sadhana-dns-cutover.md)
