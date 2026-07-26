# Проверить готовность repositories к CI/CD на общий VDS

Type: research
Status: resolved
Blocked by: None - can start immediately

## Question

Какой минимальный рабочий GitHub Actions pipeline нужен двум ShlokaHub repositories,
если текущий frontend находится в pnpm/turbo monorepo, будущий landing гарантирует
только артефакт `dist/`, а локальные Sadhana repositories дают референс прямого
`rsync --delete`? Какие path filters, workspace build dependencies, gates, permissions,
concurrency, public variables, secrets, SSH host verification, deploy directories и
post-deploy checks обязательны, что из Sadhana можно перенять, а что нужно исправить?

## Answer

Определены точные path filters и gates для текущего pnpm/Turbo monorepo,
контракты Variables/Secrets, проверенный `known_hosts`, раздельные rsync targets,
concurrency без отмены неатомарного deploy и smoke-checks. Для ещё не созданного
landing repository полностью определены deploy/SSH/smoke части; install/build
остаётся единственным stack-specific adapter, а committed `dist/index.html`
допустим для первой заглушки. Подробности:
[аудит готовности repositories к CI/CD](../research/03-repository-cicd-readiness.md).
