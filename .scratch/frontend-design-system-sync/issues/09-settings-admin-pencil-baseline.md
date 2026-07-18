# Перевести settings и admin формы на Pencil project components

Status: ready-for-human
Accepted: 2026-07-12

## Родитель

`.scratch/frontend-design-system-sync/spec.md`

## Что сделать

Перевести settings и admin-интерфейсы на Pencil-синхронизированные tokens, forms и project components, сохранив существующее управление настройками, источниками и шлоками. После среза админка должна использовать тот же дизайн-контракт, что пользовательские экраны, а формы создания и редактирования должны проверяться route-level сценариями через наблюдаемое поведение.

## Критерии приемки

- [x] Settings screen использует Pencil-синхронизированные `SettingsRow`, page header/layout и общую тему без изменения поведения настроек.
- [x] Admin catalog использует общий визуальный язык приложения без изменения admin routes или actions.
- [x] Создание и редактирование шлоки используют Pencil-синхронизированный form layout и существующее поведение сохранения.
- [x] Создание и редактирование источника используют Pencil-синхронизированный form layout для вариантов без глав, с главами и с частями.
- [x] Forms используют generic shadcn/Radix primitives через project-level layout, а не локальные произвольные карточки и spacing.
- [x] Route-level admin/settings tests покрывают пользовательские действия, валидацию и русские UI-строки без проверки приватной структуры components.
- [x] Playwright или существующий full-app seam проверяет ключевые settings/admin экраны на mobile-first размерах, включая `390x844` и `360x800`.
- [x] Existing routes, route params, query keys, localStorage keys, API calls and generated API artifacts не меняются.
- [x] Backend, схема базы данных и данные не меняются; новые DB migrations не требуются.
- [x] Обязательные frontend-проверки проходят.

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

## Принятые UI-решения

- Решение пользователя от 2026-07-11: настройка транслитерации из экрана
  `Настройки` (`HTlzD`) не добавляется в текущий продукт; существующие hard
  mode, доступ в админку, данные учетной записи и выход сохраняются.
- Решение пользователя от 2026-07-11: `Product / Source Admin Form` (`QUgwl`)
  задает визуальный язык формы, но текущие обязательные коды источника, частей
  и глав сохраняются, а отсутствующее в продукте удаление не добавляется.
- Решение пользователя от 2026-07-11: `Product / Shloka Admin Form` (`gkqb9`)
  задает визуальный язык формы, но выбор части, неизменяемая ссылка на шлоку и
  предупреждение об изменении канонического текста сохраняются.

## Результат

- Settings переведен на shared `SettingsRow`: hard mode, условный переход в
  админку, данные учетной записи и выход сохранили существующее поведение.
- Добавлен shared `AdminFormLayout` и синхронизированные component tokens для
  settings rows и admin forms; `PageHeader` используется как общий back header.
- Admin catalog получил Pencil-иерархию действий, источников и шлок без
  изменения маршрутов редактирования и пользовательских данных строк.
- Source forms используют Radix tabs для типа структуры и общий form layout во
  всех вариантах; обязательные коды и запрет удаления сохранены.
- Shloka forms используют общий form layout; выбор части, read-only reference
  fields, предупреждение и существующие create/update requests сохранены.
- Route-level Vitest/RTL покрывает действия и валидацию. Playwright проверяет
  settings, catalog, create/edit source и create/edit shloka на `390x844` и
  `360x800` без горизонтального overflow.
- Routes, params, query/localStorage keys, API calls, generated artifacts,
  backend и БД не менялись. Новые DB migrations не требуются.

Pencil references:

- Screens: `Настройки` (`HTlzD`), `Админка` (`hS3nD`),
  `Админка — создание шлоки` (`aUsAL`),
  `Админка — редактирование шлоки` (`NmyPN`),
  `Админка — создание источника / без глав` (`kxCGc`),
  `Админка — создание источника / с главами` (`DxZ4Q`),
  `Админка — создание источника / с частями` (`aLrxL`),
  `Админка — редактирование источника` (`gOpc1`).
- Components: `Product / Source Admin Form` (`QUgwl`),
  `Product / Shloka Admin Form` (`gkqb9`),
  `Product / Layout / Back Header` (`haku8`).
- Exceptions: принятые пользователем 2026-07-11 исключения для отсутствующей
  настройки транслитерации и функционального состава source/shloka forms,
  перечисленные в разделе `Принятые UI-решения`.

## Заблокировано

Нет - можно начинать сразу
