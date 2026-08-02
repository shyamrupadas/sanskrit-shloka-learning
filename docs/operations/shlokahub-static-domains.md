# DNS и TLS статических сайтов ShlokaHub

Этот runbook вручную создаёт три статические DNS-записи ShlokaHub, выпускает
две отдельные группы сертификатов через Certbot и фиксирует итоговые Nginx virtual
hosts. До первых deploy пустые document roots безопасно возвращают `404`.

Все изменения в Cloudflare и на VDS выполняет владелец вручную. Runbook не меняет
`api.shlokahub.com`, Railway, release workflows или содержимое будущих артефактов.
Фактические IPv4, certificate identifiers и certificate paths нельзя переносить
в repository, `.scratch`, commit message или итоговый отчёт.

## Границы изменения

Меняются только:

- три DNS-записи `A` в зоне `shlokahub.com`;
- два существующих Nginx-файла `shlokahub-landing` и `shlokahub-app`;
- две новые группы сертификатов Certbot: landing и application.

Не меняются:

- `api.shlokahub.com` и выданные Railway `CNAME`/`TXT`;
- остальные DNS records, nameservers и общие настройки Cloudflare;
- Cloudflare SSL/TLS mode, Universal SSL, redirects, Workers и proxy rules;
- Sadhana virtual hosts и сертификаты;
- `/etc/nginx/sites-available/00-default-deny`;
- document roots, bootstrap-файлы и права пользователя `deploy`;
- firewall, SSH и Railway.

## 1. Подготовить локальную сессию

В окне `LOCAL` на ноутбуке задай IPv4 нового VDS только для текущей shell-сессии:

```bash
export VDS_HOST='<IPv4 нового VDS>'

test -n "$VDS_HOST"
test "$(printf '%s' "$VDS_HOST" | tr -cd '.')" = '...'
```

Не записывай значение в файл, issue или отчёт. До изменения DNS проверь, что
публичный IPv4 совпадает с тем VDS, на котором уже находятся изолированные roots:

```bash
export SSH_KNOWN_HOSTS_FILE="$HOME/.ssh/shlokahub-vds/known_hosts"

ssh \
  -o StrictHostKeyChecking=yes \
  -o "UserKnownHostsFile=$SSH_KNOWN_HOSTS_FILE" \
  -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password \
  "admin@$VDS_HOST"
```

Внутри `ADMIN` выполни:

```bash
hostnamectl --static
sudo -v
sudo nginx -t
exit
```

Сверь hostname с защищённой операционной заметкой. Не продолжай, если парольный
вход `admin`, SSH host-key проверка, `sudo` или `nginx -t` не прошли.

## 2. Проверить исходное состояние Cloudflare

Открой `Cloudflare → shlokahub.com → DNS → Records`.

Для каждого имени проверь отсутствие конфликтующих `A`, `AAAA`, `CNAME` и
делегирующих `NS`:

- `shlokahub.com` (`@`);
- `www.shlokahub.com` (`www`);
- `app.shlokahub.com` (`app`).

Если для имени уже существует запись, не удаляй и не перезаписывай её вслепую.
Сначала выясни происхождение. Если это ранее созданная правильная `A`-запись с тем
же IPv4, `DNS only` и `TTL Auto`, оставь её и не создавай дубликат.

Отдельно визуально убедись, что `api.shlokahub.com` по-прежнему содержит ровно
выданные Railway records. Не копируй их target или verification value в заметку.

## 3. Создать три A-записи

В Cloudflare создай отсутствующие записи:

| Type | Name | Content | Proxy status | TTL |
| --- | --- | --- | --- | --- |
| `A` | `@` | IPv4 нового VDS | `DNS only` | `Auto` |
| `A` | `www` | IPv4 нового VDS | `DNS only` | `Auto` |
| `A` | `app` | IPv4 нового VDS | `DNS only` | `Auto` |

Серое облако `DNS only` обязательно: TLS этих имён завершает Nginx на VDS, а
сертификаты выпускает Certbot через HTTP-01. Не включай Cloudflare proxy даже
временно для обхода ошибки.

После сохранения ещё раз проверь в списке records:

