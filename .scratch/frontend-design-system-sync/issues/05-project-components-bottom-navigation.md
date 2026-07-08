# Создать project components и подключить bottom navigation shell

Status: ready-for-agent

## Родитель

`.scratch/frontend-design-system-sync/PRD.md`

## Что сделать

Создать начальный слой Pencil-синхронизированных project components поверх существующих shadcn/Radix primitives и применить его к навигационной оболочке приложения. После среза generic UI primitives остаются базовым kit, project components становятся продуктовым языком Sanskrit Shloka Learning, а нижняя навигация работает через четыре раздела, включая `Обучение`.

## Критерии приемки

- [ ] Generic shadcn/Radix primitives остаются отделены от Pencil-синхронизированных project components.
- [ ] Начальный набор project components включает проверяемый фундамент для `BottomNavigation`, `PageHeader` и общих layout-паттернов, нужных для последующих экранов.
- [ ] Existing shadcn/Radix UI primitives audited: все текущие shadcn-компоненты заведены корректно, используют актуальные aliases, CSS entrypoint, shared utilities и не ссылаются на несуществующие пути.
- [ ] Shadcn configuration согласована с фактическим расположением generic UI primitives и theme entrypoint.
- [ ] Навигационная оболочка использует Pencil-синхронизированный `BottomNavigation`.
- [ ] Нижняя навигация содержит `Дашборд`, `Библиотека`, `Обучение`, `Настройки`.
- [ ] Активное состояние и переходы нижней навигации проверены через route-level или app-level сценарии.
- [ ] Mobile viewports `390x844` и `360x800` проверены для navigation shell без overlap, clipping и layout shift.
- [ ] Страницы передают в project components смысловые props и не повторяют карточную структуру, цвета, radii и spacing там, где уже есть компонентный контракт.
- [ ] Existing routes, route params, query keys, localStorage keys, API calls and generated API artifacts не меняются.
- [ ] Обязательные frontend-проверки проходят.

## Pencil references

- Компонент: `Product / Bottom Navigation` (`S7Pta`)
- Компонент: `Product / Layout / Main With Bottom Navigation` (`jZZrV`)
- Компонент: `Product / Layout / Back Header` (`haku8`)
- Раздел: `02 Core Components` (`R1N0L6`)
- Раздел: `03 Product Components` (`lgFfS`)

## Заблокировано

- `.scratch/frontend-design-system-sync/issues/03-design-token-contract-pencil-theme.md`
