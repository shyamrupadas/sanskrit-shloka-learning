# DNS, TLS и Railway custom domain для ShlokaHub

Дата проверки источников: 2026-07-25.

## Краткий ответ

- Четыре имени статических сайтов направляются прямо на публичный IPv4 VDS
  отдельными `A`-записями: `@`, `www`, `app`, `www.app`. Все они остаются
  `DNS only`.
- `api.shlokahub.com` сначала добавляется как custom domain существующего backend
  service в Railway. Затем в Cloudflare без изменений копируются **две** выданные
  Railway записи: `CNAME` для трафика и `TXT` для подтверждения владения. Одного
  `CNAME` недостаточно.
- TLS для четырёх статических имён выпускается Certbot на VDS двумя независимыми
  сертификатами: landing + его `www`, application + его `www`. TLS для API выпускает
  и обновляет Railway; Certbot к `api.shlokahub.com` отношения не имеет.
- Редиректы выполняет Nginx: оба протокола для `www` ведут `301` на соответствующее
  каноническое HTTPS-имя с сохранением path/query.
- Backend разрешает один точный CORS origin. В Railway заранее задаётся
  `FRONTEND_ORIGIN=https://app.shlokahub.com`; `localhost` в production не
  разрешается.

## Точный набор DNS-записей

В таблице `<VDS_IPV4>` — фактический публичный IPv4 уже созданного VDS, а значения
`<RAILWAY_...>` копируются из Railway Dashboard после добавления custom domain. Их
нельзя получать из старого проекта или конструировать вручную.

| Type | Name в Cloudflare | Content / Target | Proxy status | Назначение |
| --- | --- | --- | --- | --- |
| `A` | `@` | `<VDS_IPV4>` | `DNS only` | `shlokahub.com` |
| `A` | `www` | `<VDS_IPV4>` | `DNS only` | redirect `www.shlokahub.com` |
| `A` | `app` | `<VDS_IPV4>` | `DNS only` | `app.shlokahub.com` |
| `A` | `www.app` | `<VDS_IPV4>` | `DNS only` | redirect `www.app.shlokahub.com` |
| `CNAME` | `api` | `<RAILWAY_CNAME_TARGET>` | `DNS only` | backend на Railway |
| `TXT` | `<RAILWAY_TXT_NAME>` | `<RAILWAY_TXT_VALUE>` | неприменимо | ownership verification Railway |

