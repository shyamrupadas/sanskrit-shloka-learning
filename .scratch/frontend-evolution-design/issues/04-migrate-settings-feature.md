# 04 — Перенести настройки Учетной записи

**What to build:** Перенести полный settings-сценарий в самостоятельную фичу: загрузка и сохранение hard mode, отображение данных Учетной записи, переход в Админку для Администратора и logout. Фича использует app-level layout и глобальную session/API-модель, но не импортирует `app` или реализацию `admin`.

**Blocked by:** None — can start immediately

**Status:** awaiting-human-review
Accepted: 2026-07-04

- [ ] Settings route открывает публичную страницу фичи внутри authenticated layout.
- [ ] Hard mode загружается и сохраняется с прежними pending, success и error states.
- [ ] Действие перехода в Админку видно только Администратору.
- [ ] Переход в Админку выполняется через route и не создает зависимости от реализации `admin`.
- [ ] Logout очищает сессию и перенаправляет Пользователя на вход.
- [ ] Settings-тесты проверяют обычную и административную Учетную запись через публичный интерфейс фичи.
- [ ] Legacy settings удален без compatibility re-export.
- [ ] Внешний вид, API-вызовы, query keys и пользовательское поведение не изменены.
- [ ] Lint, typecheck и unit-тесты проходят.

## Parent

`.scratch/frontend-evolution-design/spec.md`