- у всех трёх имён ровно по одной `A`-записи;
- все три записи показывают один и тот же IPv4 нового VDS;
- у всех трёх серое облако `DNS only`;
- `api.shlokahub.com` и остальные records не изменились.

## 4. Дождаться публичного DNS

В окне `LOCAL` проверь оба независимых публичных resolver. Команды не печатают
IPv4 и завершаются с кодом `0` только при точном совпадении:

```bash
for resolver in 1.1.1.1 8.8.8.8; do
  for domain_name in \
    shlokahub.com \
    www.shlokahub.com \
    app.shlokahub.com
  do
    test "$(dig +short A "$domain_name" "@$resolver")" = "$VDS_HOST"
    test -z "$(dig +short AAAA "$domain_name" "@$resolver")"
  done
done
```

Если проверка не прошла, точечно посмотри результат только в текущем терминале:

```bash
dig A shlokahub.com @1.1.1.1
```

Не переходи к Certbot, пока все шесть проверок `A` и все шесть проверок
отсутствия `AAAA` не завершатся с кодом `0`.

## 5. Проверить HTTP до выпуска сертификатов

Текущие bootstrap-файлы могут ещё существовать и давать `200`. Если их уже
удалили перед первым deploy, канонические virtual hosts должны безопасно дать
`404`. Оба результата допустимы; redirects, `5xx`, `403` и ошибки соединения — нет.

В окне `LOCAL`:

```bash
for public_url in \
  'http://shlokahub.com/' \
  'http://www.shlokahub.com/' \
  'http://app.shlokahub.com/bootstrap/pre-tls-spa-route'
do
  http_status="$(
    curl --silent --show-error \
      --connect-timeout 10 \
      --max-time 30 \
      --output /dev/null \
      --write-out '%{http_code}' \
      "$public_url"
  )"

  test "$http_status" = 200 || test "$http_status" = 404
done

unset http_status public_url
```

Проверь безопасный default host по HTTP:

```bash
test "$(
  curl --silent --show-error \
    --connect-timeout 10 \
    --max-time 30 \
    --noproxy '*' \
    --output /dev/null \
    --write-out '%{http_code}' \
    -H 'Host: unknown.invalid' \
    "http://$VDS_HOST/"
)" = 404
```

Если любое публичное имя не даёт `200` или `404`, не запускай Certbot. Сначала
исправь DNS, доступность TCP `80` или существующий Nginx routing.

## 6. Проверить VDS и сохранить исходную конфигурацию

Открой административную SSH-сессию проверенным способом. Далее все команды этого
раздела и разделов 7–10 выполняются только в окне `ADMIN` на VDS.

```bash
sudo -v
sudo nginx -t
sudo systemctl is-active nginx.service
sudo certbot --version

sudo test -f /etc/nginx/sites-available/00-default-deny
sudo test -L /etc/nginx/sites-enabled/00-default-deny
sudo test -f /etc/nginx/sites-available/shlokahub-landing
sudo test -L /etc/nginx/sites-enabled/shlokahub-landing
sudo test -f /etc/nginx/sites-available/shlokahub-app
sudo test -L /etc/nginx/sites-enabled/shlokahub-app

sudo test -d /var/www/shlokahub-landing/html
sudo test -d /var/www/shlokahub-app/html
sudo -u deploy test -w /var/www/shlokahub-landing/html
sudo -u deploy test -w /var/www/shlokahub-app/html
sudo -u www-data test ! -w /var/www/shlokahub-landing/html
sudo -u www-data test ! -w /var/www/shlokahub-app/html
```

Ожидаются успешный `nginx -t`, состояние `active` и команды без вывода с кодом
`0`. Создай одноразовую root-only копию двух изменяемых конфигураций:

```bash
sudo test ! -e /root/shlokahub-pre-tls
sudo install -d -m 0700 /root/shlokahub-pre-tls
sudo cp -a \
  /etc/nginx/sites-available/shlokahub-landing \
  /etc/nginx/sites-available/shlokahub-app \
  /root/shlokahub-pre-tls/
```

Если каталог уже существует, не перезаписывай его: выясни, от какого запуска
осталась копия, и продолжай только после ручного решения.

## 7. Выпустить две группы сертификатов

Сначала локально просмотри текущее runtime-состояние:

