# 07 — Перевести auth, dashboard и library baseline на Pencil design system

**What to build:** Перевести видимый baseline экранов auth, dashboard и library на Pencil-синхронизированные tokens и project components, сохранив существующее поведение продукта. После среза пользователь должен видеть согласованный визуальный язык на входе, регистрации, дашборде, библиотеке и странице шлоки, а route-level проверки должны подтверждать пользовательские состояния вместо приватной структуры компонентов.

**Blocked by:** None — can start immediately

**Status:** awaiting-human-review
Accepted: 2026-07-11

- [x] Экраны регистрации и входа используют Pencil-синхронизированную тему, поля и кнопки без изменения auth behavior.
- [x] Dashboard states используют project components для review pack, want-to-learn block, streak indicator, empty state и shloka card там, где они применимы.
- [x] Library tabs, search state, shloka cards, empty states и страница шлоки используют project components или явно зафиксированное UI-contract решение.
- [x] Известные collision по `Показать еще N`, `Показать все` и специфичным пустым состояниям вкладок имеют принятое решение или явно исключены из этого baseline-среза.
- [x] Длинные названия и текст шлок не ломают mobile layout.
- [x] Dashboard остается спокойным по визуальной плотности и не усиливает давление количеством повторений сверх Pencil-паттерна.
- [x] Route-level tests покрывают пользовательские состояния auth, dashboard и library без проверки приватной композиции project components.
- [x] Playwright или существующий full-app seam проверяет ключевые auth/dashboard/library экраны на mobile-first размерах, включая `390x844` и `360x800`.
- [x] Existing routes, route params, query keys, localStorage keys, API calls and generated API artifacts не меняются.
- [x] Backend, схема базы данных и данные не меняются; новые DB migrations не требуются.
- [x] Обязательные frontend-проверки проходят.

## Parent

`.scratch/frontend-design-system-sync/spec.md`

## Pencil references

- Экран: `Регистрация` (`Wklvv`)
- Экран: `Вход` (`J9sKf`)
- Экран: `Дашборд - обычный` (`xJFoj`)
- Экран: `Дашборд - новый пользователь` (`iT1Xy`)
- Экран: `Дашборд - повторения завершены` (`V5wKHO`)
- Экран: `Библиотека — повторяю` (`fLWms`)
- Экран: `Библиотека — буду учить` (`g0MoYL`)
- Экран: `Библиотека — все` (`tCzug`)
- Экран: `Библиотека — нет результатов` (`LeWUO`)
- Экран: `Страница шлоки` (`Q0ALx5`)
- Компонент: `Product / Shloka Card` (`Vzs9b`)
- Компонент: `Product / Empty State` (`RPtlw`)
- Компонент: `Product / Tabs / Library` (`T8Ktz7`)
- Компонент: `Product / Review Pack / Active` (`MTM4W`)
- Компонент: `Product / Review Pack / Completed` (`zE99y`)
- Компонент: `Product / Want To Learn Block` (`OPAt8`)
- Компонент: `Product / Want To Learn Block / Empty` (`Kir4Y`)
- Компонент: `Product / Streak Indicator` (`e16iU`)

## Принятые UI-решения

- Решение пользователя от 2026-07-11: активное состояние library tabs следует
  фактически выбранной вкладке. Экранные инстансы `Библиотека — повторяю`
  (`fLWms`), `Библиотека — буду учить` (`g0MoYL`), `Библиотека — все`
  (`tCzug`) и `Библиотека — нет результатов` (`LeWUO`) обновлены в Pencil.
- Решение пользователя от 2026-07-11: для сохранения существующего library
  behavior разрешены компактные опциональные статус и действие в code
  component `ShlokaCard`; перевод в library card не отображается, а текст
  ограничен первой строкой с ellipsis по контракту `Product / Shloka Card`
  (`Vzs9b` на текущей версии Pencil).
- Последующее решение пользователя от 2026-07-13 отменяет часть решения про
  excerpt: актуальный `Product / Shloka Card` (`Vzs9b`) показывает только
  отображаемое название и не показывает паду шлоки или другой фрагмент
  канонического текста. Компактные status/action в code component сохраняются.
- Решение пользователя от 2026-07-11 по `UIC-DS-003`: вкладки `Повторяю` и
  `Буду учить` используют общий визуальный контракт `Product / Empty State`
  (`RPtlw`) с продуктовыми текстами API и опциональным action. Dashboard
  передает action, library empty/search states сохраняют текущее поведение без
  action.
- `UIC-DS-001` и `UIC-DS-002` исключены из baseline-среза: текущий публичный
  API возвращает только `EmptyDashboardDto`, поэтому active/completed review
  pack, streak и раскрываемый want-to-learn list недостижимы без запрещенного
  изменения API-контракта.

## Результат

- Auth forms переведены на Pencil-синхронизированные поля, размеры controls,
  карточки и checkbox `Показать пароль`; регистрация, вход, валидация и
  redirects сохранены.
- Добавлены shared project components `EmptyState`, `LibraryTabs` и
  `ShlokaCard`; dashboard использует локальный empty want-to-learn block поверх
  общего `EmptyState`.
- Library получила синхронизированные tabs, search field, карточки, empty/search
  states и минимальную страницу шлоки. Статусные действия сохранены по
  принятому исключению; перевод скрыт, excerpt ограничен первой строкой с
  ellipsis.
- Route-level tests проверяют доступные пользовательские состояния, а
  Playwright проверяет auth, empty dashboard, library, длинную карточку,
  страницу шлоки и navigation shell на `390x844` и `360x800`.
- Маршруты, params, query/localStorage keys, API calls, generated API artifacts,
  backend и БД не менялись; миграции не требуются.

Pencil references:

- Screens: `Регистрация` (`Wklvv`), `Вход` (`J9sKf`),
  `Дашборд - новый пользователь` (`iT1Xy`), `Библиотека — повторяю`
  (`fLWms`), `Библиотека — буду учить` (`g0MoYL`), `Библиотека — все`
  (`tCzug`), `Библиотека — нет результатов` (`LeWUO`), `Страница шлоки`
  (`Q0ALx5`).
- Components: `Core / Button / Primary` (`M6qnk`), `Core / Field / Input`
  (`VvKs5`), `Product / Field / Email` (`PEmail`),
  `Product / Field / Password` (`PPass`), `Product / Shloka Card` (`Vzs9b`),
  `Product / Empty State` (`RPtlw`), `Product / Tabs / Library` (`T8Ktz7`),
  `Product / Want To Learn Block / Empty` (`Kir4Y`),
  `Product / Bottom Navigation` (`S7Pta`).
- Exceptions: одобренные пользователем 2026-07-11 компактные опциональные
  status/action для `ShlokaCard` и опциональный action для `EmptyState`;
  перевод скрыт, а решение про excerpt отменено пользователем 2026-07-13 в
  соответствии с актуальным `Product / Shloka Card` (`Vzs9b`).
  `UIC-DS-001` и `UIC-DS-002` исключены как недостижимые в текущем
  API-контракте. Library tab instances обновлены пользователем в Pencil,
  поэтому exception для active tab не требуется.
