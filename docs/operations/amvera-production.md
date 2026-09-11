# Production backend в Amvera

Production API работает в Amvera на `https://api.shlokahub.com`, использует Neon
и обслуживает frontend `https://app.shlokahub.com`. Amvera — временная площадка
до перехода на VDS. Бесплатный HTTPS-домен используется для первоначальной проверки.

Для работающего приложения смотри раздел «Обычный выпуск backend» ниже.
Разделы 1–7 описывают первоначальную настройку.

Выполняй шаги по порядку. Если приложение или подключение уже создано, открой
его и сверь значения с соответствующим шагом.

## 1. Создать приложение

1. Открой [кабинет Amvera](https://cloud.amvera.ru/).
2. Нажми **«Создать проект»**.
3. Выбери тип сервиса **«Приложение»**.
4. Введи название, например `shlokahub-api`.
5. Выбери согласованный тариф и нажми **«Далее»**.
6. На этапе **«Загрузка данных»** выбери подключение GitHub и выполни шаг 2.
   Если мастер уже закрыт, открой созданное приложение → **«Репозиторий»**.

**Результат:** создан проект приложения и открыта форма подключения исходников.
[Создание проекта в Amvera](https://docs.amvera.ru/applications/quick-start.html).

## 2. Подключить GitHub и ветку amvera-api

### 2.1. Заполнить подключение в Amvera

В форме подключения GitHub заполни:

| Поле | Значение |
| --- | --- |
| Git-сервис | `GitHub` |
| Владелец | `shyamrupadas` |
| Репозиторий | `sanskrit-shloka-learning` |
| URL репозитория, если используется текстовое поле | `https://github.com/shyamrupadas/sanskrit-shloka-learning` |
| Ветка / Branch / Целевая ветка | `amvera-api` |
| Событие, если предлагается выбор | Только `Push` |

Выбери существующую ветку **`amvera-api`**. Если список веток пуст, проверь владельца,
репозиторий и доступ GitHub token, затем обнови список.

Если форма запрашивает GitHub token, создай его по шагу 2.2. Если подключение уже
сохранено, сверь выбранную ветку и перейди к проверке webhook в шаге 2.3.

### 2.2. Создать GitHub token для подключения

1. Открой GitHub → аватар справа сверху → **Settings**.
2. Внизу левого меню открой **Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**.
3. Задай название `amvera-repository`, срок действия и владельца `shyamrupadas`.
4. В **Repository access** выбери **Only select repositories** и отметь
   `sanskrit-shloka-learning`.
5. В **Repository permissions** задай права согласно способу подключения:

| Способ подключения | Права token |
| --- | --- |
| Amvera читает код, webhook создаёшь вручную по шагу 2.3 | `Contents: Read-only` |
| Мастер Amvera сам создаёт webhook | `Contents: Read-only`, `Webhooks: Read and write` |

6. Нажми **Generate token**.
7. Скопируй token в поле подключения GitHub в Amvera.
8. Сохрани подключение. Запиши срок действия token в свой менеджер паролей вместе
   с напоминанием о его обновлении.

[Создание GitHub token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).

### 2.3. Настроить webhook

Webhook — уведомление от GitHub, по которому Amvera забирает обновлённый код.

1. Открой [репозиторий GitHub](https://github.com/shyamrupadas/sanskrit-shloka-learning)
   → **Settings → Webhooks**.
2. Если мастер Amvera уже создал webhook, открой его и сверь настройки с таблицей
   ниже. Если webhook ещё предстоит создать, выполни следующие действия.
3. В Amvera → приложение → **«Репозиторий»** открой ручную настройку GitHub webhook.
4. Выбери событие **Push** и целевую ветку **`amvera-api`**.
5. Сгенерируй случайный секрет в менеджере паролей. Вставь его в поле **Secret**
   в Amvera и сохрани в менеджере паролей.
6. Скопируй URL webhook, который показывает Amvera, и нажми **«Применить»**.
7. В GitHub → **Settings → Webhooks** нажми **Add webhook** и заполни:

| Поле GitHub | Значение |
| --- | --- |
| Payload URL | URL webhook, скопированный из Amvera |
| Content type | `application/json` |
| Secret | Тот же секрет, который указан в Amvera |
| SSL verification | Включена |
| Events | `Just the push event` |
| Active | Включено |

8. Нажми **Add webhook**.

**Результат:** в Amvera сохранена ветка `amvera-api`, в GitHub сохранён активный
push webhook. Доставку push проверишь при первом запуске в шаге 5.
[Подключение Amvera](https://docs.amvera.ru/applications/git/webhooks.html),
[создание webhook в GitHub](https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks).

## 3. Добавить настройки приложения и доступ к Neon

### 3.1. Скопировать две строки подключения из Neon

1. Открой кабинет Neon и production-проект, который сейчас использует приложение.
2. На странице проекта нажми **Connect**.
3. Выбери ту же ветку базы, database и роль, которые использует production API.
4. Выбери формат **Connection string**.
5. Включи **Connection pooling** и скопируй строку подключения целиком.
   Она нужна для секрета `DATABASE_URL`; её hostname содержит `-pooler`.
6. Выключи **Connection pooling** и скопируй вторую строку подключения целиком.
   Она нужна для секрета `DATABASE_DIRECT_URL`; это direct endpoint.

Копируй значение, начинающееся с `postgresql://`, включая параметры после `?`.
[Connection pooling в Neon](https://neon.com/docs/connect/connection-pooling).

### 3.2. Внести значения в Amvera

1. Открой приложение Amvera → вкладка **«Переменные»**. В мастере создания это
   этап **«Создание переменных окружения»**.
2. Нажми **«Добавить переменные или секрет»**.
3. Введи имя и значение первой строки таблицы и выбери указанный тип хранения.
4. В поле **«Этап»** выбери **«Запуск»**.
5. Подтверди добавление и повтори для остальных строк.

| Имя | Тип хранения | Значение | Этап |
| --- | --- | --- | --- |
| `NODE_ENV` | Переменная | `production` | Запуск |
| `PORT` | Переменная | `80` | Запуск |
| `FRONTEND_ORIGIN` | Переменная | `https://app.shlokahub.com` | Запуск |
| `DATABASE_POOL_MAX` | Переменная | `5` | Запуск |
| `DATABASE_URL` | Секрет | Строка Neon с включённым Connection pooling | Запуск |
| `DATABASE_DIRECT_URL` | Секрет | Строка Neon с выключенным Connection pooling | Запуск |

В поле значения вставляй текст из третьего столбца таблицы, например `production`.

**Результат:** в списке есть шесть записей с этапом «Запуск»; две строки подключения
сохранены как секреты.
[Переменные Amvera](https://docs.amvera.ru/applications/configuration/variables.html).

## 4. Проверить число реплик

1. Открой страницу приложения Amvera.
2. Справа вверху найди **«Реплик»**. Значение `0 / 1` означает:
   сейчас запущено 0 экземпляров, желаемое количество — 1.
3. Если справа от `/` уже стоит `1`, переходи к шагу 5. Если значение другое,
   установи желаемое количество `1` элементом управления рядом со счётчиком.

**Результат:** желаемое количество экземпляров равно `1`.
[Управление репликами](https://docs.amvera.ru/general/scaling.html).

## 5. Запустить первый выпуск через GitHub

К этому шагу должны быть сохранены GitHub-подключение, webhook и шесть переменных;
желаемое количество реплик должно быть равно `1`.

### 5.1. Создать новый commit, который запустит Backend CI

1. Открой в GitHub файл
   [`.github/workflows/backend-ci.yml` в ветке main](https://github.com/shyamrupadas/sanskrit-shloka-learning/blob/main/.github/workflows/backend-ci.yml).
2. Нажми кнопку редактирования файла — значок карандаша.
3. Найди существующую строку `  promote:`. Добавь непосредственно перед ней
   комментарий, чтобы фрагмент выглядел так:

```yaml
  # Amvera bootstrap: verify webhook delivery after connecting the release branch.
  promote:
```

4. Нажми **Commit changes**. Сообщение commit:
   `ci(api): document amvera bootstrap webhook verification`.
5. Сохрани изменение в `main`. Если GitHub требует pull request, создай его и
   выполни обычное слияние в `main`.

**Результат:** появился новый commit в `main` и начался Backend CI. Если этот
комментарий уже существует, дополни его датой текущей проверки и сохрани изменение.

### 5.2. Дождаться проверки и продвижения ветки

1. Открой [Actions → Backend CI](https://github.com/shyamrupadas/sanskrit-shloka-learning/actions/workflows/backend-ci.yml).
2. Открой запуск для только что созданного commit.
3. Дождись зелёного результата у **Verify backend release**, затем у
   **Promote verified backend commit**.
4. Скопируй идентификатор commit из этого запуска. Далее он обозначен как
   **release SHA**.
5. Открой [ветку amvera-api](https://github.com/shyamrupadas/sanskrit-shloka-learning/tree/amvera-api).
   Открой её последний commit и сравни SHA с release SHA.

**Результат:** оба задания CI успешны, `amvera-api` указывает на release SHA.
Если задание красное, открой его и скопируй текст ошибки упавшего шага для разбора.

### 5.3. Проверить доставку push в Amvera

1. В GitHub открой **Settings → Webhooks → webhook Amvera → Recent Deliveries**.
2. Открой событие **push**, относящееся к новому release.
3. В **Request → Payload** проверь `ref: refs/heads/amvera-api` и значение `after`,
   равное release SHA.
4. Во вкладке **Response** проверь успешный HTTP-ответ, например `200`.
5. Открой приложение Amvera → **«Репозиторий» → Code**. Дождись появления кода.
6. Проверь верхний уровень файлов: `Dockerfile`, `package.json`, `pnpm-lock.yaml`,
   папки `apps`, `packages`, `docker`.
7. Открой доступную в приложении историю версий/коммитов и сверь исходный commit
   с release SHA. Если кабинет показывает только собственный идентификатор версии,
   запроси у поддержки соответствующий GitHub SHA этой сборки.

**Результат:** push доставлен, Amvera получила исходники нужного release.

### 5.4. Проверить Docker-сборку и запуск

Amvera автоматически выбирает Docker-сборку по корневому `Dockerfile`.
[Выбор способа сборки](https://docs.amvera.ru/applications/build.html).

1. Открой приложение Amvera → **«Лог сборки»**.
2. Дождись успешного завершения сборки. В логе должны быть установка pnpm
   dependencies, компиляция API и создание финального Docker image.
3. Открой **«Лог приложения»**.
4. Найди `Applied database migration …` либо `No pending database migrations`.
5. Проверь, что после миграций начался запуск Nest и приложение перешло в готовое
   состояние. Проверь также отсутствие ошибок запуска и повторных рестартов.

**Результат:** собран контейнер, startup runner успешно проверил/применил миграции,
API запущен. Для просмотра более ранних сообщений используй **«Загрузить историю»**
в окне логов. Если приложение уже работало при изменении переменных, выполни его
перезапуск через панель управления проектом.

### 5.5. Если выпуск остановился

| Где остановилось | Что проверить или сделать |
| --- | --- |
| Красное задание GitHub Actions | Открой упавший шаг и разбери его ошибку |
| `promote` пишет `Everything up-to-date` | Создай новое изменение комментария по шагу 5.1 и дождись нового CI |
| Push не найден в Recent Deliveries | Сверь новый SHA ветки, активность webhook и выбор push events |
| Webhook отвечает ошибкой | Сверь Payload URL, одинаковый Secret и Response body |
| Delivery успешна, Code пуст или старый | Проверь GitHub token Amvera, срок действия и ветку `amvera-api` |
| Мастер требует конфигурацию Docker | Открой Code и проверь наличие корневого `Dockerfile`; для обязательной формы уточни путь продолжения у поддержки Amvera |
| `PORT is required` | Во вкладке «Переменные» добавь `PORT` со значением `80`, типом «Переменная» и этапом «Запуск», сохрани и перезапусти приложение |
| `Database migration failed` | Сверь direct URL, выбранную базу, доступность Neon и сообщение ошибки |
| `startup_failed` | Сверь шесть настроек из шага 3 и текст ошибки запуска |
| `/health/ready` возвращает ошибку | Проверь логи запуска, порт `80`, путь `/health/ready` и соединение с Neon |

Если установлено, что обновление ветки через штатный `GITHUB_TOKEN` не вызывает
нужную синхронизацию Amvera, выполни раздел «Резервный token» в конце инструкции.

## 6. Добавить бесплатный HTTPS-домен

1. Открой приложение Amvera → **«Настройки»**.
2. Найди секцию **«Доменные имена»** и нажми **«Добавить доменное имя»**.
3. В типе подключения выбери **HTTPS**.
4. В типе домена выбери **«Бесплатный домен Амвера»**.
5. Если форма запрашивает путь и порт приложения, укажи `/` и `80`.
6. Подтверди добавление и дождись готовности сертификата.
7. Скопируй выданный адрес вида `https://…amvera.io`.

**Результат:** у приложения есть бесплатный HTTPS-адрес.
[Добавление домена](https://docs.amvera.ru/applications/configuration/network.html).

## 7. Проверить доступность API и CORS

Все команды этого раздела выполняй в одном окне **Терминала на Mac**.

### 7.1. Указать адрес

Вставь в следующую строку свой адрес из шага 6, заканчивающийся именем домена:

```bash
AMVERA_API_ORIGIN='https://REPLACE-WITH-GENERATED-DOMAIN'
```

Выполни строку нажатием Enter. При открытии нового окна Терминала выполни её заново.

### 7.2. Проверить процесс и подключение к базе

```bash
curl --silent --show-error --max-time 30 --include "$AMVERA_API_ORIGIN/health/live"
curl --silent --show-error --max-time 30 --include "$AMVERA_API_ORIGIN/health/ready"
```

**Результат:** обе команды выводят статус `200` и тело `{"status":"ok"}`.
Если ответ отличается, вернись к соответствующей строке таблицы в шаге 5.5.

### 7.3. Проверить доступ с адреса frontend

```bash
curl --silent --show-error --max-time 30 --include --request OPTIONS \
  "$AMVERA_API_ORIGIN/api/auth/login" \
  --header 'Origin: https://app.shlokahub.com' \
  --header 'Access-Control-Request-Method: POST' \
  --header 'Access-Control-Request-Headers: content-type,authorization'
```

**Результат:** статус `204`, заголовок
`Access-Control-Allow-Origin: https://app.shlokahub.com`, в разрешённых методах
есть POST, в разрешённых заголовках — Content-Type и Authorization.
Регистр названий заголовков может отличаться.

Выполни контрольный запрос с другим origin:

```bash
curl --silent --show-error --max-time 30 --include --request OPTIONS \
  "$AMVERA_API_ORIGIN/api/auth/login" \
  --header 'Origin: https://untrusted.example' \
  --header 'Access-Control-Request-Method: POST'
```

**Результат:** у контрольного ответа отсутствует `Access-Control-Allow-Origin`.

## Обычный выпуск backend

```text
backend-related push в main → Backend CI → amvera-api
  → push webhook → Docker build в Amvera → startup migrations → API
  → ручная проверка канонического HTTPS-домена и сайта
```

1. Внеси backend-изменение через обычный review/merge в `main`.
2. Дождись успешных `verify` и `promote` в Backend CI. Проверка включает typecheck,
   тесты, production build и сборку Docker image. При ошибке `amvera-api` не обновляется.
3. Сверь SHA проверенного commit с `amvera-api` и исходным commit сборки Amvera.
   Убедись, что push webhook доставлен и новая сборка завершилась.
4. В логах приложения проверь успех миграций и запуска API, отсутствие startup
   errors и явной утечки секретов. При ошибке миграции API не запускается.
5. Выполни [проверку API и сайта](amvera-domain-cutover.md#4-проверить-api-и-сайт):
   оба health endpoint — `200`, вход существующей учётной записью и загрузка данных
   защищённой страницы успешны. Автоматический допуск трафика по readiness не настроен.

`amvera-api` — указатель на проверенный backend release. Ветка обновляется CI
обычным fast-forward push; ручные commits, PR в эту ветку и force push не используются.
Изменения только frontend или документации не запускают Backend CI; точный список
путей задан в [workflow](../../.github/workflows/backend-ci.yml).

Контейнер запускает compiled migrations через direct Neon endpoint при каждом
старте, затем заменяет стартовый процесс на API. Runtime работает через pooled
endpoint. Сохраняй **одну реплику**: перед масштабированием миграции нужно вынести
в отдельный release step. Ручной запуск миграций с ноутбука не входит в обычный выпуск.

При неудачном CI исправь ошибку и выпусти новый commit через `main`. Если CI прошёл,
а deployment не появился, проверь доставку webhook и настройки из шага 5.5.
Если не прошли миграции или health-check, разбери ошибку запуска и подключения к Neon
до подтверждения выпуска; не меняй release-ветку вручную.

## Проверка production CORS

Runtime-переменная `FRONTEND_ORIGIN` должна быть равна `https://app.shlokahub.com`.
После её изменения примени настройки в Amvera и перезапусти приложение. Для проверки
канонического API задай в Терминале:

```bash
AMVERA_API_ORIGIN='https://api.shlokahub.com'
```

Выполни команды шага 7.3: разрешённый origin получает `204` и соответствующий
`Access-Control-Allow-Origin`, контрольный origin — ответ без этого заголовка.
Затем повтори вход и открытие защищённой страницы на production frontend.

## Будущий переход на VDS

Существующий Dockerfile остаётся основой сборки. При переходе на VDS:

1. Замени Amvera promotion на выпуск immutable image по commit SHA/digest;
   запускай на сервере конкретный проверенный digest.
2. Вынеси compiled migrations в отдельный release step до замены API-контейнера
   и до увеличения числа реплик. Убери их из startup entrypoint для новой схемы.
3. После принятой проверки VDS отключи интеграцию Amvera, удали promotion job
   и служебную ветку `amvera-api`.

Это будущая работа; текущий выпуск не требует registry или Amvera CLI.
План ресурсов и этапов: [перенос backend на VDS](backend-hosting-migration.md).

## Резервный token при подтверждённой проблеме доставки promotion

Выполняй этот раздел, если проверки шага 5 установили, что причина отсутствия
синхронизации — push через штатный `GITHUB_TOKEN`.

1. В GitHub создай отдельный fine-grained token по пути из шага 2.2:
   имя `amvera-promotion`, текущий repository, ограниченный срок действия,
   **Contents: Read and write**.
2. Открой repository → **Settings → Secrets and variables → Actions → Secrets →
   New repository secret**.
3. Имя секрета: `AMVERA_PROMOTION_TOKEN`. Значение: созданный token.
4. Открой `.github/workflows/backend-ci.yml` в ветке `main` на редактирование.
5. В задании `promote`, внутри `with` шага checkout, добавь строку `token`:

```yaml
      - name: Check out verified commit with full history
        uses: actions/checkout@v6
        with:
          ref: ${{ github.sha }}
          fetch-depth: 0
          token: ${{ secrets.AMVERA_PROMOTION_TOKEN }}
```

6. Сохрани изменение через commit/PR в `main`.
7. Повтори проверки шага 5 для нового запуска CI и нового release SHA.
8. Сохрани срок действия token и напоминание о ротации в менеджере паролей.

**Результат:** проверенный commit продвинут в `amvera-api`, webhook доставлен,
Amvera собрала тот же release SHA.
