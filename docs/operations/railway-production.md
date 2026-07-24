# Railway/Neon production runbook

Runbook описывает первый и последующие production-релизы одного backend-сервиса из
ветки `main`. Штатная цепочка релиза:

```text
backend-related push → Backend CI → Railpack build → compiled migrations
→ /health/ready → Active
```

Frontend-only push не входит в backend release scope и не должен запускать ни
`Backend CI`, ни Railway deployment. GitHub paths и Railway `watchPatterns` должны
меняться вместе; сейчас их общий список состоит из:

```text
apps/api/**
packages/api-contract/**
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
tsconfig.base.json
railway.json
.github/workflows/backend-ci.yml
```

## Перед началом

Понадобятся:

- существующий Railway Hobby account с правом создать project и подключить GitHub;
- доступ Railway GitHub App к этому repository;
- существующая Neon database и доступ к её connection details;
- существующая пользовательская учётная запись для smoke-check;
- текущий production frontend на Netlify, настроенный на Railway-generated API URL;
- текущая ветка `main` на GitHub с успешным check `Backend CI / Verify backend release`.

Production и development временно используют одну Neon database. Это принятое
ограничение MVP: не запускай эксперименты, тесты или ручные destructive SQL-команды
против неё. Реальные connection strings, пароли и токены нельзя сохранять в repository,
ticket, commit, shell history, screenshot или отчёт.

## Создание Railway project и backend service

1. В существующем Hobby account создай отдельный Railway Project для production
   backend. Не добавляй сервис в другой project.
2. Убедись, что в project есть отдельное environment `production`, и переключись в
   него перед дальнейшей настройкой.
3. Создай в этом environment один service из GitHub repository. Если Railway просит
   расширить доступ GitHub App, разреши только нужный repository.
4. В Service Settings → Source выбери этот repository и branch `main`.
5. Оставь Root Directory равным `/`: API использует общий lockfile, workspace config,
   TypeScript config и `packages/api-contract`.
6. Используй repository-owned config из корневого `/railway.json`. Не дублируй его
   build/deploy значения в Dashboard: config фиксирует Railpack, build, pre-deploy,
   start, readiness и restart policy.
7. В Deploy settings включи GitHub autodeploy и `Wait for CI`. Не добавляй Railway
   token или отдельный CLI deploy workflow.
8. В Networking создай Railway-generated public domain. Custom domain в этом effort
   не настраивается.
9. Выбери один регион рядом с регионом существующей Neon database. Оставь ровно одну
   replica и выключи Serverless. Autoscaling и дополнительные replicas не включай.

После изменения Dashboard может показать staged changes. Пока не применяй их: первый
запуск выполняется один раз по процедуре bootstrap ниже.

## Production variables

Добавь variables в Railway Dashboard только для environment `production` и этого
backend service:

| Variable | Точное значение или источник |
| --- | --- |
| `NODE_ENV` | `production` |
| `FRONTEND_ORIGIN` | временно ровно `https://sanskrit-shloka-learning.netlify.app` |
| `DATABASE_URL` | pooled connection string существующей Neon database; hostname содержит `-pooler` |
| `DATABASE_DIRECT_URL` | direct connection string той же database; hostname не содержит `-pooler` |
| `DATABASE_POOL_MAX` | `5` |

В Neon Dashboard открой connection details одной и той же database и скопируй два
endpoint: pooled URL нужен постоянно работающему API, direct URL — только migration
runner. Сохрани исходные database name, role и SSL query parameters. Не используй URL
от другой database или branch.

Не создавай `PORT`: Railway предоставляет его процессу автоматически. Не добавляй
production secrets в `.env`, GitHub Actions variables или repository. Перед
bootstrap проверь только наличие и область variables, не выводя их значения в logs.

## Единственный ручной bootstrap

Первый deployment создаётся применением staged changes. Это единственное ручное
исключение: у него нет свежего push-события, на котором `Wait for CI` мог бы проверить
новую версию.

1. Открой ветку `main` на GitHub и скопируй полный текущий commit SHA.
2. Убедись, что именно для этого SHA завершился успешно check
   `Backend CI / Verify backend release`.
3. В Railway перед применением staged changes проверь, что source показывает тот же
   repository, branch `main` и тот же latest commit SHA. При несовпадении остановись:
   не выбирай другой commit вручную и не обходи CI.
4. Ещё раз проверь Root Directory `/`, repository config `/railway.json`, variables,
   generated domain, регион, одну replica и выключенный Serverless.
5. Один раз примени staged changes и запусти предложенный Railway deployment.
6. Сразу после создания deployment вернись в Service Settings и проверь, что GitHub
   autodeploy и `Wait for CI` по-прежнему включены для branch `main`.

После bootstrap не используй ручной deploy как обычный promotion-механизм. Каждый
следующий backend release должен начинаться подходящим push в `main`: новый push
отменяет незавершённый backend CI предыдущего commit, а Railway ждёт зелёный CI.

## Проверка первого deployment

Проверяй стадии по порядку на странице deployment details:

1. Builder — `RAILPACK`; build log показывает успешную команду
   `pnpm --filter @sanskrit-shloka-learning/api... build` и созданные
   `apps/api/dist/main.js` и `apps/api/dist/database/migrate.js`.
