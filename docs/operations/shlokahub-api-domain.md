# Публикация ShlokaHub API на `api.shlokahub.com`

Этот runbook вручную добавляет `api.shlokahub.com` к уже работающему production
backend service в Railway. Новый service не создаётся. Railway-generated hostname
сохраняется как независимый диагностический маршрут, а TLS custom domain остаётся
под управлением Railway.

Фактические Railway CNAME/TXT values и certificate identifiers нельзя переносить
в repository, `.scratch`, issue, commit message или итоговый отчёт. Копируй их
только напрямую между Railway и Cloudflare Dashboard.

## Границы изменения

Меняются только:

- список custom domains существующего production backend service в Railway;
- ровно один `CNAME` и один `TXT`, которые Railway выдаст для
  `api.shlokahub.com`, в Cloudflare-зоне `shlokahub.com`.

Не меняются:

- Railway project, environment, service, source repository, branch и deployment
  settings;
- Railway-generated hostname и его target port;
- variables, secrets, replicas, region, healthcheck и активный deployment;
- остальные DNS records, nameservers и общие настройки Cloudflare;
- Cloudflare SSL/TLS mode, Universal SSL, redirects, Workers и proxy rules.

## 1. Проверить исходное состояние

### Railway

1. Открой существующий Railway Project.
2. Выбери environment `production`.
3. Открой существующий backend service ShlokaHub. Не нажимай создание нового
   service.
4. На странице активного deployment убедись, что статус — `Active`.
5. В `Settings → Public Networking` убедись, что Railway-generated hostname
   существует.
6. Открой его `/health/ready` и проверь безопасный ответ:

```bash
export RAILWAY_GENERATED_ORIGIN='https://<существующий Railway-generated hostname>'

test "$(
  curl --fail --silent --show-error \
    --connect-timeout 10 \
    --max-time 30 \
    "$RAILWAY_GENERATED_ORIGIN/health/ready"
)" = '{"status":"ok"}'
```

Команда должна завершиться без вывода с кодом `0`. Не продолжай, если generated
endpoint не возвращает `200` и точный JSON `{"status":"ok"}`: custom domain не
исправит проблему deployment или database readiness.

Не записывай значение `RAILWAY_GENERATED_ORIGIN` в repository или отчёт.

### Cloudflare

1. Открой `shlokahub.com → DNS → Records`.
2. Убедись, что зона активна и Cloudflare является authoritative DNS provider.
3. Найди records с именем `api.shlokahub.com`.
4. Если уже существует `A`, `AAAA` или `CNAME` для этого имени, остановись. Не
   удаляй и не перезаписывай неизвестную запись: сначала выясни её происхождение.
5. Сохрани только в локальной защищённой заметке список существующих records
   `api.shlokahub.com`, если они есть. Не добавляй эту заметку в repository.

## 2. Добавить custom domain к существующему service

В Railway:

1. Оставаясь в environment `production` и существующем backend service, открой
   `Settings → Public Networking`.
2. Нажми `+ Custom Domain`.
3. Введи точное имя:

   ```text
   api.shlokahub.com
   ```

4. Если Railway просит target port, выбери тот же application port, который
   обслуживает существующий Railway-generated HTTP domain. Не создавай новый
   port и не добавляй переменную `PORT`.
5. Подтверди добавление.

Railway покажет обязательные DNS records для этого custom domain:

- один `CNAME`;
- один `TXT` для подтверждения ownership.

Оставь эту страницу открытой. Не копируй значения в текстовый файл, shell script,
issue или отчёт. Не удаляй Railway-generated hostname ни до, ни после настройки.

Если Railway предлагает набор, отличный от одного `CNAME` и одного `TXT`, не
угадывай значения и не создавай лишние records. Остановись и сверь текущую
Railway-документацию или обратись в Railway Support.

## 3. Создать ровно выданные DNS records

Открой Cloudflare `shlokahub.com → DNS → Records`. Значения переноси по одному
непосредственно из открытой карточки Railway.

### CNAME

1. Нажми `Add record`.
2. Выбери type `CNAME`.
3. В `Name` вставь имя, выданное Railway. Cloudflare может визуально сократить
   полное имя внутри зоны до относительного.
4. В `Target` вставь точное CNAME value Railway без `https://`, path и
   завершающих изменений.
