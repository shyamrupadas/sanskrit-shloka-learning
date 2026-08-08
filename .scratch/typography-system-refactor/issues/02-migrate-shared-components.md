# 02 — Перевести общие проектные компоненты на Typography

**What to build:** Перевести самостоятельные заголовки и тексты общих проектных компонентов на новый типографический API, чтобы повторяемые UI-паттерны уже не собирали размер, line-height, weight и tone вручную. Пользователь должен видеть согласованную типографику во всех местах использования этих компонентов без изменения их поведения, доступных действий и layout.

**Blocked by:** 01 — Расширить pen.dev и frontend новым типографическим контрактом

**Status:** awaiting-human-review
Accepted: 2026-08-08

- [x] Page header, empty state, карточка шлоки, строка настроек и accordion используют `Typography` или `SanskritTypography` для самостоятельного текста.
- [x] Компоненты используют дефолтные HTML-теги выбранных вариантов `Typography`; прежние heading levels не сохраняются, а `EmptyState.headingLevel` удалён.
- [x] Текст внутри кнопок, вкладок, полей, labels и нижней навигации остаётся ответственностью соответствующих interactive primitives.
- [x] Layout-классы для переносов, truncate, ширины и позиционирования сохранены без ручного переопределения общей типографической шкалы.
- [x] pen.dev reusable-компоненты отражают новые варианты и основной foreground без изменения состава controls или пользовательского поведения.
- [x] Существующие потребители общих компонентов продолжают собираться без обязательной миграции feature-кода в этом ticket.
- [x] Новые component tests для типографической миграции не добавляются; существующие component- и route-level проверки продолжают проходить.
- [x] В shared project components не осталось прямых самостоятельных `h1–h3` и `p`, кроме реализации самих типографических компонентов и документированных исключений.
- [x] Backend, API-контракт, данные и схема базы данных не изменены; новые DB migrations не требуются.
- [x] Обязательные frontend-проверки проходят.

## Parent

`.scratch/typography-system-refactor/spec.md`

## pen.dev references

- Компонент: `Product / Shloka Card` (`Vzs9b`)
- Компонент: `Product / Empty State` (`RPtlw`)
- Компонент: `Product / Tip Accordion Item / Collapsed` (`epjBK`)
- Компонент: `Product / Tip Accordion Item / Expanded` (`rgPsh`)
- Компонент: `Product / Layout / Back Header` (`haku8`)
- Экран: `Настройки` (`HTlzD`)

## Implementation decisions

- Владелец продукта явно отказался от сохранения прежней HTML-семантики в мигрируемых компонентах: варианты `Typography` используют свои дефолтные теги без `as`.
- Владелец продукта явно отказался от новых component tests для этой миграции; размеры и цвета заголовков отдельными тестами не фиксируются.

## Implementation report

- Saved pen.dev references проверены для `Vzs9b`, `RPtlw`, `epjBK`, `rgPsh`, `haku8` и `HTlzD`.
- Ручной visual review typography, colors, layout, states и overflow подтверждён владельцем продукта 2026-08-08.
- Новые UI-contract exceptions не вводились; существующие `UIE-001` и `UIE-005` остаются вне типографического scope этого тикета.
