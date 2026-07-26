# Согласовать итоговый пошаговый production-план

Type: grilling
Status: resolved
Blocked by: 04 - Выбрать точную схему общего VDS и границу Sadhana; 05 - Выбрать точные release pipelines для landing и application; 06 - Выбрать последовательность DNS, TLS, Railway CORS и первого выпуска

## Question

Какой единый пошаговый план, разделённый на repository changes, bootstrap VDSina и
Ubuntu, восстановление Sadhana, Cloudflare DNS, Nginx/TLS, Railway custom domain/CORS,
GitHub Secrets/Variables, удаление прежней Netlify-конфигурации и документации,
первые ShlokaHub deployments, smoke-check и порядок выпуска application перед
landing-заглушкой, можно передать в `to-spec → to-tickets` без оставшихся
архитектурных решений?

## Answer

Принят следующий единый rollout. Фактические IP-адреса, SSH host key, Railway
targets, certificate identifiers и значения Secrets появляются только при
реализации: секреты не записываются в planning artifacts и repository.

### 1. Удалить прежний Netlify production contract

В текущем ShlokaHub repository:

1. удалить `netlify.toml`;
2. актуализировать `docs/operations/railway-production.md`, убрав Netlify URL и
   временный Netlify `FRONTEND_ORIGIN`;
3. убрать остальные актуальные operational/planning-утверждения, согласно которым
   Netlify остаётся production frontend;
4. проверить, что локальная разработка по-прежнему использует собственный
   `http://localhost:5173`, а production-документация называет канонический frontend
   `https://app.shlokahub.com`.

Deploy workflow на этом шаге ещё не добавляется.

### 2. Рано переключить production CORS в Railway

1. Установить в существующем Railway backend service единственный production
   `FRONTEND_ORIGIN=https://app.shlokahub.com`.
2. Применить staged change и дождаться успешного backend deployment.
3. Проверить Railway-generated readiness endpoint.

Это намеренно создаёт переходный период, когда прежний Netlify frontend больше не
является разрешённым production origin. `localhost` в production не добавляется.

### 3. Выполнить bootstrap нового VDS

По решениям
[«Проверить production baseline VDSina и Ubuntu 26.04»](01-vdsina-ubuntu-baseline.md)
и
[«Выбрать точную схему общего VDS и границу Sadhana»](04-server-layout-security.md):

1. Через доверенную VDSina console проверить фактические Ubuntu release, диск,
   память, активный swap и доступный recovery channel; сохранить вне repository
   фактический IP нового VDS.
2. Обновить пакеты и установить Nginx, UFW, Fail2ban, Certbot и необходимые
   системные средства.
3. Создать `admin` с длинным уникальным паролем и `sudo`, затем проверить его вход и
   `sudo` в отдельной SSH-сессии.
4. Создать `deploy` без пароля и `sudo`. Установить ему публичную часть общего
   CI-ключа, используемого четырьмя repositories.
5. Запретить прямой SSH-вход `root`; ограничить `deploy` key-only входом без
   forwarding и tunnels. Применять изменения только после `sshd -t` и проверок
   `admin`, `deploy` и запрета `root`.
6. Создать с владельцем `deploy:deploy`:

   - `/var/www/sadhana-landing/html/`;
   - `/var/www/sadhana-app/html/`;
   - `/var/www/shlokahub-landing/html/`;
   - `/var/www/shlokahub-app/html/`.

7. Настроить отдельные HTTP virtual hosts и безопасный default host. Application
   hosts получают SPA fallback, landing hosts — обычную раздачу статических файлов.
8. Включить UFW с входящими TCP `22`, `80`, `443`, SSH-only Fail2ban, согласованные
   journald limits, штатную log rotation и ежедневные security updates без
   автоматической перезагрузки.
9. Если swap отсутствует и после обновления свободно не менее 3 ГБ, создать swap
   размером 1 ГБ. Иначе сначала освободить диск или повысить тариф.
