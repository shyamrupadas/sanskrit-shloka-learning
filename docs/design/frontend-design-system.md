# Frontend Design System

`design/pen-design.pen` является каноническим UI-контрактом и визуальным
источником истины для frontend UI. Кодовая дизайн-система в `apps/web` должна
быть синхронизированным машинно-читаемым отражением pen.dev-дизайна, а не
независимой темой приложения.

`design/new-design.pen` deprecated.

## Источники истины

- Функциональное поведение: spec, доменный словарь, ADR и API-контракт.
- Визуальный UI-контракт: `design/pen-design.pen`.
- Policy чтения, изменения и проверки UI-контракта:
  `docs/design/pen-ui-contract.md`.
- Текущие намеренные расхождения:
  `docs/design/pen-ui-contract-exceptions.md`.
- Кодовый контракт токенов: `apps/web/src/shared/design-system/tokens/`.

Если кодовый контракт токенов или другой производный артефакт расходится с
`design/pen-design.pen`, каноническим источником считается сохраненный `.pen`.
Факты о нем получают напрямую через Pencil tools; статическая карта узлов не
ведется.

## UI-contract workflow

Все задачи, которые читают или меняют `.pen`, готовят pen.dev references,
создают или меняют видимый frontend UI либо проверяют реализацию относительно
дизайна, выполняют каноническую policy
`docs/design/pen-ui-contract.md`.

Токены и компоненты ниже описывают кодовое отражение дизайна, но не заменяют
policy и не являются источником node inventory.

## Размещение токенов

Пока единственный потребитель дизайн-системы — `apps/web`, канонический repo-контракт токенов живет внутри frontend-приложения:

```text
apps/web/src/shared/design-system/tokens/
```

Отдельный workspace package для дизайн-токенов сейчас не вводится. Структуру токенов нужно держать переносимой, чтобы при появлении второго потребителя ее можно было вынести в `packages/*` без смены модели токенов.

## Модель токенов

Кодовый контракт не должен один-в-один копировать все pen.dev variables. В pen.dev допустимы alias- и component-переменные, удобные для макета; в коде нужна нормализованная модель без дублей вроде `primary`, `color-brand`, `button-primary-bg`, `bg` и `color-bg-app` как независимых смыслов.

Минимальная структура токенов:

- reference palette;
- semantic colors;
- typography;
- spacing;
- radius;
- elevation;
- component tokens для устойчивых проектных компонентов.

Каждый code-token должен иметь явную связь с pen.dev variable или source value. Если связь неясна, токен нельзя считать синхронизированным с pen.dev.

## Компонентная граница

Базовые примитивы поверх shadcn/Radix остаются в:

```text
apps/web/src/shared/ui/
```

pen.dev-синхронизированные проектные компоненты живут отдельно:

```text
apps/web/src/shared/design-system/components/
```

Самостоятельный интерфейсный текст создаётся через `Typography`, а
санскритский — через `SanskritTypography`. Интерактивные primitives — кнопки,
ссылки, поля, labels, вкладки и навигация — продолжают владеть собственной
типографикой. Типографические компоненты не принимают layout-решения: внешние
отступы, ширина, выравнивание, overflow и переносы остаются у потребителя.

Стандартное оформление и поведение компонентов приложения реализуйте в `shared/ui` поверх shadcn/Radix. Стили, токены и стандартная интерактивность принадлежат базовому компоненту. Страницы фич используют компоненты через смысловые props; стандартное оформление задаётся внутри компонента.

### Shadcn/Radix primitives workflow

Новые и обновляемые generic shadcn/Radix primitives в `apps/web/src/shared/ui/`
обслуживаются через shadcn MCP workflow для текущего `apps/web/components.json`:

1. Получить registry item и canonical add-команду через shadcn MCP.
2. Запустить полученную команду или эквивалентный CLI workflow для текущего
   `components.json`.
3. После генерации адаптировать компонент к aliases, форматированию
   и дизайн-системе проекта согласно правилам компонентной границы.

Если shadcn MCP недоступен или нужного item нет в registry, агент возвращает
blocker/exception на ревью с указанием недоступного MCP/item и предполагаемого
места будущего компонента.

pen.dev `reusable`-узел не является автоматическим требованием создать reusable React-компонент в `shared/design-system/components`. В pen.dev reusable-компонент может быть выделен для скорости прототипирования, визуальной синхронизации экранов или удобства навигации по canvas. В коде проектный компонент создается только после явного решения, что у паттерна есть устойчивая ответственность и полезный public API.

Отдельный проектный компонент выделяйте для самостоятельного UI-паттерна.
Перед выделением сформулируйте, какую ответственность он добавляет
к существующим компонентам.

Если pen.dev reusable-узел нужен только одному экрану или является удобством прототипирования, реализуйте его локально внутри соответствующей фичи поверх shadcn/Radix primitives и design tokens. В задаче и финальном отчете все равно нужно ссылаться на pen.dev node как на UI-контракт. При появлении второго реального потребителя локальный паттерн можно поднять в `shared/design-system/components` отдельным архитектурным шагом.

Полноэкранные pen.dev layout-узлы могут включать мобильный status bar, фиксированный phone frame и canvas-only slots. В коде это считается reference для визуального состава, отступов и shell-паттерна, а не требованием создавать fake OS chrome, фиксированную высоту экрана или общий shared component. Route shell и `Outlet`-композиция остаются ответственностью `app`, а `shared/design-system/components` может содержать только presentation-части с устойчивым public API.

Начальный набор кандидатов на проектные компоненты из `design/pen-design.pen`: `BottomNavigation`, `ShlokaCard`, `EmptyState`, `PageHeader`, `ReviewPack`, `WantToLearnBlock`, `StreakIndicator`, `SettingsRow`, `AdminFormLayout`. Каждый кандидат перед реализацией нужно классифицировать как shared project component, локальный feature component или app-level layout pattern; список кандидатов не является обязательством создать все эти exports сразу.

## Подход к синхронизации

Синхронизация текущего frontend с pen.dev выполняется слоями: сначала агентский workflow и UI-контракт, затем токены и производные артефакты, затем проектные компоненты, затем экраны и пользовательские потоки. Детальная декомпозиция на spec и tickets в этом документе не ведется.

## Guardrails от дрейфа

Автоматические проверки нужно вводить после появления code-token contract, а не раньше. Минимум проверок:

- запрет новых произвольных hex/OKLCH цветов в `apps/web/src` вне token/CSS generator слоя;
- проверка PWA `theme_color`, manifest colors и icon colors против design tokens;
- проверка прямых magic-size паттернов сначала для новых проектных компонентов.
- запрет прямых самостоятельных `h1–h3` и `p` в `src`; path-level exceptions разрешены только реализации `Typography` и generic primitives в `shared/ui`, а причины исключений фиксируются в guardrail config;
- запрет ручных font-size, line-height и font-weight patterns в feature-коде; layout-классы разрешены, а кнопки, ссылки, поля, labels, tabs и другие перечисленные interactive JSX owners продолжают владеть своей типографикой.

Не нужно сразу запрещать все Tailwind utility classes в страницах. Ограничения ужесточаются постепенно по мере переноса UI на `shared/design-system/components`.
