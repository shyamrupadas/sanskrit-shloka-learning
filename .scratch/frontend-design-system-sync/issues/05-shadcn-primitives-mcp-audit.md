# Проинспектировать shadcn primitives и закрепить MCP workflow

Status: ready-for-human
Accepted: 2026-07-10

## Родитель

`.scratch/frontend-design-system-sync/spec.md`

## Что сделать

Провести отдельный аудит всех переиспользуемых generic shadcn/Radix primitives перед созданием Pencil-синхронизированных project components. Цель - убедиться, что `apps/web/src/shared/ui/` является корректным shadcn-слоем, заведенным через shadcn MCP/CLI workflow, а не набором вручную собранных похожих компонентов.

Если текущий primitive создан вручную, расходится с configured shadcn registry item или использует неправильные aliases/imports/dependencies, его нужно нормализовать через shadcn MCP workflow и только затем адаптировать к существующим проектным aliases. Новые shadcn primitives после этой задачи нельзя добавлять вручную по памяти, копипастой или ad hoc-файлом.

## Контекст аудита

- Текущий shadcn config: `apps/web/components.json`.
- Текущий CSS entrypoint: `apps/web/src/app/styles.css`.
- Текущий generic UI каталог: `apps/web/src/shared/ui/`.
- Текущий shared utils alias: `@/shared/lib/utils`.
- На момент подготовки ticket найдены primitives: `button`, `card`, `input`, `label`, `switch`, `tabs`, `textarea`.
- Shadcn MCP для текущего набора возвращает canonical add-команду: `pnpm dlx shadcn@latest add @shadcn/button @shadcn/card @shadcn/input @shadcn/label @shadcn/switch @shadcn/tabs @shadcn/textarea`.

## Критерии приемки

- [ ] Все текущие shadcn/Radix primitives в `apps/web/src/shared/ui/` проинвентаризированы; если перед стартом задачи появились новые primitives, они включены в тот же аудит.
- [ ] Для каждого primitive выполнена сверка с shadcn MCP registry item для текущего `components.json`, включая imports, named/default exports, `data-slot`, dependencies, aliases, class composition и использование `cn`.
- [ ] Результат сверки зафиксирован в финальном отчете блоком `Shadcn primitive audit`: component, status, action, intentional exceptions.
- [ ] Неправильно созданные, вручную собранные или registry-drifted primitives нормализованы через shadcn MCP workflow и команду, полученную от MCP, а не ручной перепиской по памяти.
- [ ] Осознанные локальные отличия от registry item не маскируют продуктовый дизайн внутри `shared/ui`; они либо удалены, либо явно описаны как временные exceptions с причиной и дальнейшим местом переноса в `shared/design-system/components/`.
- [ ] `apps/web/components.json` согласован с фактическим расположением generic primitives, shared utilities и CSS entrypoint; конфиг не ссылается на несуществующие пути.
- [ ] В проектные инструкции добавлено правило: новые и обновляемые shadcn primitives в `apps/web/src/shared/ui/` добавляются только через shadcn MCP server workflow; ручное создание shadcn-компонентов запрещено.
- [ ] Правило описывает fallback: если shadcn MCP недоступен или нужного item нет в registry, агент не создает компонент вручную как shadcn primitive, а возвращает явный blocker/exception на ревью.
- [ ] Existing imports/call sites продолжают работать; публичное поведение экранов, routes, route params, query keys, localStorage keys, API calls and generated API artifacts не меняются.
- [ ] Backend, схема базы данных и данные не меняются; новые DB migrations не требуются.
- [ ] Обязательные frontend-проверки проходят: `pnpm lint`, `pnpm --filter @sanskrit-shloka-learning/web typecheck`, `pnpm --filter @sanskrit-shloka-learning/web test:unit`.

## Pencil references

- Раздел: `01 Foundations` (`otJrw`)
- Раздел: `02 Core Components` (`R1N0L6`)

## Заблокировано

Нет - можно начинать сразу

## Не делать

- Не создавать Pencil project components в этой задаче; это следующий слой.
- Не переводить bottom navigation shell и страницы фич на новый component language.
- Не менять backend, API-контракт или данные.
