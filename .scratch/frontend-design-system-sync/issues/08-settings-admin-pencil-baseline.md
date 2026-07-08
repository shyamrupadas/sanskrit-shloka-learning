# Перевести settings и admin формы на Pencil project components

Status: ready-for-agent

## Родитель

`.scratch/frontend-design-system-sync/PRD.md`

## Что сделать

Перевести settings и admin-интерфейсы на Pencil-синхронизированные tokens, forms и project components, сохранив существующее управление настройками, источниками и шлоками. После среза админка должна использовать тот же дизайн-контракт, что пользовательские экраны, а формы создания и редактирования должны проверяться route-level сценариями через наблюдаемое поведение.

## Критерии приемки

- [ ] Settings screen использует Pencil-синхронизированные `SettingsRow`, page header/layout и общую тему без изменения поведения настроек.
- [ ] Admin catalog использует общий визуальный язык приложения без изменения admin routes или actions.
- [ ] Создание и редактирование шлоки используют Pencil-синхронизированный form layout и существующее поведение сохранения.
- [ ] Создание и редактирование источника используют Pencil-синхронизированный form layout для вариантов без глав, с главами и с частями.
- [ ] Forms используют generic shadcn/Radix primitives через project-level layout, а не локальные произвольные карточки и spacing.
- [ ] Route-level admin/settings tests покрывают пользовательские действия, валидацию и русские UI-строки без проверки приватной структуры components.
- [ ] Playwright или существующий full-app seam проверяет ключевые settings/admin экраны на mobile-first размерах, включая `390x844` и `360x800`.
- [ ] Existing routes, route params, query keys, localStorage keys, API calls and generated API artifacts не меняются.
- [ ] Backend, схема базы данных и данные не меняются; новые DB migrations не требуются.
- [ ] Обязательные frontend-проверки проходят.

## Pencil references

- Экран: `Настройки` (`HTlzD`)
- Экран: `Админка` (`hS3nD`)
- Экран: `Админка — создание шлоки` (`aUsAL`)
- Экран: `Админка — редактирование шлоки` (`NmyPN`)
- Экран: `Админка — создание источника / без глав` (`kxCGc`)
- Экран: `Админка — создание источника / с главами` (`DxZ4Q`)
- Экран: `Админка — создание источника / с частями` (`aLrxL`)
- Экран: `Админка — редактирование источника` (`gOpc1`)
- Компонент: `Product / Source Admin Form` (`QUgwl`)
- Компонент: `Product / Shloka Admin Form` (`gkqb9`)
- Компонент: `Product / Layout / Back Header` (`haku8`)

## Заблокировано

- `.scratch/frontend-design-system-sync/issues/03-design-token-contract-pencil-theme.md`
- `.scratch/frontend-design-system-sync/issues/05-project-components-bottom-navigation.md`
