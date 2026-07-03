# Удалить legacy-архитектуру и проверить ED small

Status: ready-for-agent

## Родитель

`.scratch/frontend-evolution-design/PRD.md`

## Что сделать

Завершить архитектурную серию после всех независимых feature-срезов: удалить оставшуюся legacy-структуру и временные compatibility imports, провести аудит через project skill и подтвердить целевое состояние полным frontend verification.

Монолитные app-тесты должны содержать только providers, router, guards и layouts. Поведение каждой фичи должно проверяться рядом с ее публичным интерфейсом. Новую функциональность и визуальный рефакторинг в этот срез не включать.

## Критерии приемки

- [ ] Верхний уровень frontend source содержит только `app`, `features` и `shared`.
- [ ] Отдельные верхнеуровневые `pages` и `services` отсутствуют.
- [ ] Legacy `components`, `auth`, `api`, `lib`, `test` и временные compatibility imports удалены.
- [ ] `auth`, `dashboard`, `settings`, `library`, `admin` доступны только через согласованные public API.
- [ ] `admin` содержит внутренние подмодули `catalog`, `source-editor`, `shloka-editor`.
- [ ] App-тесты проверяют только providers, router, guards, layouts и глобальную навигацию.
- [ ] Поведенческие тесты всех фич находятся на их публичных seams; старые дублирующие тесты удалены.
- [ ] Архитектурный skill не находит запрещенных направлений зависимостей или обхода public API.
- [ ] Lint, typecheck, unit-тесты, production build и E2E проходят.
- [ ] Маршруты, API-контракт, пользовательское поведение и визуальный дизайн не изменены.

## Заблокировано

- `.scratch/frontend-evolution-design/issues/04-migrate-settings-feature.md`
- `.scratch/frontend-evolution-design/issues/05-migrate-library-feature.md`
- `.scratch/frontend-evolution-design/issues/08-migrate-admin-shloka-editor.md`
