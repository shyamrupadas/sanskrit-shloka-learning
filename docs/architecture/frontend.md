# Frontend Architecture

Status: migration in progress

Текущие правила для `apps/web`. [ADR-0003](../adr/0003-evolution-design-for-frontend-architecture.md)
объясняет выбор ED small; ESLint исполняет проверяемые правила. Расхождения
исправлять одновременно в документе и конфигурации, не обходя проверку.

## Структура

- Верхнеуровневые слои — только `app`, `features`, `shared`.
- `app`: bootstrap, providers, router, guards, layouts, композиция фич.
- `features/<feature>`: route-level страницы, состояние и логика одного
  крупного пользовательского сценария.
- `shared`: только глобальные UI (`src/shared/ui`), i18n, API helpers,
  session-модель, route constants, utilities и test harness.

## Зависимости

- `shared` не импортирует `features` или `app`.
- `features` не импортируют `app`.
- Зависимости между фичами редки и проходят через интерфейс импортируемой фичи.
- Внешние entry points многофайловой фичи: `index.ts(x)` и route-level
  `*.page.tsx`; внутренние `ui`, `model`, `lib`, `api`, hooks и helpers приватны.
- Тесты используют тот же интерфейс, что и вызывающий код, не закрепляя
  внутреннее размещение файлов.

## Модули

Использовать минимальную подходящую стадию:

1. Single-file: один экран или небольшая фича.
2. Flat: добавились тесты, helper или небольшой дочерний компонент.
3. Grouped (`ui`, `model`, `lib`, `api`): flat мешает локальности изменений.
4. Internal submodules: несколько связанных сценариев с общей моделью.

Не создавать `services`, `entities`, `widgets`, пустые будущие фичи или
seams без фактической сложности. Слой `services` требует решения о переходе к
ED medium.

## Migration Mode

До выполнения [issue 09](../../.scratch/frontend-evolution-design/issues/09-verify-ed-small-migration.md):

- Код вне `app`, `features`, `shared` — legacy, не образец; не расширять его.
- Legacy менять только в текущем миграционном шаге; compatibility imports
  удалить до завершения шага.
- Переносить один законченный seam без продуктовых или визуальных изменений.
- Сохранять routes, params, query/localStorage keys, HTTP/API contract,
  generated artifacts и наблюдаемое поведение.

Issue 09 удаляет этот раздел и включает запрет неизвестных файлов и зависимостей.
