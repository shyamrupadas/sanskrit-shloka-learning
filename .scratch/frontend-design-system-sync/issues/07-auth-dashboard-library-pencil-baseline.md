# Перевести auth, dashboard и library baseline на Pencil design system

Status: ready-for-agent

## Родитель

`.scratch/frontend-design-system-sync/PRD.md`

## Что сделать

Перевести видимый baseline экранов auth, dashboard и library на Pencil-синхронизированные tokens и project components, сохранив существующее поведение продукта. После среза пользователь должен видеть согласованный визуальный язык на входе, регистрации, дашборде, библиотеке и странице шлоки, а route-level проверки должны подтверждать пользовательские состояния вместо приватной структуры компонентов.

## Критерии приемки

- [ ] Экраны регистрации и входа используют Pencil-синхронизированную тему, поля и кнопки без изменения auth behavior.
- [ ] Dashboard states используют project components для review pack, want-to-learn block, streak indicator, empty state и shloka card там, где они применимы.
- [ ] Library tabs, search state, shloka cards, empty states и страница шлоки используют project components или явно зафиксированное UI-contract решение.
- [ ] Известные collision по `Показать еще N`, `Показать все` и специфичным пустым состояниям вкладок имеют принятое решение или явно исключены из этого baseline-среза.
- [ ] Длинные названия и текст шлок не ломают mobile layout.
- [ ] Dashboard остается спокойным по визуальной плотности и не усиливает давление количеством повторений сверх Pencil-паттерна.
- [ ] Route-level tests покрывают пользовательские состояния auth, dashboard и library без проверки приватной композиции project components.
- [ ] Playwright или существующий full-app seam проверяет ключевые auth/dashboard/library экраны на mobile-first размерах, включая `390x844` и `360x800`.
- [ ] Existing routes, route params, query keys, localStorage keys, API calls and generated API artifacts не меняются.
- [ ] Backend, схема базы данных и данные не меняются; новые DB migrations не требуются.
- [ ] Обязательные frontend-проверки проходят.

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
- Компонент: `Product / Shloka Card` (`z6MuZx`)
- Компонент: `Product / Empty State` (`RPtlw`)
- Компонент: `Product / Tabs / Library` (`T8Ktz7`)
- Компонент: `Product / Review Pack / Active` (`MTM4W`)
- Компонент: `Product / Review Pack / Completed` (`zE99y`)
- Компонент: `Product / Want To Learn Block` (`OPAt8`)
- Компонент: `Product / Want To Learn Block / Empty` (`Kir4Y`)
- Компонент: `Product / Streak Indicator` (`e16iU`)

## Заблокировано

- `.scratch/frontend-design-system-sync/issues/06-project-components-bottom-navigation.md`
