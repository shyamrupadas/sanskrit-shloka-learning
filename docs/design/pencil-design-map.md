# Pencil Design Map

Источник UI-контракта: `design/pencil-design.pen`.

`design/new-design.pen` deprecated. Эта карта является навигационным индексом для задач, ревью и агентского workflow; если карта расходится с `.pen`, каноническим источником считается `.pen`, а карту нужно обновить перед подготовкой frontend-задачи.

Эта карта не заменяет дизайн и не добавляет новые требования. Ее назначение — быстро находить человекочитаемые имена и `nodeId` для PRD, issues, frontend-задач, финальных отчетов и reviewer-проверки.

## Как использовать карту

- При подготовке PRD или issue с видимым UI выбрать релевантные экраны, состояния и reusable-компоненты из таблиц ниже и перенести их в блок `## Pencil references`.
- При reviewer-проверке убедиться, что каждая UI-задача содержит references в формате имя + `nodeId` или structured `UI Contract Collision`.
- Если нужного экрана, состояния или компонента в карте нет, проверить актуальный `design/pencil-design.pen` через Pencil MCP. Если узла нет и в `.pen`, задача не готова к frontend-реализации без `UI Contract Collision`.
- Если `nodeId` из задачи устарел, найти актуальный узел по имени через Pencil MCP, обновить ссылку и явно отметить замену.

## Правило ссылок

Frontend-задача, которая затрагивает пользовательский UI, должна ссылаться на Pencil-узлы в формате:

```text
Экран: "<имя в Pencil>" (<nodeId>)
Состояние: "<имя в Pencil>" (<nodeId>)
Компонент: "<имя reusable-компонента>" (<nodeId>)
```

Если в Pencil нет нужного экрана, состояния или компонента, либо он расходится с функциональным требованием, задачу нельзя считать готовой к реализации. Агент должен вернуть коллизию владельцу продукта: обновить Pencil, изменить требование или явно зафиксировать точечное исключение.

## Разделы дизайн-системы

| Назначение | Pencil node |
| --- | --- |
| Foundations | `01 Foundations` (`otJrw`) |
| Core Components | `02 Core Components` (`R1N0L6`) |
| Product Components | `03 Product Components` (`lgFfS`) |

## Экраны

| Область | Экран | Pencil node |
| --- | --- | --- |
| Auth | Регистрация | `Регистрация` (`Wklvv`) |
| Auth | Вход | `Вход` (`J9sKf`) |
| Dashboard | Обычное состояние | `Дашборд - обычный` (`xJFoj`) |
| Dashboard | Новый пользователь | `Дашборд - новый пользователь` (`iT1Xy`) |
| Dashboard | Повторения завершены | `Дашборд - повторения завершены` (`V5wKHO`) |
| Library | Вкладка `Повторяю` | `Библиотека — повторяю` (`fLWms`) |
| Library | Вкладка `Буду учить` | `Библиотека — буду учить` (`g0MoYL`) |
| Library | Вкладка `Все` | `Библиотека — все` (`tCzug`) |
| Library | Нет результатов поиска | `Библиотека — нет результатов` (`LeWUO`) |
| Library | Страница шлоки | `Страница шлоки` (`Q0ALx5`) |
| Заучивание | Экран шлоки | `Заучивание — шлока` (`QPXXW`) |
| Заучивание | Подтверждение | `Заучивание — подтверждение` (`IQcqK`) |
| Повторение | Текст скрыт | `Повторение — текст скрыт` (`M6fBeF`) |
| Повторение | Первая подсказка | `Повторение — первая подсказка` (`Zt9yX`) |
| Повторение | Вторая подсказка | `Повторение — вторая подсказка` (`dtDuy`) |
| Повторение | Полный текст | `Повторение — полный текст` (`s0VvGA`) |
| Повторение | Результат | `Повторение — результат` (`E41yd`) |
| Обучение санскриту | Основной экран | `Обучение санскриту` (`aj0kd`) |
| Settings | Основной экран | `Настройки` (`HTlzD`) |
| Admin | Каталог | `Админка` (`hS3nD`) |
| Admin | Создание шлоки | `Админка — создание шлоки` (`aUsAL`) |
| Admin | Редактирование шлоки | `Админка — редактирование шлоки` (`NmyPN`) |
| Admin | Создание источника без глав | `Админка — создание источника / без глав` (`kxCGc`) |
| Admin | Создание источника с главами | `Админка — создание источника / с главами` (`DxZ4Q`) |
| Admin | Создание источника с частями | `Админка — создание источника / с частями` (`aLrxL`) |
| Admin | Редактирование источника | `Админка — редактирование источника` (`gOpc1`) |