5. Установи `Proxy status: DNS only` — серое облако.
6. Оставь `TTL: Auto`.
7. Сохрани запись.

### TXT

1. Ещё раз нажми `Add record`.
2. Выбери type `TXT`.
3. В `Name` вставь точное TXT name Railway. Не заменяй его на `api`, если
   Railway выдал другое имя.
4. В `Content` вставь точное TXT value Railway. Не добавляй и не удаляй кавычки
   вручную.
5. Оставь `TTL: Auto`. TXT не проксируется Cloudflare.
6. Сохрани запись.

После сохранения отфильтруй список Cloudflare по именам из Railway и проверь:

- создан ровно один выданный `CNAME`;
- создан ровно один выданный `TXT`;
- CNAME имеет серое облако `DNS only`;
- names и values визуально совпадают с Railway;
- не появились дополнительные `A`, `AAAA`, CNAME или verification records.

Не включай Cloudflare proxy после проверки. В рамках этого rollout трафик должен
идти напрямую к Railway, чтобы ownership и Railway-managed TLS проверялись без
дополнительного reverse proxy.

## 4. Дождаться публичного DNS

Не нажимай повторное создание custom domain и не добавляй дублирующие records,
пока DNS распространяется.

Проверь CNAME через два публичных resolver:

```bash
dig +short CNAME api.shlokahub.com @1.1.1.1
dig +short CNAME api.shlokahub.com @8.8.8.8
```

Обе команды должны показать Railway target, который остаётся виден в Dashboard.
Сравни его визуально, не вставляя target в отчёт.

Проверь TXT по точному TXT name из Railway:

```bash
dig +short TXT '<TXT name из Railway>' @1.1.1.1
dig +short TXT '<TXT name из Railway>' @8.8.8.8
```

Обе команды должны показать выданное Railway value. Кавычки в выводе `dig` —
обычное представление TXT; сравни содержимое, а не оформление.

Если CNAME не виден:

1. проверь серое облако `DNS only`;
2. проверь отсутствие конфликтующего `A`, `AAAA` или второго `CNAME` на том же
   имени;
3. проверь, что для поддомена нет отдельной `NS` delegation;
4. проверь, что Cloudflare CNAME flattening не включён для verification record
   или для всех CNAME;
5. дождись TTL и повтори запросы.

Если TXT не виден, проверь прежде всего его точное name: verification TXT может
находиться не на `api.shlokahub.com`.

Cloudflare предупреждает, что DNS propagation зависит от TTL; Railway допускает
до 72 часов для глобального распространения. Не меняй working records во время
ожидания.

## 5. Дождаться ownership и Railway-managed TLS

Вернись в Railway к карточке `api.shlokahub.com`:

1. дождись успешной DNS/ownership verification — Railway показывает зелёную
   отметку у domain;
2. дождись завершения выпуска сертификата;
3. не создавай внешний сертификат и не меняй Cloudflare SSL/TLS mode;
4. не удаляй TXT после verification: он является частью выданной Railway DNS
   конфигурации;
5. не удаляй Railway-generated hostname.

Railway указывает, что после корректного DNS выпуск сертификата обычно занимает
до часа. Если статус ещё pending, но оба публичных resolver уже видят точные
records, подожди и обнови карточку позднее.

## 6. Проверить публичный HTTPS readiness

Сначала проверь custom domain без follow redirects. Временный файл автоматически
удаляется:

```bash
READINESS_BODY="$(mktemp)"
trap 'rm -f "$READINESS_BODY"' EXIT

test "$(
  curl --fail --silent --show-error \
    --connect-timeout 10 \
    --max-time 30 \
    --output "$READINESS_BODY" \
    --write-out '%{http_code}' \
    https://api.shlokahub.com/health/ready
)" = '200'

test "$(tr -d '\n' < "$READINESS_BODY")" = '{"status":"ok"}'

rm -f "$READINESS_BODY"
trap - EXIT
```

Все команды должны завершиться без вывода с кодом `0`. `curl` одновременно
проверяет публичный DNS, имя в TLS-сертификате, доверенную цепочку сертификатов,
HTTP routing, API readiness и безопасное тело ответа.

Не используй `--insecure`: он скроет ошибку сертификата. Не добавляй `--location`:
endpoint должен сразу отвечать `200`, а не перенаправлять на другой origin.

