# Защитить production-миграции

Status: ready-for-agent

## Родитель

`.scratch/backend-production-hardening/PRD.md` — пользовательские истории 23–29 и 40.

## Что сделать

Сделать production migration path воспроизводимым от Railway pre-deploy command до PostgreSQL: runner запускается из скомпилированного артефакта, требует явный direct Neon URL, получает глобальную advisory-блокировку и завершает deploy ненулевым кодом при любой ошибке.

Существующие сильные свойства runner сохраняются: упорядоченные migration IDs, checksums, таблица истории и транзакционный batch на одну миграцию. Примененные миграции не редактируются, а эвристическое преобразование pooled hostname в direct hostname удаляется.

Полный zero-downtime framework не создается. Редкая несовместимая миграция выполняется вручную в короткое окно обслуживания.

## Критерии приемки

- [ ] Production migration runner требует `DATABASE_DIRECT_URL`; отсутствие значения завершает команду до подключения к БД.
- [ ] Development может использовать явно документированный локальный fallback, но production никогда не вычисляет direct URL заменой `-pooler` или другой hostname-эвристикой.
- [ ] Production-команда запускает скомпилированный JavaScript и не зависит от `tsx` или иной dev-зависимости в runtime image.
- [ ] Migration connection использует direct Neon endpoint и отдельные, ограниченные connection/lock/statement ожидания, подходящие для небольших MVP-миграций.
- [ ] До чтения истории runner получает одну стабильную глобальную advisory-блокировку; второй параллельный runner предсказуемо завершается или ограниченно ожидает, но не применяет миграции одновременно.
- [ ] Потеря migration connection освобождает advisory lock средствами PostgreSQL; ручная очистка зависшего lock не требуется.
- [ ] Существующие checksums, sorted IDs, пропуск уже примененных миграций и одна транзакция на migration сохраняются.
- [ ] Ошибка statement, checksum mismatch, ошибка lock или подключения приводит к ненулевому exit code; runner не печатает connection string или секреты.
- [ ] Примененные migration definitions не изменены. Исправление будущей ошибки оформляется новой migration.
- [ ] Fake-executor tests покрывают первый запуск, повторный запуск, checksum mismatch, rollback, advisory lock conflict и failed production command.
- [ ] Production build содержит migration runner и зарегистрированные migration definitions в ожидаемом compiled output.
- [ ] Существующие API tests, typecheck и build проходят; новая schema migration для этой задачи не создается и не применяется.

## Заблокировано

Нет - можно начинать сразу