## Reusable-компоненты

| Группа | Компонент | Pencil node |
| --- | --- | --- |
| Core | Primary button | `Core / Button / Primary` (`M6qnk`) |
| Core | Secondary button | `Core / Button / Secondary` (`B9n47J`) |
| Core | Status badge | `Core / Badge / Status` (`Ki4eS`) |
| Core | Input | `Core / Field / Input` (`VvKs5`) |
| Core | Filled input | `Core / Field / Input / Filled` (`uJIl8`) |
| Core | Search field | `Core / Field / Search` (`LgaTW`) |
| Core | Filled search field | `Core / Field / Search / Filled` (`xoKkO`) |
| Core | Select | `Core / Field / Select` (`UONHU`) |
| Core | Textarea | `Core / Field / Textarea` (`xEAP6`) |
| Core | Profile icon | `Core / Icon / Profile` (`Ms4X8`) |
| Core | Back icon | `Core / Icon / Back` (`Qm2hL`) |
| Product | Email field | `Product / Field / Email` (`PEmail`) |
| Product | Password field | `Product / Field / Password` (`PPass`) |
| Product | Shloka card | `Product / Shloka Card` (`z6MuZx`) |
| Product | Empty state | `Product / Empty State` (`RPtlw`) |
| Product | Bottom navigation | `Product / Bottom Navigation` (`S7Pta`) |
| Product | Library tabs | `Product / Tabs / Library` (`T8Ktz7`) |
| Product | Word row | `Product / Word Row` (`L7MCU`) |
| Product | Tip accordion collapsed | `Product / Tip Accordion Item / Collapsed` (`epjBK`) |
| Product | Tip accordion expanded | `Product / Tip Accordion Item / Expanded` (`rgPsh`) |
| Product | Streak indicator | `Product / Streak Indicator` (`e16iU`) |
| Product | Review pack active | `Product / Review Pack / Active` (`MTM4W`) |
| Product | Review pack completed | `Product / Review Pack / Completed` (`zE99y`) |
| Product | Want-to-learn block | `Product / Want To Learn Block` (`OPAt8`) |
| Product | Empty want-to-learn block | `Product / Want To Learn Block / Empty` (`Kir4Y`) |
| Product | Source admin form | `Product / Source Admin Form` (`QUgwl`) |
| Product | Shloka admin form | `Product / Shloka Admin Form` (`gkqb9`) |
| Product Layout | Back header layout | `Product / Layout / Back Header` (`haku8`) |
| Product Layout | Main layout with bottom navigation | `Product / Layout / Main With Bottom Navigation` (`jZZrV`) |

## Текущие проверочные коллизии

Эти пункты известны из текущих требований и должны быть решены перед реализацией соответствующих frontend-задач:

- Раскрытое состояние пачки повторения после `Показать еще N` не найдено как отдельный экран.
- Раскрытое состояние списка шлок к заучиванию после `Показать все` не найдено как отдельный экран.
- Специфичные пустые состояния вкладок `Повторяю` и `Буду учить` не найдены как отдельные экраны; есть общий reusable-компонент `Product / Empty State` (`RPtlw`).
