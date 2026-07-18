# Railway/Neon production runbook

Runbook рассчитан на одного разработчика, одну долгоживущую Railway-реплику API и
существующую Neon database. Он не включает serverless, autoscaling, Dockerfile,
автоматическое продвижение каждого push, CI, APM или постоянный uptime monitor.

## Конфигурация сервиса

Railway service должен использовать корень репозитория как Root Directory и
`/railway.json` как Config File. Команды в config-as-code запускаются от корня pnpm
workspace:

- Railpack собирает API и его workspace dependencies;
- pre-deploy запускает скомпилированный `apps/api/dist/database/migrate.js`;
- start запускает `apps/api/dist/main.js`;
- `/health/ready` допускает новую версию в трафик;
- после `SIGTERM` старой версии дается 10 секунд на graceful shutdown до `SIGKILL`.

В Railway оставь одну реплику в одном регионе и выключи Serverless. Не добавляй
Dockerfile без отдельной доказанной причины. Значения config-as-code имеют приоритет
над одноименными настройками dashboard; итоговую конфигурацию каждого deploy проверяй
на странице deployment details.

Railway variables:

| Variable | Значение и источник | Секрет |
| --- | --- | --- |
| `NODE_ENV` | ровно `production` | нет |
| `PORT` | значение, автоматически предоставленное Railway; не подменять жестко заданным портом | нет |
| `FRONTEND_ORIGIN` | один точный HTTPS origin production frontend, например `https://app.example.com`, без path, wildcard и завершающего `/` в настройке | нет |
| `DATABASE_URL` | pooled Neon runtime URL; hostname Neon содержит `-pooler`, query string сохраняется | да |
| `DATABASE_DIRECT_URL` | отдельный direct Neon URL для migrations; hostname не содержит `-pooler` | да |
| `DATABASE_POOL_MAX` | `5` для единственной небольшой реплики | нет |

Не копируй реальные connection strings, пароли или session tokens в ticket, commit,
shell history, скриншот или отчет. Runtime и migrations пока могут использовать одну
DB-роль, но URL обязаны указывать на разные pooled/direct endpoints.

## Локальная проверка перед deploy

Начинай с чистой установки, соответствующей lockfile, затем выполни от корня
репозитория:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
```

Проверь, что build создал как минимум:

```text
apps/api/dist/main.js
apps/api/dist/database/migrate.js
```

Для локальной проверки с development/test database можно запустить API и отдельно
вызвать:

```sh
pnpm --filter @sanskrit-shloka-learning/api start
curl --fail --silent --show-error http://127.0.0.1:3000/health/live
curl --fail --silent --show-error http://127.0.0.1:3000/health/ready
```

`/health/live` подтверждает, что Node/Nest обслуживает HTTP, и не обращается к БД.
`/health/ready` выполняет короткий `SELECT 1`; при недоступности PostgreSQL он
возвращает безопасный `503` без SQL, connection string, stack trace и сообщения
драйвера.

Не запускай production migration command локально против Neon production как часть
обычной проверки. Миграции production запускает отдельный Railway pre-deploy container
с `DATABASE_DIRECT_URL`.

## Ручное продвижение первых релизов

Для первых production-релизов отключи GitHub autodeploy и продвигай проверенный commit
вручную:

1. Сверь commit SHA и успешные локальные `test`, `typecheck`, `build`.
2. Проверь service variables, одну реплику, Root Directory и путь config-as-code, не
   раскрывая значения секретов.
3. Вручную запусти deploy выбранного commit в Railway.
4. Прочитай build log. Ошибка workspace build должна завершить deploy до запуска
   migrations.
5. Прочитай pre-deploy log. Допустимы сообщения об успешно примененных migrations или
   об отсутствии pending migrations. Любая ошибка должна остановить deploy; не запускай
   новую версию вручную в обход gate.
6. Убедись, что start log не содержит startup failure и приложение слушает Railway
   `PORT` на `0.0.0.0`.
7. Дождись `200` от `/health/ready` и статуса Active только после healthcheck.
8. Выполни smoke-check ниже и заполни журнал. Только после него считай релиз
   подтвержденным.

Railway pre-deploy выполняется после build и не продолжает deployment при ненулевом
exit code: <https://docs.railway.com/deployments/pre-deploy-command>. Healthcheck
опрашивает новую версию до `200`, и только затем Railway переключает трафик:
<https://docs.railway.com/deployments/healthchecks>. Поэтому failed build, migration
или readiness не должны активировать новую версию.

Healthcheck Railway является deploy gate, а не постоянным monitoring: после активации
версии Railway перестает опрашивать endpoint. Решение о внешнем uptime monitoring нужно
принять отдельно после первого релиза; текущая задача его не создает.

## Smoke-check после deploy

Подставляй только публичный API origin. Не вставляй access token или DB URL в команды,
которые попадут в shell history или отчет.

1. Liveness и readiness возвращают `200` и безопасный JSON:

   ```sh
   curl --fail --silent --show-error https://api.example.com/health/live
   curl --fail --silent --show-error https://api.example.com/health/ready
   ```

2. Запрос с разрешенным Origin содержит ровно настроенный
   `Access-Control-Allow-Origin`:

   ```sh
   curl --silent --show-error --dump-header - --output /dev/null \
     --header 'Origin: https://app.example.com' \
     https://api.example.com/health/live
   ```

3. Запрос с запрещенным Origin не содержит `Access-Control-Allow-Origin`. Сам HTTP
   ответ может быть `200`: CORS запрещает браузеру читать ответ, а не обязан превращать
   server response в `4xx`.

   ```sh
   curl --silent --show-error --dump-header - --output /dev/null \
     --header 'Origin: https://not-allowed.example' \
     https://api.example.com/health/live
   ```

4. Через production frontend войди существующим тестовым пользователем. Проверь
   успешный login и загрузку защищенной страницы. Не копируй Bearer token в отчет.
5. Через существующую admin-учетную запись прочитай `GET /api/admin/catalog` и проверь
   хотя бы один ожидаемый источник/шлоку. Затем прочитай одну существующую
   пользовательскую запись через `GET /api/account/settings` или соответствующий экран
   frontend.
6. Последним проверь auth rate limit с одного IP: отправляй заведомо неверный,
   несекретный login не более 11 раз и убедись, что после лимита ответ стал `429`.
   Проверка временно ограничит login с этого IP примерно на 15 минут, поэтому не делай
   ее до остальных auth-проверок.
7. Отправь безопасный UUID в `X-Request-Id`, проверь тот же `X-Request-Id` в ответе и
   найди соответствующий JSON `http_request` в Railway logs с методом, route, status и
   duration.
8. Просмотри build, pre-deploy и runtime logs. В них не должно быть `postgresql://`,
   DB-пароля, `Authorization`, Bearer token, password, `accessToken`, SQL values, stack
   trace или персональных данных. Не добавляй известные секреты как поисковые строки.

