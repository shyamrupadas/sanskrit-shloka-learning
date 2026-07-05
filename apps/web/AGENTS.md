# Frontend ED Small

При добавлении или перемещении frontend-файлов, изменении зависимостей,
interfaces или ответственности модулей прочитай
`docs/architecture/frontend.md`.

Для локальной правки существующего implementation без изменения границ,
interfaces, зависимостей или ответственности модулей живую спецификацию можно
не перечитывать.

Не создавай верхнеуровневые `pages`, `services`, `components`, `auth`, `api`,
`lib` или `test` внутри `src`. Для архитектурного аудита, переноса или
эволюции модулей используй project skill `$frontend-architecture`.

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
