# 03 — Поднять изолированную HTTP-платформу для четырёх сайтов

**What to build:** один VDS независимо обслуживает landing и application сайты Sadhana и ShlokaHub, не смешивая их артефакты и не предоставляя automation-пользователю административные права на Nginx или сертификаты.

**Blocked by:** 02 — Обеспечить безопасный административный и automation-доступ к VDS

**Status:** awaiting-human-review
Accepted: 2026-07-26

Ручная инструкция: [`docs/operations/vds-http-platform.md`](../../../docs/operations/vds-http-platform.md)

- [x] Установлены необходимые системные компоненты для раздачи статики и управления TLS; Node.js, package manager и production build toolchain на VDS отсутствуют.
- [x] Каждый из четырёх сайтов имеет отдельный document root, принадлежащий automation-пользователю; Nginx имеет только доступ на чтение.
- [x] Для четырёх сайтов настроены независимые HTTP virtual hosts: application hosts поддерживают SPA fallback, landing hosts раздают обычные статические пути.
- [x] Прямое открытие вложенного application route возвращает SPA, а неизвестный `Host` не получает содержимое ни одного сайта.
- [x] Конфигурация Nginx проходит синтаксическую проверку, а каждый virtual host проверен через внешний HTTP-интерфейс до DNS cutover.
