# 03 — Продвигать в Amvera только проверенный backend commit

**What to build:** Сделать постоянную ветку `amvera-api` указателем на последний полностью проверенный backend commit, чтобы Amvera получала release-кандидат только после успешного Backend CI и не реагировала на frontend-only изменения.

**Blocked by:** 01 — Собрать переносимый production-контейнер API

**Status:** awaiting-human-review

- [x] Backend CI запускается для изменений API, API-контракта, влияющих workspace/toolchain metadata, container contract и самого backend workflow, но не для frontend-only изменений.
- [x] Verify job сохраняет существующие typecheck, tests и production build и дополнительно собирает тот же финальный production target, который будет использовать Amvera.
- [x] Promotion выполняется отдельным job только после полного успеха verify и перемещает `amvera-api` ровно на проверенный commit SHA.
- [x] Первый успешный promotion создаёт служебную ветку, последующие используют обычный fast-forward push; force push запрещён, а расхождение истории завершает promotion ошибкой.
- [x] Только promotion job получает job-scoped `contents: write`; остальные jobs остаются read-only и не получают Amvera или database secrets.
- [x] Основной путь использует штатный короткоживущий `GITHUB_TOKEN`; отдельный fine-grained token допускается только как документированный fallback, если реальный Amvera webhook проигнорирует штатный push.
- [x] Backend CI слушает backend-related push только в `main`, поэтому push в `amvera-api` не создаёт рекурсию; актуальная concurrency-политика отменяет устаревший незавершённый release.
- [x] Image не публикуется в registry и не добавляется отдельный credentials-based deploy pipeline.

## Parent

`.scratch/backend-amvera-production/spec.md`

## Проверка реализации

- API и workspace dependencies: typecheck и production build прошли.
- `pnpm test --force`: 106 API, 8 contract, 195 web unit/component/integration и
  11 Playwright e2e tests прошли без кеша. Для HTTP tests потребовался запуск вне
  sandbox, поскольку sandbox запрещал bind локального порта (`listen EPERM`).
- YAML разобран; проверены backend/frontend примеры path filters, main-only trigger,
  зависимость promotion от verify, permissions и concurrency.
- Команда promotion из workflow проверена на временном локальном Git remote:
  создание ветки, fast-forward на точный проверенный SHA при более новом локальном
  HEAD, отказ при откате и расхождении истории.
- Финальный Docker image ранее проверен в тикете 01; пользователь подтвердил успех
  и исключил повторную локальную сборку в этой задаче.
- Code review: Standards — 0 замечаний; Spec — 0 замечаний.
- Реальный GitHub Actions run, создание удалённой ветки и доставка Amvera webhook
  в этой задаче не выполнялись. Их наблюдение входит в bootstrap тикета 04;
  инструкция и условный token fallback: `docs/operations/amvera-production.md`.