2. Pre-deploy выполняет скомпилированную команду
   `node apps/api/dist/database/migrate.js`. Допустимы успешное применение pending
   migrations или сообщение об их отсутствии; ненулевой exit code должен остановить
   deployment.
3. Start выполняет `node apps/api/dist/main.js`; runtime log не содержит startup
   errors, а процесс слушает предоставленный Railway `PORT` на `0.0.0.0`.
4. Railway получает `200` от `/health/ready` в пределах healthcheck timeout, после
   чего deployment получает статус `Active`.
5. Открой `https://<railway-generated-domain>/health/live` и
   `https://<railway-generated-domain>/health/ready`: оба endpoint возвращают `200`
   и безопасный JSON.
6. Просмотри build, pre-deploy и runtime logs. В них не должно быть connection strings
   (`postgresql://`), database password, `Authorization`, Bearer token, access token,
   пользовательского password, SQL values, stack trace или персональных данных. Не
   вставляй реальные secrets в поле поиска logs.

Railway pre-deploy выполняется после build и останавливает deployment при ошибке:
<https://docs.railway.com/deployments/pre-deploy-command>. Healthcheck допускает новую
версию в трафик только после `200`:
<https://docs.railway.com/deployments/healthchecks>. Healthcheck — release gate, а не
постоянный uptime monitoring.

## Smoke-check через production frontend

1. Убедись, что Netlify frontend настроен на точный Railway-generated API origin без
   завершающего `/`.
2. Открой `https://sanskrit-shloka-learning.netlify.app` в браузере.
3. Войди существующим пользователем. Не копируй access token в отчёт.
4. Открой защищённую страницу, например dashboard или settings, и дождись загрузки
   данных.
5. В browser network panel проверь, что запросы уходят на Railway-generated API URL и
   не блокируются CORS.

Один сценарий подтверждает public routing, точный CORS origin, auth и чтение общей
Neon database. Отдельные ручные проверки rate limit, запрещённого origin, request ID и
admin API в первый smoke-check не входят.

Зафиксируй результат без secrets:

```text
Дата/время UTC:
Commit SHA:
Railway deployment ID:
Оператор:

[ ] Backend CI успешен для того же SHA
[ ] Railpack build успешен
[ ] compiled pre-deploy migrations успешны или pending migrations отсутствуют
[ ] /health/ready = 200 до Active
[ ] deployment = Active
[ ] runtime logs без startup errors и явной утечки secrets
[ ] login существующего пользователя успешен
[ ] защищённая страница загрузилась через Railway API

Результат: PASS / FAIL
Безопасные замечания:
```

## Ошибки до активации

Ошибка CI, Railpack build, pre-deploy migration или readiness означает, что новый
deployment не стал `Active`. Если уже есть активная версия, она продолжает обслуживать
трафик; для самого первого deployment предыдущей версии нет.

1. Не обходи упавший gate ручным deploy или отключением migration/readiness.
2. Диагностируй безопасное сообщение соответствующей стадии, исправь первопричину и
   отправь новый commit в `main`.
3. Не редактируй migration, уже записанную в `schema_migrations`. Исправление истории
   оформляется следующей migration.
4. Учти, что успешные изменения внешней Neon database автоматически не откатываются,
   даже если следующая стадия deployment упала.

## Регрессия активной версии и rollback

Railway rollback допустим только для регрессии уже активной версии и только после
подтверждения, что предыдущий application build совместим с текущей схемой Neon:

1. Сравни migrations между текущим и предыдущим deployment.
2. Если схема backward-compatible, выбери предыдущий успешный deployment в Railway,
   выполни rollback/redeploy и повтори readiness и smoke-check.
3. Если миграция сделала схему несовместимой со старой версией, не выполняй rollback:
   выпусти forward fix через обычный `main` → CI → Railway pipeline.
4. Не выполняй обратный SQL вручную без отдельного recovery-плана.

Rollback возвращает application deployment, но не откатывает Neon migrations.

## Условный fallback для `Wait for CI`

Не добавляй Railway CLI pipeline заранее. Если реальный запуск подтверждает, что
`Wait for CI` отсутствует или ненадёжно связывает deployment с GitHub checks:

1. отключи native GitHub autodeploy, чтобы не было двух конкурирующих механизмов;
2. зафиксируй наблюдаемое поведение и SHA в отдельном ticket без secrets;
3. отдельным изменением добавь deploy job после зелёного backend CI, передающий Railway
   CLI именно проверенный commit;
4. только тогда создай scoped Railway token в GitHub Secrets;
5. сохрани прежние Railpack build, compiled pre-deploy migrations и readiness gates.

## Передача будущим efforts

- При переносе frontend с Netlify на Nginx/VPS замени временный
  `FRONTEND_ORIGIN=https://sanskrit-shloka-learning.netlify.app` на новый точный
  production HTTPS origin без path, wildcard и завершающего `/`, передай актуальный
  API URL frontend и повтори login/CORS smoke-check.
- Отдельные Neon environments для development и production остаются следующим
  database effort; текущий runbook сознательно использует одну существующую database.
- Custom domains для frontend/API и настройка DNS выполняются отдельным effort.
- Постоянный monitoring, alerting, cost alerts и Compute hard limit не входят в этот
  bootstrap и требуют отдельного решения.
