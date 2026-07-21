# 03 — Перенести dashboard и защищенный layout

**What to build:** Завершить первый защищенный пользовательский путь после входа: app-level guard направляет Пользователя на dashboard, глобальный authenticated layout показывает нижнюю навигацию, а самостоятельная фича `dashboard` загружает и отображает свое состояние.

Глобальная оболочка должна компоновать route content, а не подключаться внутри каждой страницы. Для Админки сохранить отдельный app-level layout без нижней навигации. Legacy-экраны, которые еще не перенесены в фичи, должны временно использовать эти layouts через router и не импортировать `app`.

**Blocked by:** None — can start immediately

**Status:** awaiting-human-review
Accepted: 2026-07-04

- [ ] Пользователь после успешного входа попадает на прежний dashboard route.
- [ ] Незащищенный Пользователь перенаправляется на вход с прежним поведением.
- [ ] Authenticated layout владеет нижней навигацией и компонует содержимое защищенных routes.
- [ ] Admin layout не показывает нижнюю навигацию и сохраняет проверку роли Администратора.
- [ ] Глобальная композиция приложения, включая root stylesheet и route constants для защищенных routes, принадлежит `app`/`shared`, а не legacy root files.
- [ ] Dashboard принадлежит самостоятельной фиче и остается простым модулем без искусственного дробления.
- [ ] Loading, error и empty states dashboard, а также переход в Общую библиотеку шлок не изменены.
- [ ] Оставшиеся legacy-экраны не импортируют app-level layout.
- [ ] Dashboard-тесты проверяют публичное поведение фичи; app-тесты проверяют guards, layouts и навигацию.
- [ ] Старая глобальная оболочка и legacy dashboard удалены без compatibility re-export.
- [ ] Lint, typecheck и unit-тесты проходят.

## Parent

`.scratch/frontend-evolution-design/spec.md`
