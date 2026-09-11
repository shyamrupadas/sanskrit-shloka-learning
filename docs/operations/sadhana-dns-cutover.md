# DNS cutover Sadhana на новый VDS

Сначала вручную меняются только три существующие A-записи в Cloudflare. После
публичного обновления DNS на VDS выпускаются две отдельные группы сертификатов,
включаются HTTPS и redirects. API и почтовые настройки не меняются.

## Что изменить

Открой в Cloudflare зону `sadhana-tracker.com`:
`DNS → Records`.

По очереди нажми `Edit` у трёх записей:

| Name | Type | Новое значение |
| --- | --- | --- |
| `app.sadhana-tracker.com` | `A` | IPv4 нового VDS |
| `sadhana-tracker.com` | `A` | IPv4 нового VDS |
| `www.sadhana-tracker.com` | `A` | IPv4 нового VDS |

В каждой записи:

1. замени только поле `Content` на IPv4 нового VDS;
2. оставь `Proxy status: DNS only` — серое облако;
3. оставь `TTL: Auto`;
4. нажми `Save`.

Не создавай новые records и не удаляй старые.

## Что не менять

Не редактируй остальные девять записей:

- `api.sadhana-tracker.com`, тип `CNAME` — API;
- пять записей `MX` — почта;
- две записи `NS`;
- запись `TXT` — почтовая policy.

Также не меняй nameservers домена у регистратора и общие настройки Cloudflare.

После сохранения в списке должны остаться те же 12 records: три `A`, один
`CNAME`, пять `MX`, две `NS` и одна `TXT`.

## Как проверить DNS

Подожди несколько минут и выполни на ноутбуке, подставив IPv4 нового VDS:

```bash
export VDS_HOST='<IPv4 нового VDS>'

test "$(dig +short A sadhana-tracker.com @1.1.1.1)" = "$VDS_HOST"
test "$(dig +short A www.sadhana-tracker.com @1.1.1.1)" = "$VDS_HOST"
test "$(dig +short A app.sadhana-tracker.com @1.1.1.1)" = "$VDS_HOST"
```

Если все три команды завершились без вывода и с кодом `0`, публичный resolver
Cloudflare уже видит новый VDS.

Дополнительно убедись в Cloudflare, что у `api`, `MX`, `NS` и `TXT` остались
прежние значения.

Не переходи к TLS, пока все три проверки не завершатся с кодом `0`.

## Что сделать после обновления DNS

Дальнейшие команды меняют Nginx и выпускают сертификаты. Они выполняются только
после публичного DNS resolution.

### 1. Проверить HTTP и открыть административную SSH-сессию

В окне `LOCAL` проверь, что все три имени отвечают по HTTP:

```bash
curl --fail --silent --show-error --output /dev/null \
  http://sadhana-tracker.com/

curl --fail --silent --show-error --output /dev/null \
  http://www.sadhana-tracker.com/

curl --fail --silent --show-error --output /dev/null \
  http://app.sadhana-tracker.com/login
```

Если любая команда завершилась ошибкой, не запускай Certbot: сначала проверь
публичный DNS, открытый TCP-порт `80` и состояние Nginx.

Открой SSH-сессию `admin` тем же способом, который использовался при подготовке
VDS. В окне `ADMIN`:

```bash
sudo -v
sudo nginx -t
sudo systemctl is-active nginx.service
sudo certbot --version
```

Ожидаются успешная проверка Nginx, состояние `active` и установленный Certbot.

### 2. Сохранить исходную HTTP-конфигурацию

Создай одноразовую резервную копию трёх файлов:

```bash
sudo test ! -e /root/sadhana-pre-tls
sudo install -d -m 0700 /root/sadhana-pre-tls
sudo cp -a \
  /etc/nginx/sites-available/00-default-deny \
  /etc/nginx/sites-available/sadhana-landing \
  /etc/nginx/sites-available/sadhana-app \
  /root/sadhana-pre-tls/
```

Если первая команда сообщает, что каталог уже существует, не перезаписывай его:
сначала выясни, от какого запуска осталась копия.

### 3. Выпустить две группы сертификатов

Укажи реальный адрес для уведомлений Let's Encrypt:

```bash
export CERTBOT_EMAIL='<email администратора>'
```

Сначала выпусти один сертификат для landing и его `www`-имени:

```bash
sudo certbot --nginx --redirect \
  --email "$CERTBOT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d sadhana-tracker.com \
  -d www.sadhana-tracker.com
```

Затем отдельно выпусти сертификат для application:

```bash
sudo certbot --nginx --redirect \
  --email "$CERTBOT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d app.sadhana-tracker.com
```

Не объединяй три имени в одну команду: landing и application должны иметь
независимый lifecycle сертификатов. Если Certbot сообщает об уже существующем
сертификате или предлагает изменить его состав, остановись и сначала проверь
runtime-состояние через `sudo certbot certificates`. Не копируй вывод этой
команды в repository или публичный отчёт.

Убедись, что Certbot создал необходимые файлы:

```bash
sudo test -r \
  /etc/letsencrypt/live/sadhana-tracker.com/fullchain.pem
sudo test -r \
  /etc/letsencrypt/live/sadhana-tracker.com/privkey.pem
sudo test -r \
  /etc/letsencrypt/live/app.sadhana-tracker.com/fullchain.pem
sudo test -r \
  /etc/letsencrypt/live/app.sadhana-tracker.com/privkey.pem
sudo test -r /etc/letsencrypt/options-ssl-nginx.conf
sudo test -r /etc/letsencrypt/ssl-dhparams.pem
```

Все команды должны завершиться без вывода и с кодом `0`.

### 4. Зафиксировать HTTPS и redirects в Nginx

Certbot уже включил HTTPS. Теперь замени только три Sadhana-конфигурации на
однозначный итоговый вариант. Landing обслуживается на каноническом
`https://sadhana-tracker.com`, а `www` всегда возвращает постоянный redirect с
исходными path и query.

Безопасный default host для HTTP и HTTPS:

```bash
sudo tee /etc/nginx/sites-available/00-default-deny >/dev/null <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    access_log off;
    return 404;
}

server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;

    server_name _;

    ssl_reject_handshake on;
    access_log off;
    return 404;
}
EOF
```

Landing:

```bash
sudo tee /etc/nginx/sites-available/sadhana-landing >/dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;

    server_name sadhana-tracker.com www.sadhana-tracker.com;

    return 301 https://sadhana-tracker.com$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name www.sadhana-tracker.com;

    ssl_certificate /etc/letsencrypt/live/sadhana-tracker.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sadhana-tracker.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://sadhana-tracker.com$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name sadhana-tracker.com;

    root /var/www/sadhana-landing/html;
    index index.html;

    ssl_certificate /etc/letsencrypt/live/sadhana-tracker.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sadhana-tracker.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    access_log /var/log/nginx/sadhana-landing.access.log;
    error_log /var/log/nginx/sadhana-landing.error.log;

    location / {
        try_files $uri $uri/ =404;
    }
}
EOF
```

Application:

```bash
sudo tee /etc/nginx/sites-available/sadhana-app >/dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;

    server_name app.sadhana-tracker.com;

    return 301 https://app.sadhana-tracker.com$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name app.sadhana-tracker.com;

    root /var/www/sadhana-app/html;
    index index.html;

    ssl_certificate /etc/letsencrypt/live/app.sadhana-tracker.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.sadhana-tracker.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    access_log /var/log/nginx/sadhana-app.access.log;
    error_log /var/log/nginx/sadhana-app.error.log;

    location = /index.html {
        try_files /index.html =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
```

Одинарные кавычки вокруг `EOF` обязательны: они не дают shell подставить
`$request_uri` и `$uri` при записи файлов.

Проверь конфигурацию до reload:

```bash
if sudo nginx -t; then
  sudo systemctl reload nginx.service
  sudo systemctl is-active nginx.service
else
  printf '%s\n' 'STOP: nginx -t завершился ошибкой; reload запрещён'
  false
fi
```

### 5. Проверить продление сертификатов

В окне `ADMIN`:

```bash
sudo certbot renew --dry-run
sudo nginx -t
sudo systemctl is-active nginx.service
```