Журнал первого smoke-check (заполняется после реального deploy, без секретов):

```text
Дата/время UTC:
Commit SHA:
Railway deployment ID:
Оператор:

[ ] build успешен
[ ] compiled pre-deploy migrations успешны
[ ] /health/live = 200
[ ] /health/ready = 200 до активации версии
[ ] разрешенный Origin получил точный ACAO
[ ] запрещенный Origin не получил ACAO
[ ] login существующего пользователя успешен
[ ] auth rate limit вернул 429
[ ] чтение каталога успешно
[ ] чтение существующей пользовательской записи успешно
[ ] request ID совпал в response и structured log
[ ] build/pre-deploy/runtime logs проверены на отсутствие секретов

Результат: PASS / FAIL
Безопасные замечания (без токенов, URL БД и персональных данных):
```

## Failed migration

Если pre-deploy migration завершилась ошибкой:

1. Не активируй новую версию в обход pre-deploy. Предыдущая успешная версия должна
   оставаться активной.
2. По безопасному тексту migration log определи класс причины: connection/direct URL,
   права DB-роли, advisory lock, checksum mismatch или конкретная новая migration. Не
   печатай `DATABASE_DIRECT_URL` для диагностики.
3. Не редактируй migration, уже записанную в `schema_migrations`: checksum защищает
   примененную историю. Исправление оформляй следующей migration.
4. Если упала еще не примененная migration, устрани первопричину и проверь ее локально.
   Учти, что более ранние pending migrations могли уже примениться: runner выполняет
   одну транзакцию на migration, а не одну транзакцию на весь набор. Не откатывай их
   ручным SQL без отдельного плана восстановления.
5. Повтори `pnpm test`, `pnpm typecheck`, `pnpm build`, затем вручную перезапусти deploy
   исправленного commit и снова прочитай pre-deploy log/readiness.

Для редкой несовместимой migration заранее объяви короткое окно обслуживания. Общий
zero-downtime expand/migrate/contract framework в текущем MVP не предполагается.

## Обязательные follow-up задачи

- Сразу после первого production deploy отдельно спроектировать безопасный session
  transport: сохранить opaque server session, перенести token из Bearer/`localStorage`
  в host-only `Secure`, `HttpOnly`, `SameSite=Strict` cookie и добавить CSRF-защиту.
- Разделить PostgreSQL runtime и migration roles/credentials с минимально необходимыми
  правами.
- Добавить строгую runtime HTTP validation body/path/query на границе API.
- До второй Railway-реплики заменить in-memory auth rate-limit storage на shared
  storage; только после этого пересматривать topology и pool size по измерениям.
- При росте проекта добавить отдельное real-Postgres test environment для SQL и
  migrations, не направляя автоматические тесты в production Neon.

Graceful teardown Railway посылает старой версии `SIGTERM`, а после configured draining
interval — `SIGKILL`: <https://docs.railway.com/deployments/deployment-teardown>.
Nest shutdown hook закрывает HTTP application и вызывает DB lifecycle hook, который
закрывает pool в пределах этого интервала.
