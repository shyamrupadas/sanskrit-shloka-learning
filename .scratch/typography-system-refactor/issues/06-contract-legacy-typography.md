# 06 — Закрыть миграцию и включить типографические guardrails

**What to build:** Завершить contract-этап после миграции всех потребителей: удалить старые общие типографические токены и обходные классы, включить автоматическую защиту нового контракта и подтвердить на уровне всего приложения, что pen.dev и frontend используют одну шкалу без функциональных и layout-регрессий.

**Blocked by:** 03 — Унифицировать типографику авторизации, дашборда и общей библиотеки шлок; 04 — Унифицировать типографику заучивания, повторения, обучения санскриту и настроек; 05 — Унифицировать типографику админки

**Status:** ready-for-agent

- [ ] В pen.dev и code-token contract отсутствуют старые общие screen/page/section/card title, body/body-sm, прежние `typo-*` aliases и веса 600/800; специализированные component tokens сохранены только у controls, которым они принадлежат.
- [ ] Все pen.dev screen и component references разрешаются через новую шкалу `h1–h3`, `p1–p4`, line-height 1.25/1.4 и веса 400/500/700.
- [ ] Frontend theme, CSS variables, foreground aliases и token metadata полностью синхронизированы с каноническим pen.dev-контрактом.
- [ ] Автоматический guardrail запрещает прямые самостоятельные `h1–h3` и `p` вне Typography implementations и документированных generic UI-исключений.
- [ ] Guardrail выявляет ручные общие font-size, line-height и font-weight patterns в feature-коде, но разрешает layout-классы и собственную типографику interactive primitives.
- [ ] Guardrail покрыт позитивными и негативными fixture tests и не опирается на недокументированный allowlist миграционного долга.
- [ ] Актуальная ссылка на Typography System получена напрямую через Pencil tools и не указывает на удалённый или заменённый node.
- [ ] Поиск по frontend подтверждает отсутствие старых общих токенов и самостоятельной ручной типографики в областях миграции.
- [ ] Репрезентативная визуальная проверка дашборда, библиотеки, страницы шлоки, заучивания или повторения, настроек и админки подтверждает единый `h1` 20px, foreground `#334155`, сохранение semantics, переносов и mobile layout.
- [ ] Полный lint, typecheck, unit, build и e2e regression suite проходит.
- [ ] Маршруты, пользовательские действия, API-контракт, backend, данные и схема базы данных не изменены; новые DB migrations не требуются.

## Parent

`.scratch/typography-system-refactor/spec.md`

## pen.dev references

- Раздел: `01 Foundations` (`otJrw`)
- Компонент/раздел: `Typography System` (`h4yUQl` или актуальный replacement nodeId)
- Раздел: `02 Core Components` (`R1N0L6`)
- Раздел: `03 Product Components` (`lgFfS`)
- Экраны auth: `Регистрация` (`Wklvv`), `Вход` (`J9sKf`).
- Экраны dashboard: `Дашборд - обычный` (`xJFoj`), `Дашборд - новый пользователь` (`iT1Xy`), `Дашборд - повторения завершены` (`V5wKHO`).
- Экраны library: `Библиотека — повторяю` (`fLWms`), `Библиотека — буду учить` (`g0MoYL`), `Библиотека — все` (`tCzug`), `Библиотека — нет результатов` (`LeWUO`), `Страница шлоки` (`Q0ALx5`).
- Экраны заучивания и повторения: `Заучивание — шлока` (`QPXXW`), `Заучивание — подтверждение` (`IQcqK`), `Повторение — текст скрыт` (`M6fBeF`), `Повторение — первая подсказка` (`Zt9yX`), `Повторение — вторая подсказка` (`dtDuy`), `Повторение — полный текст` (`s0VvGA`), `Повторение — результат` (`E41yd`).
- Остальные экраны: `Обучение санскриту` (`aj0kd`), `Настройки` (`HTlzD`), `Админка` (`hS3nD`), `Админка — создание шлоки` (`aUsAL`), `Админка — редактирование шлоки` (`NmyPN`), `Админка — создание источника / без глав` (`kxCGc`), `Админка — создание источника / с главами` (`DxZ4Q`), `Админка — создание источника / с частями` (`aLrxL`), `Админка — редактирование источника` (`gOpc1`).
- Reusable-компоненты: `Product / Shloka Card` (`Vzs9b`), `Product / Empty State` (`RPtlw`), `Product / Tip Accordion Item / Collapsed` (`epjBK`), `Product / Tip Accordion Item / Expanded` (`rgPsh`), `Product / Layout / Back Header` (`haku8`), `Product / Review Pack / Active` (`MTM4W`), `Product / Review Pack / Completed` (`zE99y`), `Product / Want To Learn Block` (`OPAt8`), `Product / Want To Learn Block / Empty` (`Kir4Y`), `Product / Word Row` (`L7MCU`), `Product / Source Admin Form` (`QUgwl`), `Product / Shloka Admin Form` (`gkqb9`).
