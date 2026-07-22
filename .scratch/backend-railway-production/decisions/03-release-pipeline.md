# Выбрать точный release pipeline для backend

Type: grilling
Status: resolved
Blocked by: 01 - Проверить возможности Railway для автодеплоя backend из monorepo; 02 - Проверить готовность текущего backend к Railway deployment

## Question

Какой точный pipeline реализует согласованную политику — немедленный автодеплой из `main`, backend-only triggers и обязательный минимальный CI gate — с наименьшей сложностью для одного разработчика? Какие части должны жить в репозитории, GitHub и Railway dashboard, и какой fallback выбрать для ограничений Railway?

## Answer

Штатный pipeline — native Railway GitHub autodeploy из `main`: один backend CI
workflow запускается по backend/deployment-related paths, выполняет frozen install и
последовательно проверяет `typecheck`, `test`, `build` для API и его
workspace-зависимостей. Node закрепляется на major 24. Незавершённый CI устаревшего
commit отменяется при новом push.

Railway с включённым в Dashboard `Wait for CI` продолжает deployment только после
успешного CI, затем выполняет Railpack build, pre-deploy migrations, запуск API и
readiness перед активацией. GitHub paths и Railway watch patterns синхронизируются;
изменения только frontend не запускают backend pipeline. В репозитории живут workflow,
Node constraint, `railway.json` и runbook, а source/branch, `Wait for CI`, variables,
secrets, domain и cost controls настраиваются в Railway Dashboard.

Fallback заранее не реализуется: если первый реальный запуск подтвердит отсутствие или
ненадёжность `Wait for CI`, native autodeploy отключается, а отдельный GitHub Actions
deploy job после зелёного CI передаёт Railway CLI именно проверенный commit. Railway
token в GitHub Secrets появляется только при таком переключении; Railpack build,
pre-deploy migrations и readiness остаются неизменными.
