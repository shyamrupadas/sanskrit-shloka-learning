# 01 — Собрать переносимый production-контейнер API

**What to build:** Дать владельцу приложения воспроизводимый production image, который собирает только API и необходимые workspace-зависимости, при каждом старте подготавливает схему Neon и затем запускает NestJS без зависимости от Railway или нативного Node toolchain Amvera.

**Blocked by:** None — can start immediately

**Status:** awaiting-human-review

- [x] Финальный production target собирается из чистого repository context на Node 24 с точной версией pnpm из package metadata и установкой по frozen lockfile.
- [x] Сборка охватывает API и необходимые workspace-зависимости, но не выполняет frontend build.
- [x] Слой runtime содержит compiled API, необходимые workspace artifacts и production dependencies, но не содержит frontend, TypeScript sources, devDependencies или build toolchain.
- [x] Build context исключает локальные environment-файлы, dependencies, build outputs, Git metadata, `.scratch` и test artifacts, сохраняя нужные API-контракт и workspace metadata.
- [x] Контейнер запускается непривилегированным пользователем и не требует persistent volume или записи в application filesystem.
- [x] При старте compiled migration runner использует direct database endpoint; ошибка миграции предотвращает запуск API, а после успеха стартовый процесс через process replacement передаёт управление Node.js.
- [x] Runtime принимает platform-provided `PORT` и production variables только при запуске; database URLs и другие production secrets не требуются для Docker build и не встроены в image.
- [x] Финальный production target успешно собирается локально; отдельные liveness/startup probes, Docker healthcheck, registry и Amvera-specific manifest не добавлены.

## Parent

`.scratch/backend-amvera-production/spec.md`
