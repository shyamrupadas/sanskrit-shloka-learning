# 09 — Удалить legacy-архитектуру и проверить ED small

**What to build:** Завершить архитектурную серию после всех независимых feature-срезов: удалить оставшуюся legacy-структуру и временные compatibility imports, провести аудит через project skill, атомарно переключить архитектурные инструкции из migration mode в стабильный режим и подтвердить целевое состояние полным frontend verification.

Монолитные app-тесты должны содержать только providers, router, guards и layouts. Поведение каждой фичи должно проверяться рядом с ее публичным интерфейсом. Новую функциональность и визуальный рефакторинг в этот срез не включать.

**Blocked by:** None — can start immediately

**Status:** awaiting-human-review
Accepted: 2026-07-05

- [ ] Верхний уровень frontend source содержит только `app`, `features` и `shared`.
- [ ] Отдельные верхнеуровневые `pages` и `services` отсутствуют.
- [ ] Legacy `components`, `auth`, `api`, `lib`, `test` и временные compatibility imports удалены.
- [ ] `auth`, `dashboard`, `settings`, `library`, `admin` доступны только через согласованные public API.
- [ ] Public API фич ограничен `index.ts(x)` и route-level `*.page.tsx`; внешние импорты внутренних `ui`, `model`, `lib`, `api` отсутствуют.
- [ ] `admin` содержит внутренние подмодули `catalog`, `source-editor`, `shloka-editor`.
- [ ] App-тесты проверяют только providers, router, guards, layouts и глобальную навигацию.
- [ ] Поведенческие тесты всех фич находятся на их публичных seams; старые дублирующие тесты удалены.
- [ ] Архитектурный skill не находит запрещенных направлений зависимостей или обхода public API.
- [ ] ESLint guardrails используют поддерживаемую декларативную конфигурацию или документированный fallback и включают React hooks проверку.
- [ ] Все frontend-файлы распознаются архитектурным линтером; включены строгие `boundaries/no-unknown-files` и `boundaries/no-unknown`.
- [ ] Из `docs/architecture/frontend.md` удален migration mode, а документ описывает только актуальную архитектуру.
- [ ] `apps/web/AGENTS.md` требует читать живую спецификацию при добавлении или перемещении файлов, изменении зависимостей, interfaces или ответственности модулей, но не для локальной правки существующего implementation.
- [ ] Из `$frontend-architecture` удалены legacy-specific инструкции; skill остается workflow для аудита и эволюции текущей frontend-архитектуры.
- [ ] Lint, typecheck, unit-тесты, production build и E2E проходят.
- [ ] Маршруты, API-контракт, пользовательское поведение и визуальный дизайн не изменены.

## Parent

`.scratch/frontend-evolution-design/spec.md`