Для всех записей подходит `TTL: Auto`. Cloudflare определяет `A` как привязку имени
к IPv4 и позволяет выбирать proxy status для `A`, `AAAA` и `CNAME`;
[`DNS only` возвращает реальный origin IP/target и не пропускает HTTP через proxy
Cloudflare](https://developers.cloudflare.com/dns/proxy-status/). Создание полей
`Type`, `Name`, `Content`, `Proxy status`, `TTL` описано в
[официальной инструкции Cloudflare](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/).

Дополнительные правила:

1. `AAAA` не создавать, пока у VDS нет подтверждённого публичного IPv6, Nginx не
   слушает `[::]:80/443`, а firewall не пропускает эти порты по IPv6. Неверный
   `AAAA` отправит часть клиентов и ACME-проверок не на рабочий endpoint.
2. До добавления записей удалить или исправить конфликтующие `A`/`AAAA`/`CNAME`
   именно на этих пяти именах. Railway отдельно рекомендует не оставлять `A` и
   `CNAME` на одном API hostname
   ([Railway SSL troubleshooting](https://docs.railway.com/networking/troubleshooting/ssl)).
3. Не включать для `api` Cloudflare proxy и не включать flattening всех `CNAME`.
   Cloudflare предупреждает, что проверочные `CNAME` должны быть `DNS only` и без
   flattening
   ([Cloudflare: CNAME domain verification](https://developers.cloudflare.com/dns/manage-dns-records/troubleshooting/cname-domain-verification/)).
   Для выбранной архитектуры полезно также видеть фактический Railway target через
   `dig CNAME`.
4. До выпуска сертификатов проверить `CAA` для `shlokahub.com`. Если записей `CAA`
   нет, добавлять их ради этой миграции не требуется. Если они уже есть, набор должен
   разрешать `letsencrypt.org`: Let's Encrypt обязан соблюдать `CAA`, а его
   идентификатор именно `letsencrypt.org`
   ([ISRG Certification Practice Statement, §4.2.1](https://letsencrypt.org/documents/isrg-cps-v4.0/)).

### Почему для Railway нужны две записи

Актуальная инструкция Railway после `Settings → Networking → Public Networking →
+ Custom Domain → api.shlokahub.com` выдаёт:

- `CNAME` наподобие `g05ns7.up.railway.app`, но с уникальным фактическим значением;
- `TXT` с уникальными name/value для подтверждения владения.

Обе записи обязательны. При одном рабочем `CNAME`, но без `TXT`, Railway не включает
маршрутизацию и запросы получают `404`. После подтверждения рядом с доменом появляется
зелёная отметка
([Railway: Working with Domains](https://docs.railway.com/networking/domains/working-with-domains)).

Cloudflare выбран в режиме `DNS only`, поэтому TLS-соединение с API заканчивается на
Railway. Railway автоматически выпускает Let's Encrypt certificate, устанавливает
его и обновляет; документация указывает срок 90 дней и renewal при остатке 30 дней.
Обычно выпуск занимает до часа, но диагностику допускается ждать до 72 часов
([Railway domains](https://docs.railway.com/networking/domains/working-with-domains),
[Railway SSL troubleshooting](https://docs.railway.com/networking/troubleshooting/ssl)).
Не следует многократно удалять и добавлять custom domain: Railway предупреждает о
лимитах Let's Encrypt на повторные сертификаты.

## TLS на VDS

### Граница владения сертификатами

| Имена | Кто выпускает и хранит private key |
| --- | --- |
| `shlokahub.com`, `www.shlokahub.com` | Certbot на VDS |
| `app.shlokahub.com`, `www.app.shlokahub.com` | Certbot на VDS |
| `api.shlokahub.com` | Railway |

Certbot должен запускаться на самом web server и с правами, позволяющими менять
Nginx. Для `--nginx` нужен уже доступный извне HTTP virtual host на порту 80
([официальные Certbot instructions](https://certbot.eff.org/instructions?os=snap&ws=nginx)).
HTTP-01 кладёт token в
`http://<domain>/.well-known/acme-challenge/<token>` и работает только через port 80;
Let's Encrypt допускает redirects только на HTTP/HTTPS и порты 80/443
([Let's Encrypt: Challenge Types](https://letsencrypt.org/docs/challenge-types/)).
Поэтому порт 80 после настройки не закрывается: он нужен renewal и обычному redirect
на HTTPS
([Let's Encrypt: Keep Port 80 Open](https://letsencrypt.org/docs/allow-port-80/)).

После того как все четыре имени резолвятся на VDS и их HTTP virtual hosts проверены,
выпустить два сертификата:

```bash
sudo certbot --nginx \
  --cert-name shlokahub.com \
  -d shlokahub.com \
  -d www.shlokahub.com

sudo certbot --nginx \
  --cert-name app.shlokahub.com \
  -d app.shlokahub.com \
  -d www.app.shlokahub.com
```

Два сертификата вместо одного на четыре имени уменьшают связанность независимых
сайтов: проблема renewal одного pair не блокирует другой. `www` обязательно входит в
сертификат, хотя выдаёт только redirect: TLS handshake происходит до HTTP request,
поэтому клиент сначала должен получить сертификат, действительный для запрошенного
`www` имени
([Nginx: Configuring HTTPS Servers](https://nginx.org/en/docs/http/configuring_https_servers.html)).

После окончательной Nginx-конфигурации обязательно выполнить:

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo certbot renew --dry-run
```

Certbot устанавливает cron job или systemd timer для renewal, а `renew --dry-run`
проверяет будущий renewal
([Certbot instructions](https://certbot.eff.org/instructions?os=snap&ws=nginx)).

## Канонические redirect

Cloudflare не исполняет redirect rules при `DNS only`: HTTP идёт прямо в Nginx.
Именно Nginx должен реализовать четыре перехода:

| Вход | Результат |
| --- | --- |
| `http://shlokahub.com/<uri>` | `301 https://shlokahub.com/<uri>` |
| `http[s]://www.shlokahub.com/<uri>` | `301 https://shlokahub.com/<uri>` |
| `http://app.shlokahub.com/<uri>` | `301 https://app.shlokahub.com/<uri>` |
| `http[s]://www.app.shlokahub.com/<uri>` | `301 https://app.shlokahub.com/<uri>` |

Для каждого pair достаточно отдельных HTTP/HTTPS server blocks и выражения вида:

```nginx
return 301 https://shlokahub.com$request_uri;
```

или для приложения:

```nginx
return 301 https://app.shlokahub.com$request_uri;
```

`return` разрешён в `server` context и поддерживает `301`; URL может содержать
variables
([Nginx `return` directive](https://nginx.org/en/docs/http/ngx_http_rewrite_module.html#return)).
`$request_uri` сохраняет path и query. Для HTTPS alias server block использует тот
же pair certificate, в который включено alias-имя. `api.shlokahub.com` не
перенаправляется: это самостоятельный канонический API hostname.

## Безопасный порядок настройки и первого выпуска

### 1. Зафиксировать production CORS origin

1. В production variables Railway backend service установить ровно:

   ```text
   FRONTEND_ORIGIN=https://app.shlokahub.com
   ```

   Без path, wildcard и завершающего `/`.
2. Применить staged change через `Deploy` и дождаться успешного нового deployment.
   Railway применяет изменение variable только после review/deploy staged changes
   ([Railway: Using Variables](https://docs.railway.com/variables)).
3. Повторно проверить API readiness на текущем Railway domain.

### 2. Проверить предпосылки

1. Зафиксировать `<VDS_IPV4>`, не публикуя SSH credentials.
2. Найти конфликтующие DNS-записи и выполнить `dig CAA shlokahub.com`.
3. Подготовить на VDS HTTP server blocks и document roots для четырёх статических
   имён.
4. Проверить `nginx -t`, открыть `80/443` и убедиться, что Nginx доступен извне.

### 3. Подготовить API custom domain

1. В существующем Railway backend service добавить `api.shlokahub.com`.
2. Скопировать выданные Railway `CNAME` **и** `TXT` в Cloudflare как `DNS only`.
3. Проверить фактические записи:

   ```bash
   dig +short CNAME api.shlokahub.com
   dig +short TXT <RAILWAY_TXT_NAME>
   ```

4. Дождаться зелёной отметки Railway и сертификата для API.
5. Проверить `https://api.shlokahub.com/health/ready` с ожидаемым `200`.

### 4. Подготовить статические имена и сертификаты

1. Добавить четыре `A`-записи из таблицы.
2. Дождаться, пока каждый hostname отвечает `<VDS_IPV4>`:

   ```bash
   dig +short A shlokahub.com
   dig +short A www.shlokahub.com
   dig +short A app.shlokahub.com
   dig +short A www.app.shlokahub.com
   ```

3. Выпустить два Certbot certificate pair.
4. Установить окончательные HTTPS blocks и redirects, выполнить `nginx -t`, reload и
   `certbot renew --dry-run`.

### 5. Выпустить application

1. Создать GitHub Repository Variable:
   `VITE_API_BASE_URL=https://api.shlokahub.com`.
2. Настроить согласованный application workflow, собрать production frontend и
   выполнить первый `rsync` `dist/` на VDS.

Это именно build-time значение: Vite статически заменяет `import.meta.env` при
сборке, а `VITE_*` попадает в клиентский bundle
([Vite: Env Variables and Modes](https://vite.dev/guide/env-and-mode)).
Изменение GitHub Variable без новой сборки старый `dist/` не исправляет. Текущий
frontend читает именно `import.meta.env.VITE_API_BASE_URL` в
[`apps/web/src/shared/session/session-provider.tsx`](../../../apps/web/src/shared/session/session-provider.tsx).

3. Проверить CORS preflight:

   ```bash
   curl -i -X OPTIONS 'https://api.shlokahub.com/api/auth/login' \
     -H 'Origin: https://app.shlokahub.com' \
     -H 'Access-Control-Request-Method: POST' \
     -H 'Access-Control-Request-Headers: content-type'
   ```

   Ответ должен содержать
   `Access-Control-Allow-Origin: https://app.shlokahub.com`.
4. Выполнить browser login smoke-test, application `/`, вложенную SPA route и
   `https://api.shlokahub.com/health/ready`.

### 6. Выпустить landing-заглушку

После полной проверки application создать в отдельном repository минимальный
`dist/index.html` с простым текстом, выпустить его согласованным landing workflow и
проверить landing `/` и оба канонических redirect.

Причина раннего переключения CORS находится в текущем коде проекта:

- [`apps/api/src/shared/env.ts`](../../../apps/api/src/shared/env.ts) принимает один
  точный HTTP(S) origin;
- [`apps/api/src/shared/http-guardrails.ts`](../../../apps/api/src/shared/http-guardrails.ts)
  возвращает CORS только при точном равенстве request origin;
- frontend base URL уже зашит в загруженный bundle.

Production разрешает только `https://app.shlokahub.com`; `localhost` остаётся
локальной конфигурацией development backend.

## Проверка результата

После cutover должны выполняться все проверки:

```bash
curl -fsS 'https://shlokahub.com/' >/dev/null
curl -fsS 'https://app.shlokahub.com/' >/dev/null
curl -fsS 'https://app.shlokahub.com/<REAL_SPA_ROUTE>' >/dev/null
curl -fsS 'https://api.shlokahub.com/health/ready' >/dev/null

curl -sS -o /dev/null -D - 'https://www.shlokahub.com/example?x=1'
curl -sS -o /dev/null -D - 'https://www.app.shlokahub.com/example?x=1'
```

Последние два ответа должны иметь соответственно:

```text
HTTP/... 301
Location: https://shlokahub.com/example?x=1
```

и:

```text
HTTP/... 301
Location: https://app.shlokahub.com/example?x=1
```

Проверяется сертификат для каждого из пяти HTTPS hostname, а не только для
канонических статических имён.
