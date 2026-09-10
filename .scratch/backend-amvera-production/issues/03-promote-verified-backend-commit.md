# 03 — Продвигать в Amvera только проверенный backend commit

**What to build:** Сделать постоянную ветку `amvera-api` указателем на последний полностью проверенный backend commit, чтобы Amvera получала release-кандидат только после успешного Backend CI и не реагировала на frontend-only изменения.

**Blocked by:** 01 — Собрать переносимый production-контейнер API

**Status:** ready-for-agent

- [ ] Backend CI запускается для изменений API, API-контракта, влияющих workspace/toolchain metadata, container contract и самого backend workflow, но не для frontend-only изменений.
- [ ] Verify job сохраняет существующие typecheck, tests и production build и дополнительно собирает тот же финальный production target, который будет использовать Amvera.
- [ ] Promotion выполняется отдельным job только после полного успеха verify и перемещает `amvera-api` ровно на проверенный commit SHA.
- [ ] Первый успешный promotion создаёт служебную ветку, последующие используют обычный fast-forward push; force push запрещён, а расхождение истории завершает promotion ошибкой.
- [ ] Только promotion job получает job-scoped `contents: write`; остальные jobs остаются read-only и не получают Amvera или database secrets.
- [ ] Основной путь использует штатный короткоживущий `GITHUB_TOKEN`; отдельный fine-grained token допускается только как документированный fallback, если реальный Amvera webhook проигнорирует штатный push.
- [ ] Backend CI слушает backend-related push только в `main`, поэтому push в `amvera-api` не создаёт рекурсию; актуальная concurrency-политика отменяет устаревший незавершённый release.
- [ ] Image не публикуется в registry и не добавляется отдельный credentials-based deploy pipeline.

## Parent

`.scratch/backend-amvera-production/spec.md`
