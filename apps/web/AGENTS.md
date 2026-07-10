# Frontend ED Small

При добавлении или перемещении frontend-файлов, изменении зависимостей,
interfaces или ответственности модулей прочитай
`docs/architecture/frontend.md`.

Для локальной правки существующего implementation без изменения границ,
interfaces, зависимостей или ответственности модулей живую спецификацию можно
не перечитывать.

## Shadcn primitives

Новые и обновляемые generic shadcn/Radix primitives в `src/shared/ui/`
добавляй только через shadcn MCP workflow: сначала получи registry item и
canonical add-команду через MCP, затем запускай эту команду/CLI workflow для
текущего `components.json`. Не создавай shadcn primitives вручную, по памяти,
копипастой или ad hoc-файлом.

После генерации допускается только техническая адаптация к aliases из
`components.json` (`@/shared/ui`, `@/shared/lib/utils`) и форматированию проекта.
Продуктовые дизайн-отличия не маскируй внутри `src/shared/ui`; выноси их в
`src/shared/design-system/components/` или отдельный project component.

Если shadcn MCP недоступен или нужного item нет в registry, не создавай
компонент вручную как shadcn primitive. Верни явный blocker/exception на ревью
с указанием недоступного MCP/item и предполагаемого места будущего компонента.

Не создавай верхнеуровневые `pages`, `services`, `components`, `auth`, `api`,
`lib` или `test` внутри `src`. Для архитектурного аудита, переноса или
эволюции модулей используй project skill `$frontend-architecture`.

Для видимых UI-изменений используй `design/pencil-design.pen` как UI-контракт:
прочитай `docs/design/frontend-design-system.md` и
`docs/design/pencil-design-map.md`; в отчете укажи Pencil references или
верни `UI Contract Collision`.

Обязательные проверки после frontend-изменений:

```bash
pnpm lint
pnpm --filter @sanskrit-shloka-learning/web typecheck
pnpm --filter @sanskrit-shloka-learning/web test:unit
```

Для финальной архитектурной проверки дополнительно запускай:

```bash
pnpm --filter @sanskrit-shloka-learning/web build
pnpm --filter @sanskrit-shloka-learning/web test:e2e
```
