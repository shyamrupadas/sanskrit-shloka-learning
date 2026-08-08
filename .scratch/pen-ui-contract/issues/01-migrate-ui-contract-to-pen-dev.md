# 01 — Перевести UI-контракт на pen.dev workflow

**What to build:** Перевести канонический дизайн и связанные repository rules на актуальный pen.dev workflow, чтобы сохраненный `.pen` оставался единственным утвержденным визуальным источником истины, факты о нем получались напрямую через Pencil tools, а устаревшие naming, статическая карта и machine-specific MCP-конфигурация больше не создавали дрейф.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] Канонический design artifact переименован с legacy Pencil naming на pen.dev naming без изменения содержимого или визуального контракта.
- [ ] Активные agent instructions, design docs, ADR, specs, tickets и research artifacts используют актуальное имя канонического дизайна и терминологию pen.dev.
- [ ] Внешнее имя MCP-сервера `pencil`, tool namespace, названия сторонних источников и несвязанные одноименные symbols сохранены без искусственного переименования.
- [ ] Новый design workflow однозначно разделяет read-only headless CLI и design edit через Desktop MCP, запрещает raw-чтение/редактирование `.pen` и не допускает CLI fallback для записи.
- [ ] Workflow фиксирует обязательную human review паузу: агент не сохраняет измененный canvas, а сохранение владельцем продукта означает утверждение дизайна.
- [ ] Workflow фиксирует обязательное чтение актуального design contract перед видимыми frontend-изменениями и visual comparison реализации через Playwright без требования pixel-perfect diff.
- [ ] Невозможность автоматического screenshot review оформляется как visual verification gate, который владелец может закрыть явной ручной проверкой без создания UI-contract exception.
- [ ] Статическая навигационная карта design nodes удалена, а все обязательные ссылки на нее заменены прямым Pencil tool access к сохраненному `.pen`.
- [ ] Актуальные намеренные расхождения дизайна и кода перенесены в отдельный минимальный exception registry; каждая сохраненная запись имеет причину, design reference, область реализации и условие удаления.
- [ ] Exception registry проверен против текущего дизайна, кода и принятых решений; устаревшие, разрешенные или уже не применимые записи удалены, а нерешенные collisions остаются в соответствующих specs/tickets.
- [ ] Существующий ADR сохраняет решение использовать `.pen` как UI-контракт, но больше не требует статическую карту; новый ADR и новые термины предметного словаря не добавлены.
- [ ] Project-scoped Desktop MCP entry с абсолютным application path удален, глобальная конфигурация pen.dev признана источником desktop-интеграции, а переносимые project MCP servers не изменены.
- [ ] Repository instructions остаются компактными и направляют релевантные задачи к канонической pen.dev policy без перечисления нерелевантных сценариев.
- [ ] Узкий repository search не находит активных ссылок на удаленную карту, старое имя канонического дизайна или старое имя будущего skill; допустимые внешние и исторические названия явно отличены от stale project terminology.
- [ ] Конфигурационные и Markdown-файлы проходят синтаксическую/структурную проверку, а изменение не затрагивает product UI, frontend behavior, API, БД или Git index.

## Parent

`.scratch/pen-ui-contract/spec.md`