10. Получить SSH host key через доверенную console/bootstrap-сессию, сверить
    fingerprint и подготовить точную `known_hosts` строку для GitHub Secrets.
11. Выполнить системные проверки из production baseline, включая `nginx -t`,
    открытые порты, ownership, SSH-матрицу, память, swap, диск, журналы и
    `reboot-required`.

Node.js и production builds на VDS не устанавливаются.

### 4. Сразу после bootstrap восстановить оба сайта Sadhana

Целевые repositories:

- frontend — `shyamrupadas/sadhana`;
- landing — `shyamrupadas/sadhana-landing`.

Для обоих repositories:

1. Обновить `SERVER_IP` на новый VDS и `SERVER_USER` на `deploy`.
2. Сохранить общий `SSH_PRIVATE_KEY`; менять его только при фактической ротации или
   невозможности использовать существующую пару.
3. Добавить проверенную строку как Secret `SSH_KNOWN_HOSTS`.
4. В workflow удалить runtime `ssh-keyscan` и записывать в `known_hosts` только
   `SSH_KNOWN_HOSTS`, сохранив `StrictHostKeyChecking=yes`.
5. Не менять остальную логику: остаются текущие `push` в `master`, install/build,
   `rsync --delete`, deploy paths и отсутствие `workflow_dispatch`.

Push минимального изменения host-key verification запускает первый deploy в
`/var/www/sadhana-app/html/` и `/var/www/sadhana-landing/html/`. До DNS cutover
нужно проверить наличие артефактов, ownership и ответы обоих HTTP virtual hosts на
новом VDS.

После этого:

1. В Cloudflare заменить IP у существующих `DNS only` A-записей
   `sadhana-tracker.com`, `www.sadhana-tracker.com` и
   `app.sadhana-tracker.com`; TTL остаётся `Auto`.
2. Не менять Railway CNAME `api.sadhana-tracker.com` и почтовые записи.
3. Дождаться резолвинга имён на новый VDS.
4. Выпустить один сертификат для `sadhana-tracker.com` +
   `www.sadhana-tracker.com` и отдельный сертификат для
   `app.sadhana-tracker.com`.
5. Настроить постоянный redirect
   `https://www.sadhana-tracker.com` → `https://sadhana-tracker.com` с сохранением
   path и query.
6. Включить HTTP → HTTPS redirects, выполнить `nginx -t`, reload,
   `certbot renew --dry-run` и smoke-check обоих production сайтов.

Принято короткое контролируемое окно возможной TLS-ошибки между DNS cutover и
выпуском сертификатов. DNS-01, Cloudflare API token на VDS и усложнение renewal не
добавляются.

### 5. Настроить Railway API domain ShlokaHub

1. Добавить `api.shlokahub.com` в существующий Railway backend service.
2. Получить от Railway фактические CNAME target и TXT ownership record.
3. Создать в Cloudflare ровно выданные CNAME и TXT в режиме `DNS only`.
4. Дождаться подтверждения ownership и Railway TLS.
5. Получить `200` от `https://api.shlokahub.com/health/ready`.

Старый Railway-generated hostname не удаляется, пока новый адрес не проверен.

### 6. Подготовить статические домены ShlokaHub и TLS

1. Завершить Nginx virtual hosts:

   - `shlokahub.com` → `/var/www/shlokahub-landing/html/`;
   - `app.shlokahub.com` → `/var/www/shlokahub-app/html/` со SPA fallback;
   - `www.shlokahub.com` → постоянный redirect на `shlokahub.com`;
   - `www.app.shlokahub.com` → постоянный redirect на
     `app.shlokahub.com`.

2. Создать четыре `DNS only` A-записи на новый VDS.
3. Дождаться правильного публичного DNS.
4. Выпустить две certificate groups:

   - `shlokahub.com` + `www.shlokahub.com`;
   - `app.shlokahub.com` + `www.app.shlokahub.com`.

5. Включить HTTP → HTTPS и `www` redirects с сохранением path и query.
6. Выполнить `nginx -t`, reload, `certbot renew --dry-run` и проверить, что
   неизвестный `Host` не обслуживается ни одним сайтом.

