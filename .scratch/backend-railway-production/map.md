# Карта: production-деплой backend в Railway

## Destination

Согласован production-план для backend MVP: выбран точный механизм автоматического деплоя из `main` в отдельный Railway Project, проверены необходимые изменения репозитория и составлен пошаговый чек-лист настройки, первого запуска и проверки. Фактическая настройка Railway и реализация изменений выполняются после завершения карты.

## Notes

- План и отчеты вести на русском языке.
- Для внешних фактов использовать `research` и первичные источники; для решений использовать `grilling` и при необходимости `domain-modeling`.
- Целевая топология MVP: один backend-сервис и одна реплика в отдельном Railway Project на существующем Hobby account.
- Deployment source — GitHub-репозиторий и ветка `main`; автодеплой нужен сразу, без отдельного первого ручного promotion.
- Автодеплой должен запускаться только при изменениях backend или его workspace/deployment-зависимостей и должен иметь минимальный CI gate.
- Существующая Neon-база временно используется и локально, и в production. Это осознанный MVP-риск; разделение окружений вынесено в отдельное будущее исследование.
- До переноса frontend на VPS используется Railway-generated backend domain и временный точный `FRONTEND_ORIGIN=https://sanskrit-shloka-learning.netlify.app`. Custom `app`/`api` subdomains и окончательный CORS относятся к отдельному VPS effort.
- Существующие `/railway.json`, `docs/operations/railway-production.md` и `.scratch/backend-production-hardening/` — входные данные, а не окончательные решения.
- Референс `/Users/shyam/projects/sadhana-backend` полезен как пример простого GitHub deploy, но не имеет приоритета над требованиями текущей monorepo.
- Git index и commits не менять.

## Decisions so far

- [Проверить возможности Railway для автодеплоя backend из monorepo](decisions/01-railway-monorepo-autodeploy.md) — Railway поддерживает нужный native pipeline: root monorepo + Railpack/watch patterns + GitHub `main`/CI + dashboard `Wait for CI` + pre-deploy migrations/readiness; source, secrets, domains и cost controls остаются dashboard-настройками.
- [Проверить готовность текущего backend к Railway deployment](decisions/02-current-deploy-readiness.md) — runtime/deploy foundation уже готова; до автодеплоя нужны минимальный backend CI и обновление прежнего manual-deploy runbook, без изменений runtime-кода и DB migration.
- [Выбрать точный release pipeline для backend](decisions/03-release-pipeline.md) — выбран native Railway autodeploy из `main` после узкого backend CI на Node 24; Railway CLI остаётся только планом переключения при подтверждённой проблеме `Wait for CI`.
- [Согласовать пошаговый production-план](decisions/04-production-plan.md) — согласованы минимальные repo-изменения, один ручной bootstrap зелёного SHA, дальнейший native autodeploy, компактная проверка, rollback и обязательная смена временного Netlify CORS origin при переносе frontend на VPS.

## Not yet specified

Пока нет: видимые вопросы уже оформлены отдельными decision tickets. Новая область добавляется сюда только если следующий выбор откроет ещё не формулируемую часть пути.

## Out of scope

- Фактические изменения кода, Railway/GitHub/Neon settings и сам production deploy: они начнутся только после согласования плана.
- Перенос frontend с Netlify на Nginx/VPS: отдельно исследовать и спланировать `app`/`api` subdomains, DNS/TLS, окончательный `FRONTEND_ORIGIN` и публичный API URL во frontend.
- Neon environment isolation: отдельно исследовать разделение общей MVP-базы на development и production и подготовить осознанное решение о миграции.
- Production alerting: отдельно исследовать внешний monitoring, каналы уведомлений, правила срабатывания и incident workflow.
- APM, полноценная observability-платформа, autoscaling, serverless, несколько Railway-реплик и shared rate-limit storage.