```bash
sudo certbot certificates
```

Вывод предназначен только для текущего терминала. Не копируй certificate names,
serials, paths или expiry details в repository и отчёт. Если Certbot уже знает
любое из трёх ShlokaHub-имён, остановись и выясни происхождение сертификата.

Укажи реальный адрес для уведомлений Let's Encrypt только в текущей shell-сессии:

```bash
export CERTBOT_EMAIL='<email администратора>'
test -n "$CERTBOT_EMAIL"
```

Выпусти landing-группу:

```bash
sudo certbot --nginx --redirect \
  --email "$CERTBOT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d shlokahub.com \
  -d www.shlokahub.com
```

Затем отдельно выпусти application-группу:

```bash
sudo certbot --nginx --redirect \
  --email "$CERTBOT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d app.shlokahub.com
```

Не объединяй три имени в одну команду: landing и application должны иметь
независимые TLS lifecycles. Если Certbot предлагает расширить, заменить или
переиспользовать существующий сертификат, не подтверждай действие автоматически.

## 8. Извлечь runtime paths без публикации identifiers

Certbot записал фактические certificate paths в два Nginx-файла. Извлеки их в
переменные текущей root-controlled сессии, не печатая значения:

```bash
LANDING_CERT_PATH="$(
  sudo awk '$1 == "ssl_certificate" { gsub(/;/, "", $2); print $2; exit }' \
    /etc/nginx/sites-available/shlokahub-landing
)"
LANDING_KEY_PATH="$(
  sudo awk '$1 == "ssl_certificate_key" { gsub(/;/, "", $2); print $2; exit }' \
    /etc/nginx/sites-available/shlokahub-landing
)"
APP_CERT_PATH="$(
  sudo awk '$1 == "ssl_certificate" { gsub(/;/, "", $2); print $2; exit }' \
    /etc/nginx/sites-available/shlokahub-app
)"
APP_KEY_PATH="$(
  sudo awk '$1 == "ssl_certificate_key" { gsub(/;/, "", $2); print $2; exit }' \
    /etc/nginx/sites-available/shlokahub-app
)"

case "$LANDING_CERT_PATH" in
  /etc/letsencrypt/live/*/fullchain.pem) ;;
  *) false ;;
esac
case "$LANDING_KEY_PATH" in
  /etc/letsencrypt/live/*/privkey.pem) ;;
  *) false ;;
esac
case "$APP_CERT_PATH" in
  /etc/letsencrypt/live/*/fullchain.pem) ;;
  *) false ;;
esac
case "$APP_KEY_PATH" in
  /etc/letsencrypt/live/*/privkey.pem) ;;
  *) false ;;
esac

sudo test -r "$LANDING_CERT_PATH"
sudo test -r "$LANDING_KEY_PATH"
sudo test -r "$APP_CERT_PATH"
sudo test -r "$APP_KEY_PATH"

test "$LANDING_CERT_PATH" != "$APP_CERT_PATH"
test "$LANDING_KEY_PATH" != "$APP_KEY_PATH"
```

Не запускай `set -x`, `echo` или `printf` для этих переменных. Они нужны только
для подстановки на VDS и не должны попадать в shell transcript или отчёт.

## 9. Зафиксировать итоговые ShlokaHub virtual hosts

### Landing

HTTP для обоих имён сразу ведёт на канонический HTTPS. HTTPS `www` также ведёт на
каноническое имя. `$request_uri` сохраняет исходные path и query.

```bash
sudo tee /etc/nginx/sites-available/shlokahub-landing >/dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;

    server_name shlokahub.com www.shlokahub.com;

    return 301 https://shlokahub.com$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name www.shlokahub.com;

    ssl_certificate __SHLOKAHUB_LANDING_CERTIFICATE__;
    ssl_certificate_key __SHLOKAHUB_LANDING_KEY__;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://shlokahub.com$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name shlokahub.com;

    root /var/www/shlokahub-landing/html;
    index index.html;

    ssl_certificate __SHLOKAHUB_LANDING_CERTIFICATE__;
    ssl_certificate_key __SHLOKAHUB_LANDING_KEY__;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    access_log /var/log/nginx/shlokahub-landing.access.log;
    error_log /var/log/nginx/shlokahub-landing.error.log;

    location = / {
        try_files /index.html =404;
    }

    location / {
        try_files $uri $uri/ =404;
    }
}
EOF
```