До первых deploy пустые ShlokaHub roots могут отвечать `404`; это не блокирует
проверку DNS и TLS.

### 7. Выпустить ShlokaHub application

В текущем monorepo:

1. Создать Repository Variables:

   - `DEPLOY_HOST=<новый VDS>`;
   - `DEPLOY_USER=deploy`;
   - `VITE_API_BASE_URL=https://api.shlokahub.com`.

2. Создать Secrets `SSH_PRIVATE_KEY` и `SSH_KNOWN_HOSTS`, используя общие
   согласованные key material и проверенную host-key строку.
3. Добавить application workflow по решению
   [«Выбрать точные release pipelines для landing и application»](05-release-pipelines.md):
   только `push` в `main`, согласованные path filters, `contents: read`,
   concurrency без отмены текущего deploy, frozen install, lint, typecheck,
   unit tests и production build.
4. Явно передать `VITE_API_BASE_URL` в build и проверить его точное значение без
   завершающего slash.
5. Через проверенный SSH выполнить `rsync --delete` содержимого
   `apps/web/dist/` в `/var/www/shlokahub-app/html/`.
6. Автоматически проверить application `/`, вложенный SPA route `/login` и
   `https://api.shlokahub.com/health/ready`.
7. Вручную проверить CORS preflight, вход существующего пользователя, защищённую
   страницу и прямое открытие вложенного SPA route.
8. Проверить host resources и отсутствие OOM после deploy.

При неудаче исправление выпускается через `git revert` и новый push в `main`.

### 8. Только после application выпустить ShlokaHub landing

В отдельном ShlokaHub landing repository:

1. Создать минимальную статическую заглушку с простым текстом и артефактом `dist/`.
   Конкретный frontend stack для первого выпуска не фиксируется; допустим committed
   `dist/index.html`.
2. Задать те же `DEPLOY_HOST`, `DEPLOY_USER`, `SSH_PRIVATE_KEY` и
   `SSH_KNOWN_HOSTS`.
3. Добавить landing workflow: только `push` в `main`, `contents: read`,
   concurrency без отмены текущего deploy, stack-specific install/build adapter
   при его наличии, обязательная проверка `dist/index.html`.
4. Через проверенный SSH выполнить `rsync --delete` содержимого `dist/` в
   `/var/www/shlokahub-landing/html/`.
5. Автоматически проверить `https://shlokahub.com/` и
   `https://api.shlokahub.com/health/ready`.
6. Вручную проверить канонический landing URL и redirects с
   `www.shlokahub.com` и `www.app.shlokahub.com`.
7. Повторно проверить ресурсы VDS.

Landing workflow не запускается и landing не считается выпущенным, пока application
не прошёл автоматические и ручные проверки.

### 9. Завершить rollout

1. Зафиксировать вне repository фактические targets и identifiers, необходимые для
   эксплуатации, не раскрывая Secrets.
2. Снять показатели диска, `MemAvailable`, swap, OOM, load, traffic и размеров
   журналов после каждого из четырёх первых deploy.
3. Проверять их ежедневно первую неделю, затем еженедельно по production baseline.
4. Повышать один VDS до 2 ГБ / 50 ГБ только при достижении согласованных порогов.

### Передача в `to-spec → to-tickets`

В отдельной сессии из карты создаются три specs в указанном порядке:

1. `production-platform-bootstrap` — шаги 1–6: Netlify cleanup, ранний Railway CORS,
   bootstrap VDS, восстановление обоих Sadhana sites, Railway API domain и
   ShlokaHub DNS/Nginx/TLS.
2. `shlokahub-application-production-release` — шаг 7; блокируется завершением
   `production-platform-bootstrap`.
3. `shlokahub-landing-production-release` — шаги 8–9; блокируется успешным
   `shlokahub-application-production-release`.

Каждый spec затем отдельно декомпозируется через `to-tickets`. Эта wayfinder-сессия
не создаёт specs, implementation tickets и не начинает rollout.
