---
name: pen-ui-contract
description: Применяй repository workflow pen.dev UI contract при чтении или изменении канонического .pen, подготовке актуальных pen.dev references, изменении видимого frontend UI или проверке реализации по visual contract.
---

# Pen UI Contract

Считай `docs/design/pen-ui-contract.md` единственным источником policy. Используй этот skill для routing, исполняемых entry points и completion gates. Сначала прочитай policy и сохраняй исходный scope задачи при переходе между дизайном и кодом.

## Маршрутизируй задачу

1. Выбери все применимые ветки: inspection сохранённого дизайна, live-редактирование дизайна, реализация видимого frontend UI или visual review.
2. Прочитай соответствующие разделы policy:
   - для inspection — `Read-only доступ`;
   - для live-редактирования — `Изменение дизайна`;
   - для frontend-реализации — `Видимые frontend-изменения`, `UI Contract Collision` и `Responsive/overflow решения`.
3. Для frontend-работы также прочитай `apps/web/AGENTS.md` и `docs/design/frontend-design-system.md`.

Заверши routing после определения каждой ветки и её target screen или state. Текущий saved reference получи в ветке inspection.

## Прочитай сохранённый дизайн

1. Запусти `scripts/read-only-pen.sh` из PTY. Launcher не принимает путь к дизайну или аргументы agent mode.
2. В interactive session следуй разделу `Read-only доступ` и с актуальной schema изучи только необходимые задаче сохранённые узлы.
3. Заверши session и сообщи node IDs, релевантные properties и state для следующей ветки.

При ошибке preflight верни понятный blocker launcher. При ошибке session сообщи exit status и остановись. Считай inspection завершённым только тогда, когда отчёт содержит актуальные saved references, а не cached properties.

После изменения launcher запусти `scripts/validate-read-only-launcher.sh`. Заверши проверку только после успешного external-process теста с fake `pen`.

## Измени live-дизайн

1. Следуй разделу `Изменение дизайна` до unsaved human-review handoff, используя только MCP-соединение `pencil` с Pen Desktop.
2. Если изменение вводит visual token, reusable component или pattern, покажи владельцу полученное при inspection доказательство недостаточности существующей design system.
3. Остановись при любом blocker из этого раздела. Возобнови исходный code scope только после явного подтверждения владельца, что дизайн принят и сохранён.

Заверши ветку, когда для каждого изменённого state получены требуемые policy layout evidence и screenshot, canvas не сохранён агентом, а владелец подтвердил приёмку и сохранение. Заверши design-only задачу на этом этапе.

## Реализуй и проверь видимый frontend UI

1. Перед каждой видимой правкой кода повтори inspection сохранённого дизайна для точных утверждённых узлов и state из задачи.
2. Если обновлённый contract отсутствует или противоречит функциональному требованию, верни точный шаблон `UI Contract Collision` из policy и приостанови code phase до решения владельца.
3. Реализуй только сопоставленные states и одобренные владельцем exceptions, затем запусти обязательные repository checks.
4. Следуй разделу `Responsive/overflow решения` и сравни Pen evidence со screenshot через Playwright MCP в одинаковых viewport и state. Повторяй реализацию и сбор evidence, пока все наблюдаемые policy categories не совпадут или не получат одобренный exception.
5. Если evidence приложения недоступен, оставь visual-verification gate открытым до явного подтверждения владельцем manual review для текущей задачи.

Заверши ветку, когда финальный отчёт перечисляет saved Pen references, evidence приложения, проверенные categories, одобренные exceptions и агента или владельца, закрывшего visual review.