### Application

Application по HTTP ведёт на canonical HTTPS. Для canonical HTTPS сначала
отдаются реальные файлы, затем `index.html`. Если root пуст, exact locations не
допускают internal redirect loop или `403` на `/` и возвращают `404`.

```bash
sudo tee /etc/nginx/sites-available/shlokahub-app >/dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;

    server_name app.shlokahub.com;

    return 301 https://app.shlokahub.com$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;

    server_name app.shlokahub.com;

    root /var/www/shlokahub-app/html;
    index index.html;

    ssl_certificate __SHLOKAHUB_APP_CERTIFICATE__;
    ssl_certificate_key __SHLOKAHUB_APP_KEY__;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    access_log /var/log/nginx/shlokahub-app.access.log;
    error_log /var/log/nginx/shlokahub-app.error.log;

    location = / {
        try_files /index.html =404;
    }

    location = /index.html {
        try_files /index.html =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
```

Одинарные кавычки вокруг обоих `EOF` обязательны: без них shell подставит
`$request_uri` и `$uri` до записи файлов.

Подставь runtime paths только на VDS:

```bash
sudo sed -i \
  -e "s|__SHLOKAHUB_LANDING_CERTIFICATE__|$LANDING_CERT_PATH|g" \
  -e "s|__SHLOKAHUB_LANDING_KEY__|$LANDING_KEY_PATH|g" \
  /etc/nginx/sites-available/shlokahub-landing

sudo sed -i \
  -e "s|__SHLOKAHUB_APP_CERTIFICATE__|$APP_CERT_PATH|g" \
  -e "s|__SHLOKAHUB_APP_KEY__|$APP_KEY_PATH|g" \
  /etc/nginx/sites-available/shlokahub-app

sudo chown root:root \
  /etc/nginx/sites-available/shlokahub-landing \
  /etc/nginx/sites-available/shlokahub-app
sudo chmod 0644 \
  /etc/nginx/sites-available/shlokahub-landing \
  /etc/nginx/sites-available/shlokahub-app

! sudo grep -q '__SHLOKAHUB_' \
  /etc/nginx/sites-available/shlokahub-landing \
  /etc/nginx/sites-available/shlokahub-app

sudo -u deploy test ! -w /etc/nginx/sites-available/shlokahub-landing
sudo -u deploy test ! -w /etc/nginx/sites-available/shlokahub-app
```

Не публикуй содержимое итоговых файлов: после подстановки они содержат фактические
certificate paths.

## 10. Проверить конфигурацию до reload и renewal

Reload допустим только после успешного синтаксического теста:

```bash
if sudo nginx -t; then
  if sudo systemctl reload nginx.service; then
    sudo systemctl is-active nginx.service
  else
    printf '%s\n' 'FAIL: nginx reload не выполнен'
    false
  fi
else
  printf '%s\n' 'STOP: nginx -t завершился ошибкой; reload запрещён'
  false
fi
```

Затем проверь обновление всех управляемых Certbot сертификатов, включая уже
существующие Sadhana-группы:

```bash
sudo certbot renew --dry-run
sudo nginx -t
sudo systemctl is-active nginx.service
```

Dry run должен полностью завершиться успешно. Не копируй полный вывод в issue или
отчёт: он может содержать certificate identifiers и paths.

Очисти переменные текущей сессии:

```bash
unset \
  CERTBOT_EMAIL \
  LANDING_CERT_PATH \
  LANDING_KEY_PATH \
  APP_CERT_PATH \
  APP_KEY_PATH
```

## 11. Проверить публичный production-контракт

Вернись в окно `LOCAL`, где задан `VDS_HOST`.

### DNS

```bash
for domain_name in \
  shlokahub.com \
  www.shlokahub.com \
  app.shlokahub.com
do
  test "$(dig +short A "$domain_name" @1.1.1.1)" = "$VDS_HOST"
  test -z "$(dig +short AAAA "$domain_name" @1.1.1.1)"
done

unset domain_name
```

### Redirects с сохранением path и query

