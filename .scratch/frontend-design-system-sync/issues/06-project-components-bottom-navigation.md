# Создать project components и подключить bottom navigation shell

Status: ready-for-human
Accepted: 2026-07-11

## Родитель

`.scratch/frontend-design-system-sync/spec.md`

## Что сделать

Создать начальный слой Pencil-синхронизированных project components поверх существующих shadcn/Radix primitives и применить его к навигационной оболочке приложения. После среза generic UI primitives остаются базовым kit, project components становятся продуктовым языком Sanskrit Shloka Learning, а нижняя навигация визуально содержит четыре раздела, включая `Обучение`.

## Критерии приемки

- [ ] Generic shadcn/Radix primitives остаются отделены от Pencil-синхронизированных project components.
- [ ] Начальный набор project components включает проверяемый фундамент для `BottomNavigation`, `PageHeader` и общих layout-паттернов, нужных для последующих экранов.
- [ ] Перед созданием каждого code component явно применено правило: Pencil `reusable` является UI-контрактом и кандидатом, но не обязательством создавать shared React-компонент; в `shared/design-system/components` попадают только устойчивые shared/app-level паттерны с полезным public API.
- [ ] Паттерны из Pencil, которые нужны только одному экрану или служат удобством прототипирования, не выносятся в shared в этой задаче; их будущий перенос требует второго реального потребителя или отдельного архитектурного решения.
- [ ] Full-size layout references из Pencil используются как контракт отступов, slots и shell-состава, но не переносят в код fake mobile status bar, фиксированную высоту phone frame или общий shared layout без устойчивого API.
- [ ] Project components строятся поверх shadcn/Radix primitives, проверенных в предыдущей задаче, без повторного аудита generic UI kit внутри этого среза.
- [ ] Навигационная оболочка использует Pencil-синхронизированный `BottomNavigation`.
- [ ] Нижняя навигация содержит `Дашборд`, `Библиотека`, `Обучение`, `Настройки`.
- [ ] Ticket 06 не создает новый route для `Обучение`; пункт `Обучение` отображается в нижней навигации, но переход по нему в этом срезе не работает.
- [ ] Активное состояние и переходы нижней навигации проверены через route-level или app-level сценарии для существующих маршрутов `Дашборд`, `Библиотека` и `Настройки`; для `Обучение` проверяется только наличие неработающего пункта без route creation.
- [ ] Mobile viewports `390x844` и `360x800` проверены для navigation shell без overlap, clipping и layout shift.
- [ ] Страницы передают в project components смысловые props и не повторяют карточную структуру, цвета, radii и spacing там, где уже есть компонентный контракт.
- [ ] Existing routes, route params, query keys, localStorage keys, API calls and generated API artifacts не меняются.
- [ ] Обязательные frontend-проверки проходят.

## Pencil references

- Компонент: `Product / Bottom Navigation` (`S7Pta`)
- Компонент: `Product / Layout / Main With Bottom Navigation` (`Uwe4t`)
- Компонент: `Product / Layout / Back Header` (`haku8`)
- Раздел: `02 Core Components` (`R1N0L6`)
- Раздел: `03 Product Components` (`lgFfS`)

## Принятое UI-решение

- Решение пользователя от 2026-07-11: применять визуальный active-паттерн
  `Product / Bottom Navigation` (`S7Pta`) к фактически активному маршруту.
- Экранные Pencil-инстансы, которые наследуют active-состояние `Дашборд`, не
  меняют это функциональное правило; `design/pencil-design.pen` в ticket 06 не
  редактируется.
- Будущие расхождения между требованиями, reusable-компонентами и экранными
  Pencil-инстансами должны быть вынесены пользователю до синхронизации кода или
  Pencil.

## Заблокировано

Нет - можно начинать сразу
