# 01 — Подготовить доверенный контур выпуска landing

**What to build:** владелец приложения получает готовый и проверенный контур production-выпуска landing: предыдущий application rollout принят, готовый landing repository предоставляет согласованный артефакт, а automation может доставлять его только через доверенное SSH-соединение без административного доступа к VDS.

**Blocked by:** None — can start immediately

**Status:** awaiting-human-review
Accepted: 2026-08-06

- [x] Спецификация `shlokahub-application-production-release` принята человеком; автоматические и ручные проверки первого application rollout подтверждены как успешные.
- [x] Отдельный landing repository готов к выпуску из ветки `master` и детерминированно предоставляет обязательный release artifact `dist/index.html`; создание и содержимое landing не входят в этот тикет.
- [x] Repository Variables содержат deployment host и пользователя `deploy`, а чувствительные значения не ошибочно сохранены как публичные Variables.
- [x] Repository Secrets содержат согласованный private SSH key и полную `known_hosts` строку, полученную и сверенную в рамках доверенного bootstrap общей платформы.
- [x] Automation-пользователь входит только по ключу, не имеет `sudo`, имеет необходимый доступ к выделенному landing root и не может администрировать Nginx, TLS или системную конфигурацию.
- [x] Проверка контура и её отчёт не раскрывают private key, host IP, host-key строку, Secret values, access tokens или иные чувствительные production-данные.

## Внешние предусловия

Локальный граф допускает ссылки только на тикеты из этого каталога. Фактическими
внешними предусловиями остаются принятая спецификация
`shlokahub-application-production-release` и готовый отдельный landing repository;
критерии приёмки не позволяют завершить тикет до их выполнения.