```bash
test "$(
  curl --silent --show-error \
    --output /dev/null \
    --write-out '%{http_code} %{redirect_url}' \
    'http://shlokahub.com/bootstrap/check?source=ticket-09'
)" = \
  '301 https://shlokahub.com/bootstrap/check?source=ticket-09'

test "$(
  curl --silent --show-error \
    --output /dev/null \
    --write-out '%{http_code} %{redirect_url}' \
    'http://www.shlokahub.com/bootstrap/check?source=ticket-09'
)" = \
  '301 https://shlokahub.com/bootstrap/check?source=ticket-09'

test "$(
  curl --silent --show-error \
    --output /dev/null \
    --write-out '%{http_code} %{redirect_url}' \
    'https://www.shlokahub.com/bootstrap/check?source=ticket-09'
)" = \
  '301 https://shlokahub.com/bootstrap/check?source=ticket-09'

test "$(
  curl --silent --show-error \
    --output /dev/null \
    --write-out '%{http_code} %{redirect_url}' \
    'http://app.shlokahub.com/bootstrap/check?source=ticket-09'
)" = \
  '301 https://app.shlokahub.com/bootstrap/check?source=ticket-09'

```

Команды выполняются без `--location`, поэтому проверяют первый наблюдаемый ответ,
а не результат после цепочки redirects.

### TLS и разделение certificate groups

`curl` без `--insecure` проверяет публичный DNS, доверенную цепочку и наличие
запрошенного имени в сертификате:

```bash
for public_url in \
  'https://shlokahub.com/' \
  'https://app.shlokahub.com/bootstrap/direct-spa-route'
do
  https_status="$(
    curl --silent --show-error \
      --connect-timeout 10 \
      --max-time 30 \
      --output /dev/null \
      --write-out '%{http_code}' \
      "$public_url"
  )"

  test "$https_status" = 200 || test "$https_status" = 404
done

unset https_status public_url
```

Сравни сертификаты в переменных, не печатая fingerprints. Внутри landing-группы
fingerprint должен совпадать, а между landing и application — отличаться:

```bash
certificate_fingerprint() {
  openssl s_client \
    -connect "$1:443" \
    -servername "$1" \
    </dev/null 2>/dev/null \
    | openssl x509 -noout -fingerprint -sha256 2>/dev/null
}

landing_fingerprint="$(certificate_fingerprint shlokahub.com)"
www_landing_fingerprint="$(certificate_fingerprint www.shlokahub.com)"
app_fingerprint="$(certificate_fingerprint app.shlokahub.com)"

test -n "$landing_fingerprint"
test -n "$www_landing_fingerprint"
test -n "$app_fingerprint"
test "$landing_fingerprint" = "$www_landing_fingerprint"
test "$landing_fingerprint" != "$app_fingerprint"

unset \
  landing_fingerprint \
  www_landing_fingerprint \
  app_fingerprint
unset -f certificate_fingerprint
```

### SPA fallback и безопасные пустые roots

Если bootstrap-файлы ещё существуют, прямой application route должен вернуть
`200`. Если root уже пуст перед первым deploy, и `/`, и вложенный route должны
вернуть `404`, но не `403`, redirect или `5xx`:

```bash
app_root_status="$(
  curl --silent --show-error \
    --output /dev/null \
    --write-out '%{http_code}' \
    https://app.shlokahub.com/
)"

app_route_status="$(
  curl --silent --show-error \
    --output /dev/null \
    --write-out '%{http_code}' \
    https://app.shlokahub.com/bootstrap/direct-spa-route
)"

test "$app_root_status" = 200 || test "$app_root_status" = 404
test "$app_route_status" = "$app_root_status"

landing_root_status="$(
  curl --silent --show-error \
    --output /dev/null \
    --write-out '%{http_code}' \
    https://shlokahub.com/
)"

test "$landing_root_status" = 200 || test "$landing_root_status" = 404

unset app_root_status app_route_status landing_root_status
```

Если application root даёт `200`, равный `200` для неизвестного вложенного route
доказывает SPA fallback. Если root даёт `404`, равный `404` доказывает безопасное
поведение до первого deploy.

### Неизвестный Host

HTTP-запрос с неизвестным `Host` должен вернуть `404`:

