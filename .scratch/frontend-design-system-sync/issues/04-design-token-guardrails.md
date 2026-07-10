# Добавить guardrails от дрейфа токенов и PWA-цветов

Status: ready-for-human
Accepted: 2026-07-10

## Родитель

`.scratch/frontend-design-system-sync/PRD.md`

## Что сделать

Добавить автоматические проверки, которые удерживают frontend от возврата к произвольным цветам и несогласованным PWA-артефактам после появления token contract. Guardrails должны быть достаточно строгими для новых drift-ошибок, но не превращать текущую миграцию в полный шумный запрет Tailwind utility classes.

## Критерии приемки

- [x] Проверка запрещает новые произвольные hex/OKLCH цвета в frontend-коде вне token/generator слоя.
- [x] Проверка PWA colors подтверждает, что theme colors, manifest colors и icon colors синхронизированы с token contract.
- [x] Magic-size ограничения вводятся только там, где есть готовая token/component основа, и не блокируют всю миграцию страниц сразу.
- [x] Guardrails документируют допустимые исключения для token/generator слоя.
- [x] Проверки интегрированы в существующий frontend quality workflow без создания параллельного test harness.
- [x] Тесты/fixtures guardrail-проверок демонстрируют запрещенный drift и разрешенный token-driven путь.
- [x] Существующие Tailwind utility classes не запрещаются полностью.
- [x] Обязательные frontend-проверки проходят.

## Pencil references

- Раздел: `01 Foundations` (`otJrw`)

## Заблокировано

Нет - можно начинать сразу

## Agent report

Pencil references:
- Screens: none
- Components/sections: `01 Foundations` (`otJrw`)
- Exceptions: none

Guardrails:
- Raw hex/OKLCH scan runs in web unit tests over `src`, `public` and `index.html`, with documented token/theme/PWA artifact exceptions.
- PWA theme, manifest and icon colors remain checked against `pwaThemeTokens`.
- Magic-size scan is scoped to `src/shared/design-system/components/`, so existing pages and generic Tailwind scale utilities are not blocked during migration.
