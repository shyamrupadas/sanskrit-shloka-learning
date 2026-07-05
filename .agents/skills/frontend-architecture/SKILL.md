---
name: frontend-architecture
description: Audit and evolve the apps/web frontend architecture. Use when Codex needs to review module boundaries or interfaces, choose a module evolution stage, move files between current app/features/shared modules, or perform architecture-preserving frontend refactors. Do not use for a local product change that preserves module responsibility and interface.
---

# Frontend Architecture

## Контекст

Перед архитектурной работой прочитать:

- `AGENTS.md`
- `apps/web/AGENTS.md`
- `docs/architecture/frontend.md`
- `docs/adr/0003-evolution-design-for-frontend-architecture.md`
- актуальный issue или PRD в `.scratch/`, если пользователь дал путь

## Workflow

1. Снять карту текущего состояния: `find apps/web/src -maxdepth 4 -type f | sort`, затем `rg "from ['\"]@/|import\\(['\"]@/" apps/web/src`.
2. Сопоставить файлы, зависимости и interfaces с `docs/architecture/frontend.md`; не дублировать его правила в skill.
3. Выбрать минимальный этап эволюции для каждого затронутого модуля.
4. Эволюционировать снизу вверх, когда меняются границы: `shared` -> session/API infrastructure -> `app` composition -> `features`.
5. Обновить внешние импорты через interface многофайлового модуля.
6. Запустить проверки из `apps/web/AGENTS.md`.

## Аудит

Проверить:

- Каждый файл имеет одну понятную ответственность в целевой модели.
- Зависимости и interfaces соответствуют живой спецификации и ESLint.
- Внешний interface модуля остается небольшим, а implementation — локальным.
- Внешние импорты не обходят public API многофайловых модулей.

## Выбор Этапа Модуля

Выбирать самый простой этап, который объясняет текущую сложность:

- Single-file module: один экран или маленькая фича без устойчивых внутренних ответственностей.
- Flat module: несколько файлов рядом, когда появились тесты, helper или небольшой дочерний компонент.
- Grouped module: группы `ui`, `model`, `lib`, `api`, когда ответственности уже мешают читать flat module.
- Internal submodules: только для крупной фичи вроде `admin`, где есть несколько связанных сценариев и общая внутренняя модель.

## Безопасная Эволюция

Сохранять наблюдаемое поведение:

- Не менять route paths, route params, query keys, localStorage keys, API calls и generated API artifacts.
- Не менять визуальный дизайн при архитектурном переносе.
- Сначала переносить файлы без редактирования логики, затем обновлять import specifiers.
- Делать один seam за раз и запускать проверки после завершенного шага.
- Если фича становится многофайловой, сформировать намеренный внешний interface по живой спецификации.
- Тесты держать у публичного интерфейса модуля; не закреплять приватные hooks,
  внутренние компоненты или обходные пути.

## Отчет

В финальном отчете по архитектурной задаче указать:

- какие границы `app/features/shared` изменены;
- какие public API добавлены или сохранены;
- какие проверки прошли;
- есть ли обходы public API или временные compatibility imports.
