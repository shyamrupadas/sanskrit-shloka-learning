# 02 — Перенести auth и session как первый ED-срез

**What to build:** Провести первый полный tracer bullet через целевую архитектуру: `app` запускает приложение и маршрутизирует auth-экраны, `auth` владеет входом и регистрацией, а `shared` предоставляет session/API-модель и test harness.

Session-модуль должен скрывать local storage, восстановление и очистку сессии, создание авторизованного API-клиента, logout и обработку невалидной сессии. Публичный интерфейс auth должен содержать только route-level страницы; формы, hooks и submit-логика остаются внутренними.

Остальные экраны могут временно оставаться в legacy-структуре, но должны продолжать открываться через новый app router до своих вертикальных срезов.

**Blocked by:** None — can start immediately

**Status:** awaiting-human-review
Accepted: 2026-07-04

- [ ] `app` владеет React bootstrap, глобальными providers и router.
- [ ] Вход и регистрация принадлежат одной фиче `auth` с небольшим public API.
- [ ] Route-level страницы входа и регистрации могут быть публичными entry points фичи без обязательного barrel-файла.
- [ ] Глобальная session-модель и создание API-клиента принадлежат `shared`, а не `auth`.
- [ ] Route constants для auth routes принадлежат `shared` там, где это не ухудшает типизацию TanStack Router.
- [ ] LocalStorage keys и формат сохраненной Учетной записи не изменены.
- [ ] Вход, регистрация, валидация паролей, показ пароля, ошибки и redirects работают как до рефакторинга.
- [ ] Logout и очистка невалидной сессии сохраняют прежнее поведение.
- [ ] Auth-тесты проверяют поведение через публичные страницы фичи и общий test harness.
- [ ] App-тесты этого среза проверяют providers, auth routes и guards, а не внутренности форм.
- [ ] Старые реализации auth/session удалены без постоянных compatibility re-export.
- [ ] Lint, typecheck и unit-тесты проходят.

## Parent

`.scratch/frontend-evolution-design/spec.md`
