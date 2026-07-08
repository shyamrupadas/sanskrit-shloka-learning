# Добавить guardrails от дрейфа токенов и PWA-цветов

Status: ready-for-agent

## Родитель

`.scratch/frontend-design-system-sync/PRD.md`

## Что сделать

Добавить автоматические проверки, которые удерживают frontend от возврата к произвольным цветам и несогласованным PWA-артефактам после появления token contract. Guardrails должны быть достаточно строгими для новых drift-ошибок, но не превращать текущую миграцию в полный шумный запрет Tailwind utility classes.

## Критерии приемки

- [ ] Проверка запрещает новые произвольные hex/OKLCH цвета в frontend-коде вне token/generator слоя.
- [ ] Проверка PWA colors подтверждает, что theme colors, manifest colors и icon colors синхронизированы с token contract.
- [ ] Magic-size ограничения вводятся только там, где есть готовая token/component основа, и не блокируют всю миграцию страниц сразу.
- [ ] Guardrails документируют допустимые исключения для token/generator слоя.
- [ ] Проверки интегрированы в существующий frontend quality workflow без создания параллельного test harness.
- [ ] Тесты/fixtures guardrail-проверок демонстрируют запрещенный drift и разрешенный token-driven путь.
- [ ] Существующие Tailwind utility classes не запрещаются полностью.
- [ ] Обязательные frontend-проверки проходят.

## Pencil references

- Раздел: `01 Foundations` (`otJrw`)

## Заблокировано

- `.scratch/frontend-design-system-sync/issues/03-design-token-contract-pencil-theme.md`