Dry run должен успешно проверить обе группы сертификатов. Если он не прошёл,
тикет 07 не завершён, даже если сайты уже открываются по HTTPS.

### 6. Проверить внешний production-контракт

Вернись в окно `LOCAL`. Сначала проверь точные redirects с сохранением path и
query:

```bash
test "$(
  curl --silent --show-error \
    --output /dev/null \
    --write-out '%{http_code} %{redirect_url}' \
    'http://sadhana-tracker.com/privacy/?source=cutover'
)" = \
  '301 https://sadhana-tracker.com/privacy/?source=cutover'

test "$(
  curl --silent --show-error \
    --output /dev/null \
    --write-out '%{http_code} %{redirect_url}' \
    'https://www.sadhana-tracker.com/privacy/?source=cutover'
)" = \
  '301 https://sadhana-tracker.com/privacy/?source=cutover'

test "$(
  curl --silent --show-error \
    --output /dev/null \
    --write-out '%{http_code} %{redirect_url}' \
    'http://app.sadhana-tracker.com/login?source=cutover'
)" = \
  '301 https://app.sadhana-tracker.com/login?source=cutover'
```

Все три команды должны завершиться без вывода и с кодом `0`.

Проверь канонические HTTPS-адреса и прямое открытие вложенного SPA route:

```bash
curl --fail --silent --show-error --output /dev/null \
  https://sadhana-tracker.com/

curl --fail --silent --show-error --output /dev/null \
  https://app.sadhana-tracker.com/

curl --fail --silent --show-error --output /dev/null \
  https://app.sadhana-tracker.com/login
```

Наконец, проверь безопасный неизвестный `Host`, подставив IPv4 нового VDS:

```bash
export VDS_HOST='<IPv4 нового VDS>'

test "$(
  curl --silent --show-error \
    --output /dev/null \
    --write-out '%{http_code}' \
    --noproxy '*' \
    -H 'Host: unknown.invalid' \
    "http://$VDS_HOST/"
)" = 404

test "$(
  curl --silent --show-error \
    --output /dev/null \
    --write-out '%{http_code}' \
    --noproxy '*' \
    --resolve "sadhana-tracker.com:443:$VDS_HOST" \
    -H 'Host: unknown.invalid' \
    https://sadhana-tracker.com/
)" = 404
```

Если все проверки прошли, DNS, обе группы сертификатов, redirects, SPA fallback
и безопасный default host соответствуют критериям тикета 07.

## Откат

### Если проблема возникла сразу после DNS

До переключения сохрани старый IPv4 в локальной защищённой заметке.

Если новый VDS недоступен по HTTP и причину нельзя быстро устранить, верни прежний
IPv4 ровно в те же три A-записи `app`, `@` и `www`. Оставь `DNS only` и
`TTL Auto`. Остальные records не меняй.

### Если проблема возникла при настройке TLS или Nginx

Восстанови только три сохранённых HTTP-конфигурации:

```bash
sudo cp -a \
  /root/sadhana-pre-tls/00-default-deny \
  /root/sadhana-pre-tls/sadhana-landing \
  /root/sadhana-pre-tls/sadhana-app \
  /etc/nginx/sites-available/

if sudo nginx -t; then
  sudo systemctl reload nginx.service
  sudo systemctl is-active nginx.service
else
  printf '%s\n' 'STOP: восстановленная конфигурация не прошла nginx -t'
  false
fi
```

Это возвращает проверенное HTTP-состояние. Не удаляй выпущенные сертификаты
вручную и не меняй DNS автоматически: сначала определи причину сбоя.

## Источники

- [Cloudflare: Manage DNS records](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/)
- [Cloudflare: Proxy status](https://developers.cloudflare.com/dns/proxy-status/)
- [Certbot: Nginx on Linux (snap)](https://certbot.eff.org/instructions?os=snap&tab=standard&ws=nginx)
- [Certbot: command-line options](https://eff-certbot.readthedocs.io/en/stable/man/certbot.html)
- [Nginx: return directive](https://nginx.org/en/docs/http/ngx_http_rewrite_module.html#return)
- [Nginx: reject an SSL handshake](https://nginx.org/en/docs/http/ngx_http_ssl_module.html#ssl_reject_handshake)
