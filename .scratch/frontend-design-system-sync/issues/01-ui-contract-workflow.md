# Закрепить UI-contract workflow для frontend-задач

Status: ready-for-human
Accepted: 2026-07-09

## Родитель

`.scratch/frontend-design-system-sync/PRD.md`

## Что сделать

Сделать Pencil-дизайн обязательным UI-контрактом в агентском workflow: будущие PRD, issues, frontend-задачи и финальные отчеты должны явно ссылаться на Pencil screens/components или возвращать структурированный `UI Contract Collision`. После этого среза агент, reviewer и владелец продукта должны видеть один процесс подготовки UI-задач, а `design/new-design.pen` должен быть помечен deprecated.

## Критерии приемки

- [x] Workflow для задач с видимым UI требует Pencil references в формате human-readable name + `nodeId`.
- [x] Workflow для задач без готового UI-контракта требует structured `UI Contract Collision`, а не свободный комментарий или молчаливую импровизацию.
- [x] Правила явно фиксируют, что `design/pencil-design.pen` является каноническим UI-контрактом, а `design/new-design.pen` deprecated.
- [x] Правила объясняют, что функциональное поведение остается за PRD, доменными документами, ADR и API-контрактом.
- [x] Правила для backend/API-only задач фиксируют, когда UI-контракт не нужен, а когда новый пользовательский сценарий должен быть связан с будущим UI-контрактом.
- [x] Навигационный индекс Pencil-экранов и компонентов пригоден для подготовки issues и reviewer-проверки.
- [x] Формат финального отчета по UI-задаче включает использованные screens, components и exceptions.
- [x] Известное правило про допустимые мелкие responsive/overflow решения отделено от продуктовых или визуальных коллизий, которые требуют решения владельца продукта.
- [x] Issue tracker instructions ссылаются на UI-contract workflow для задач, меняющих видимый frontend UI.
- [x] Проверка не меняет пользовательское поведение приложения и не реализует frontend UI.

## Заблокировано

Нет - можно начинать сразу
