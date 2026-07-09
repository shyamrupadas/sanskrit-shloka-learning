# Ввести code-token contract и синюю Pencil-тему приложения

Status: ready-for-agent

## Родитель

`.scratch/frontend-design-system-sync/PRD.md`

## Что сделать

Создать первый работающий контракт design tokens внутри web-приложения и синхронизировать тему приложения с Pencil: normalized tokens становятся источником для CSS variables, шрифта, синей brand-системы и PWA-производных артефактов. После среза приложение должно визуально перейти с текущей несогласованной темы на Pencil-согласованную основу без изменения маршрутов, API, данных или пользовательских сценариев.

## Критерии приемки

- [ ] Code-token contract содержит normalized модель: reference palette, semantic colors, typography, spacing, radius, elevation и минимальные component tokens.
- [ ] Каждый code-token имеет явную связь с Pencil variable или source value; несвязанные токены не считаются синхронизированными.
- [ ] Токены размещены внутри web-приложения и сохраняют переносимую структуру без преждевременного workspace package.
- [ ] CSS variables и frontend theme производятся из token contract или проверяются против него.
- [ ] Текущий frontend primary заменен на Pencil-синхронизированную синюю систему.
- [ ] Типографика приложения использует Pencil-синхронизированный шрифт и размеры как базовую тему.
- [ ] PWA theme colors, manifest colors и icon colors берутся из design tokens или проверяются против них.
- [ ] Shadcn configuration указывает на фактический CSS entrypoint приложения и актуальные aliases.
- [ ] Focused token contract tests проверяют связь token contract, CSS variables, theme и PWA-производных артефактов.
- [ ] Существующие routes, route params, query keys, localStorage keys, API calls, generated API artifacts и публичный HTTP/API-контракт не меняются.
- [ ] Backend, схема базы данных и данные не меняются; новые DB migrations не требуются.
- [ ] Обязательные frontend-проверки проходят.

## Pencil references

- Раздел: `01 Foundations` (`otJrw`)
- Раздел: `02 Core Components` (`R1N0L6`)
- Раздел: `03 Product Components` (`lgFfS`)

## Заблокировано

Нет - можно начинать сразу
