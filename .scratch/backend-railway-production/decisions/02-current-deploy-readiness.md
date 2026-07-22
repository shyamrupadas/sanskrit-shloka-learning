# Проверить готовность текущего backend к Railway deployment

Type: research
Status: resolved
Blocked by: None - can start immediately

## Question

Насколько текущие `railway.json`, API build/start, production env validation, compiled migration runner, health endpoints и runbook подходят для отдельного Railway Project с немедленным автодеплоем? Что полезно перенять из `/Users/shyam/projects/sadhana-backend`, что неприменимо к monorepo и какие минимальные разрывы остаются до выбранной цели?

## Answer

Backend уже имеет подходящий monorepo-aware `railway.json`, compiled pre-deploy migrations,
fail-fast production env, `0.0.0.0:$PORT`, readiness/liveness и graceful shutdown. Из
референса стоит перенять только простоту GitHub source connection; его single-package
build-on-start, migrations без history/lock, отсутствие readiness и dashboard-only
конфигурацию копировать не следует. До немедленного автодеплоя обязательны минимальный
backend CI workflow и обновление runbook, который сейчас сознательно описывает прежние
manual deploy без CI. Возможная правка `railway.json` зависит только от отдельного
исследования актуального Railway CI gate; изменений runtime-кода и новой DB migration
по локальному аудиту не требуется.

Подробности и ссылки на первичные локальные файлы:
[Аудит готовности backend к Railway deployment](../research/02-current-deploy-readiness.md).