Затем повторно проверь Railway-generated endpoint из текущей shell-сессии:

```bash
test "$(
  curl --fail --silent --show-error \
    --connect-timeout 10 \
    --max-time 30 \
    "$RAILWAY_GENERATED_ORIGIN/health/ready"
)" = '{"status":"ok"}'
```

Наконец, в `Settings → Public Networking` визуально проверь, что одновременно
сохранены:

- Railway-generated hostname;
- custom domain `api.shlokahub.com`.

## 7. Зафиксировать безопасный результат

В operational note или итоговом отчёте допустим только результат, не фактические
targets и identifiers:

```text
Дата/время UTC:
Оператор:

[ ] Использован существующий production backend service
[ ] Новый Railway service не создавался
[ ] Созданы ровно выданные Railway CNAME и TXT
[ ] CNAME оставлен в Cloudflare DNS only
[ ] Railway ownership подтверждён
[ ] Railway-managed TLS подтверждён curl без --insecure
[ ] https://api.shlokahub.com/health/ready = 200
[ ] readiness body = {"status":"ok"}
[ ] Railway-generated hostname сохранён и его readiness = 200

Результат: PASS / FAIL
Безопасные замечания:
```

Не добавляй в note:

- CNAME target;
- TXT name или value;
- Railway-generated hostname;
- Railway project, service, deployment или certificate identifiers;
- screenshot, на котором видны эти значения;
- variables, secrets, tokens или response headers с внутренними identifiers.

## Диагностика

### Custom domain отвечает `404`

Сначала проверь TXT. Railway не маршрутизирует custom domain до подтверждения
ownership даже при уже работающем CNAME. Сверь оба DNS record с карточкой Railway
и дождись зелёной отметки.

### В сертификате виден `*.up.railway.app`

Сертификат `api.shlokahub.com` ещё не выпущен. Проверь Railway domain status,
CNAME, TXT, конфликтующие records, CAA policy и DNSSEC. Не обходи ошибку через
`curl --insecure`.

### `dig CNAME` показывает Cloudflare или только IP

Вероятнее всего, CNAME проксируется или flattening скрывает исходный target.
Верни CNAME в `DNS only` и отключи flattening для verification flow. Не меняй
Railway target.

### Custom domain возвращает `503`

Выполни ту же проверку на Railway-generated hostname:

- если оба origin возвращают безопасный `503`, проблема в application/database
  readiness, а не в DNS или TLS;
- если generated origin возвращает `200`, а custom domain — нет, проверь Railway
  domain status и routing.

Не ослабляй `/health/ready`, не отключай healthcheck и не запускай новый service
для обхода ошибки.

### Сертификат долго остаётся pending

Проверь:

1. оба records видны через публичные resolver;
2. CNAME — `DNS only`;
3. нет конфликтующих `A`, `AAAA`, CNAME или поддоменной `NS`;
4. CAA разрешает выпуск сертификата Let's Encrypt, которым управляет Railway;
5. DNSSEC не сломан.

После корректного DNS подожди до часа. Если Railway всё ещё не выпускает
сертификат, используй Network Diagnostics и Railway Support, не публикуя targets
и identifiers в repository.

## Отказ от rollout

Временная ошибка custom domain не требует rollback активного deployment:
Railway-generated hostname остаётся рабочим.

Если rollout решено полностью отменить:

1. ещё раз определи точные два records по открытой карточке Railway;
2. в Cloudflare удали только созданные этим runbook CNAME и TXT;
3. убедись, что остальные records зоны не изменились;
4. в Railway удали только custom domain `api.shlokahub.com`;
5. не удаляй Railway-generated hostname;
6. повтори readiness через generated hostname.

Не выполняй эти удаления для обычной DNS propagation или pending certificate:
сначала исправь первопричину.

## Источники

- [Railway: Working with Domains](https://docs.railway.com/networking/domains/working-with-domains)
- [Railway: Troubleshooting SSL](https://docs.railway.com/networking/troubleshooting/ssl)
- [Cloudflare: Manage DNS records](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/)
- [Cloudflare: Proxy status](https://developers.cloudflare.com/dns/proxy-status/)
- [Cloudflare: CNAME domain verification](https://developers.cloudflare.com/dns/manage-dns-records/troubleshooting/cname-domain-verification/)
