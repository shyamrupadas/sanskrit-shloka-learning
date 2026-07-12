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

Эти пункты известны из текущих требований и должны быть решены перед
реализацией соответствующих frontend-задач. Будущие UI-задачи могут ссылаться
на стабильные collision IDs ниже как на проверяемые блокеры.

### UIC-DS-001: Раскрытая пачка повторения после `Показать еще N`

#### UI Contract Collision

- Решено 2026-07-12: пользователь разрешил design exception. Отдельный
  раскрытый Pencil-макет не создается; полный список продолжает существующий
  вертикальный паттерн `MTM4W`, сохраняет плотность карточек и внешний скролл.
  После успешного запроса действие исчезает, а его место сохраняет отступ.

- Требование: дашборд показывает начальную пачку повторения, а действие
  `Показать еще N` запрашивает свежие данные и раскрывает на месте всех
  оставшихся кандидатов на повторение сегодня.
- Pencil reference: экран `Дашборд - обычный` (`xJFoj`), компонент
  `Product / Review Pack / Active` (`MTM4W`); отдельное раскрытое состояние
  после `Показать еще N` не найдено.
- Расхождение: Pencil фиксирует компактный active review pack, но не задает
  визуальный состав, плотность, порядок карточек, overflow и состояние action
  после раскрытия полного дневного объема.
- Варианты решения:
  1. Обновить Pencil: добавить состояние/вариант review pack для раскрытого
     списка после `Показать еще N`.
  2. Изменить требование: заменить inline-раскрытие переходом к отдельному
     списку повторения или оставить только компактную пачку.
  3. Разрешить design exception: использовать существующий паттерн
     `Product / Review Pack / Active` (`MTM4W`) для расширенного списка с явно
     зафиксированными лимитами и overflow-правилами.
- Прежняя рекомендация обновить Pencil закрыта явным design exception выше.

### UIC-DS-002: Раскрытый список заучивания после `Показать все`

#### UI Contract Collision

- Решено 2026-07-12: пользователь разрешил design exception. Отдельный
  раскрытый Pencil-макет не создается; полный список продолжает существующий
  вертикальный паттерн `OPAt8`, сохраняет плотность карточек и внешний скролл.
  После успешного запроса действие исчезает, а его место сохраняет отступ.

- Требование: дашборд показывает до 3 шлок к заучиванию, а действие
  `Показать все` раскрывает полный список заучивания на месте.
- Pencil reference: экран `Дашборд - обычный` (`xJFoj`), компонент
  `Product / Want To Learn Block` (`OPAt8`); отдельное раскрытое состояние
  после `Показать все` не найдено.
- Расхождение: Pencil задает базовый want-to-learn block, но не определяет,
  как выглядит полный список на дашборде, какие карточки повторяются, как
  ведут себя длинные списки и сохраняется ли компактность главного экрана.
- Варианты решения:
  1. Обновить Pencil: добавить раскрытый вариант `Product / Want To Learn Block`
     или отдельное состояние дашборда после `Показать все`.
  2. Изменить требование: заменить inline-раскрытие переходом во вкладку
     `Библиотека — буду учить` (`g0MoYL`) или оставить на дашборде только
     компактный список.
  3. Разрешить design exception: повторить существующий паттерн
     `Product / Want To Learn Block` (`OPAt8`) для полного списка с
     зафиксированными правилами overflow.
- Прежняя рекомендация обновить Pencil или изменить переход закрыта явным
  design exception выше.

### UIC-DS-003: Пустые состояния вкладок `Повторяю` и `Буду учить`

#### UI Contract Collision

- Требование: библиотека имеет вкладки `Повторяю` и `Буду учить` со
  специфичными пустыми состояниями, которые объясняют следующий шаг для каждой
  вкладки.
- Pencil reference: экраны `Библиотека — повторяю` (`fLWms`) и
  `Библиотека — буду учить` (`g0MoYL`), компонент
  `Product / Empty State` (`RPtlw`); отдельные tab-specific empty states не
  найдены.
- Расхождение: Pencil содержит общий reusable-компонент empty state, но не
  фиксирует отдельные тексты, action set и визуальные варианты для пустой
  вкладки `Повторяю` и пустой вкладки `Буду учить`.
- Варианты решения:
  1. Обновить Pencil: добавить отдельные empty-state варианты для
     `Библиотека — повторяю` и `Библиотека — буду учить`.
  2. Использовать общий контракт: явно принять `Product / Empty State`
     (`RPtlw`) для обеих вкладок и зафиксировать в соответствующей UI-задаче
     продуктовые тексты и действия без нового визуального варианта.
  3. Изменить требование: заменить специфичные пустые состояния одним
     нейтральным состоянием библиотеки без tab-specific guidance.
  4. Разрешить design exception: временно использовать общий empty-state
     визуал с локальной копирайтинг-правкой до обновления Pencil.
- Рекомендация агента: принять вариант 2, если владельцу продукта достаточно
  общего визуального компонента `Product / Empty State` (`RPtlw`); иначе
  обновить Pencil до реализации library baseline.
