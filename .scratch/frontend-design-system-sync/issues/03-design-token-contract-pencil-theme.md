# 03 — Ввести code-token contract и синюю Pencil-тему приложения

**What to build:** Создать первый работающий контракт design tokens внутри web-приложения и синхронизировать тему приложения с Pencil: normalized tokens становятся источником для CSS variables, шрифта, синей brand-системы и PWA-производных артефактов. После среза приложение должно визуально перейти с текущей несогласованной темы на Pencil-согласованную основу без изменения маршрутов, API, данных или пользовательских сценариев.

**Blocked by:** None — can start immediately

**Status:** awaiting-human-review
Accepted: 2026-07-10

- [x] Code-token contract содержит normalized модель: reference palette, semantic colors, typography, spacing, radius, elevation и минимальные component tokens.
- [x] Каждый code-token имеет явную связь с Pencil variable или source value; несвязанные токены не считаются синхронизированными.
- [x] Токены размещены внутри web-приложения и сохраняют переносимую структуру без преждевременного workspace package.
- [x] CSS variables и frontend theme производятся из token contract или проверяются против него.
- [x] Текущий frontend primary заменен на Pencil-синхронизированную синюю систему.
- [x] Типографика приложения использует Pencil-синхронизированный шрифт и размеры как базовую тему.
- [x] PWA theme colors, manifest colors и icon colors берутся из design tokens или проверяются против них.
- [x] Shadcn configuration указывает на фактический CSS entrypoint приложения и актуальные aliases.
- [x] Focused token contract tests проверяют связь token contract, CSS variables, theme и PWA-производных артефактов.
- [x] Существующие routes, route params, query keys, localStorage keys, API calls, generated API artifacts и публичный HTTP/API-контракт не меняются.
- [x] Backend, схема базы данных и данные не меняются; новые DB migrations не требуются.
- [x] Обязательные frontend-проверки проходят.

## Parent

`.scratch/frontend-design-system-sync/spec.md`

## Pencil references

- Раздел: `01 Foundations` (`otJrw`)
- Раздел: `02 Core Components` (`R1N0L6`)
- Раздел: `03 Product Components` (`lgFfS`)

## Agent report

Pencil references:
- Screens: none
- Components/sections: "01 Foundations" (`otJrw`), "02 Core Components" (`R1N0L6`), "03 Product Components" (`lgFfS`)
- Exceptions: none
