# Frontend ED Small

При добавлении или перемещении frontend-файлов, изменении зависимостей,
interfaces или ответственности модулей прочитай
`docs/architecture/frontend.md`.

Для локальной правки существующего implementation без изменения границ,
interfaces, зависимостей или ответственности модулей живую спецификацию можно
не перечитывать.

## Shadcn primitives

При добавлении или обновлении generic shadcn/Radix primitives в `src/shared/ui/`
следуй `docs/design/frontend-design-system.md#shadcnradix-primitives-workflow`.
Если shadcn MCP или registry item недоступны, верни blocker/exception.

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