```bash
test "$(
  curl --silent --show-error \
    --connect-timeout 10 \
    --max-time 30 \
    --noproxy '*' \
    --output /dev/null \
    --write-out '%{http_code}' \
    -H 'Host: unknown.invalid' \
    "http://$VDS_HOST/"
)" = 404
```

На HTTPS неизвестное SNI должно быть отвергнуто безопасным default host ещё во
время TLS handshake:

```bash
if printf '' \
  | openssl s_client \
      -connect "$VDS_HOST:443" \
      -servername unknown.invalid \
      >/dev/null 2>&1
then
  printf '%s\n' 'FAIL: неизвестное SNI завершило TLS handshake'
  false
fi
```

Не добавляй `--insecure`: он маскирует ошибки TLS вместо проверки контракта.

## 12. Безопасно зафиксировать результат

Сохрани только статусы и UTC timestamp, без вывода диагностических команд:

```text
Дата/время UTC:
Оператор:

[ ] Три A-записи указывают на новый VDS
[ ] Все три A-записи оставлены в DNS only
[ ] Конфликтующие AAAA/CNAME/NS отсутствуют
[ ] Railway records api.shlokahub.com не менялись
[ ] Landing certificate group покрывает canonical и www
[ ] Application certificate group покрывает canonical
[ ] Landing и application используют разные сертификаты
[ ] HTTP redirects landing canonical, landing www и application сохраняют path/query
[ ] HTTPS redirect landing www сохраняет path/query
[ ] Application SPA fallback или безопасный empty-root 404 подтверждён
[ ] Landing возвращает 200 или безопасный empty-root 404
[ ] Неизвестный HTTP Host = 404
[ ] Неизвестное HTTPS SNI отвергнуто
[ ] nginx -t = PASS
[ ] certbot renew --dry-run = PASS

Результат: PASS / FAIL
Безопасные замечания:
```

Не включай в note:

- IPv4 VDS;
- certificate names, serials, fingerprints, paths или renewal filenames;
- полный вывод `certbot certificates`, `certbot renew` или `nginx -T`;
- SSH host-key строку, ключи, Cloudflare account/zone identifiers;
- Railway targets, TXT values, service или deployment identifiers;
- screenshots, на которых видны эти значения.

## Откат

### Ошибка Nginx после Certbot или итоговой конфигурации

В окне `ADMIN` восстанови только два сохранённых ShlokaHub-файла:

```bash
sudo cp -a \
  /root/shlokahub-pre-tls/shlokahub-landing \
  /root/shlokahub-pre-tls/shlokahub-app \
  /etc/nginx/sites-available/

if sudo nginx -t; then
  sudo systemctl reload nginx.service
  sudo systemctl is-active nginx.service
else
  printf '%s\n' 'STOP: восстановленная конфигурация не прошла nginx -t'
  false
fi
```

Это возвращает проверенное HTTP-состояние. Не удаляй сертификаты вручную и не
меняй Sadhana или default host для обхода ошибки.

### Ошибка публичного DNS

Если record создан с неправильным значением, исправь только ошибочную запись из
трёх перечисленных в разделе 3. Не удаляй `api.shlokahub.com` и другие records.

Если rollout полностью отменён до следующих deploy, удали только три `A`,
созданные этим runbook. Сначала сверь их names и IPv4 с текущей Cloudflare
сессией. Сертификаты не удаляй вручную: их lifecycle разбирается отдельно после
восстановления Nginx и подтверждения причины отмены.

## Источники

- [Cloudflare: Manage DNS records](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/)
- [Cloudflare: Proxy status](https://developers.cloudflare.com/dns/proxy-status/)
- [Certbot: Nginx on Linux (snap)](https://certbot.eff.org/instructions?os=snap&tab=standard&ws=nginx)
- [Certbot: User Guide](https://eff-certbot.readthedocs.io/en/stable/using.html)
- [Nginx: `try_files`](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files)
- [Nginx: `return`](https://nginx.org/en/docs/http/ngx_http_rewrite_module.html#return)
- [Nginx: reject an SSL handshake](https://nginx.org/en/docs/http/ngx_http_ssl_module.html#ssl_reject_handshake)
