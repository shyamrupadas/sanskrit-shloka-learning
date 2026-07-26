# Изолированная HTTP-платформа для четырёх сайтов

Runbook подготавливает на уже защищённом VDS четыре независимых document root и
четыре HTTP virtual host:

| Сайт | HTTP-имена на этом этапе | Document root | Режим |
| --- | --- | --- | --- |
| Sadhana landing | `sadhana-tracker.com`, `www.sadhana-tracker.com` | `/var/www/sadhana-landing/html/` | обычная статика |
| Sadhana application | `app.sadhana-tracker.com` | `/var/www/sadhana-app/html/` | SPA fallback |
| ShlokaHub landing | `shlokahub.com`, `www.shlokahub.com` | `/var/www/shlokahub-landing/html/` | обычная статика |
| ShlokaHub application | `app.shlokahub.com`, `www.app.shlokahub.com` | `/var/www/shlokahub-app/html/` | SPA fallback |

Все команды выполняются вручную из терминала. Runbook не меняет DNS, не выпускает
сертификаты и не включает production redirects: это отдельные этапы после первых
deploy Sadhana. На текущем этапе alias-имена обслуживаются тем же HTTP virtual host,
чтобы позднее пройти HTTP-01 challenge. HTTPS и канонические redirects настраиваются
только после DNS cutover.

На VDS устанавливаются Nginx, `rsync` и Certbot. Node.js, Corepack, npm, pnpm,
Yarn, Bun, исходный код и production build dependencies на сервер не устанавливаются.
Готовые артефакты позднее доставляет пользователь `deploy`.

IP-адрес VDS и значения SSH-доступа не сохраняй в repository, ticket, commit,
screenshot или отчёт.

## Что должно быть готово

Перед началом:

- тикет безопасного доступа к VDS выполнен;
- локально сохранены проверенный `known_hosts` и private key `deploy` из
  [runbook доступа](vds-secure-access.md);
- `admin` входит по SSH и получает `sudo`;
- `deploy` входит по ключу, не имеет `sudo` и не может менять системную
  конфигурацию;
- VDSina VNC доступна как аварийный канал.

Используй два окна терминала:

1. `ADMIN` — SSH-сессия `admin` на VDS;
2. `LOCAL` — команды на ноутбуке, включая проверки через внешний HTTP-интерфейс.

## 1. Подготовить локальные переменные и открыть `ADMIN`

В окне `LOCAL`:

```bash
export VDS_HOST='<IPv4 нового VDS>'
export SSH_KNOWN_HOSTS_FILE="$HOME/.ssh/shlokahub-vds/known_hosts"
```

Проверь, что host key уже был доверенно сверен на предыдущем этапе:

```bash
test -s "$SSH_KNOWN_HOSTS_FILE"
ssh-keygen -lf "$SSH_KNOWN_HOSTS_FILE"
```

Не продолжай, если файл отсутствует или fingerprint не совпадает с fingerprint,
полученным через VNC.

Открой окно `ADMIN`:

```bash
ssh \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" \
  "admin@$VDS_HOST"
```

В окне `ADMIN` проверь пользователя и заранее обнови timestamp `sudo`:

```bash
id
sudo -v
sudo -l
```

Ожидается пользователь `admin` и разрешённый `sudo`. Все следующие команды до
раздела внешних проверок выполняются в этом окне.

## 2. Проверить отсутствие конфликтующей платформы

Зафиксируй текущее состояние, не выводя чувствительные данные:

```bash
cat /etc/os-release
df -h /
free -h
sudo ss -lntup
sudo systemctl is-active nginx.service 2>/dev/null || true
```

Убедись, что application build toolchain отсутствует:

```bash
application_toolchain_found=0

for command_name in node corepack npm npx pnpm yarn bun vite tsc turbo; do
  if command -v "$command_name" >/dev/null 2>&1; then
    printf 'FAIL: найден %s: %s\n' \
      "$command_name" \
      "$(command -v "$command_name")"
    application_toolchain_found=1
  else
    printf 'PASS: %s отсутствует\n' "$command_name"
  fi
done

test "$application_toolchain_found" -eq 0
```

Если последняя команда завершилась с ненулевым статусом, остановись и выясни, зачем
на новом VDS установлен frontend toolchain. Не удаляй неизвестные пакеты вслепую.

Проверь, что имена будущих Nginx-конфигураций ещё не заняты:

```bash
nginx_config_conflict_found=0

for config_name in \
  00-default-deny \
  sadhana-landing \
  sadhana-app \
  shlokahub-landing \
  shlokahub-app
do
  for config_directory in sites-available sites-enabled; do
    config_path="/etc/nginx/$config_directory/$config_name"

    if test -e "$config_path" || test -L "$config_path"; then
      printf 'FAIL: конфликтующая конфигурация %s\n' "$config_path"
      nginx_config_conflict_found=1
    fi
  done
done

test "$nginx_config_conflict_found" -eq 0
```

Все проверки должны завершиться без вывода. Если файл уже существует, не
перезаписывай его: сначала определи его происхождение и сравни с этим runbook. Не
продолжай, если последняя команда завершилась с ненулевым статусом.

## 3. Установить системные компоненты

Обнови индекс пакетов и установи только runtime-компоненты статического хоста:

```bash
if sudo apt-get update; then
  sudo apt-get install --yes --no-install-recommends curl nginx rsync snapd
else
  printf '%s\n' 'STOP: apt-get update завершился ошибкой'
  false
fi
```

Установи Certbot из официального snap-канала:

```bash
if snap list core >/dev/null 2>&1; then
  sudo snap refresh core
else
  sudo snap install core
fi

if snap list certbot >/dev/null 2>&1; then
  sudo snap refresh certbot
else
  sudo snap install certbot --classic
fi
```

Создай совместимую команду `certbot`, не перезаписывая неизвестный файл:

```bash
if test -L /usr/local/bin/certbot; then
  test "$(readlink /usr/local/bin/certbot)" = /snap/bin/certbot
elif test -e /usr/local/bin/certbot; then
  printf '%s\n' \
    'STOP: /usr/local/bin/certbot существует и не является ожидаемой ссылкой'
  false
else
  sudo ln -s /snap/bin/certbot /usr/local/bin/certbot
fi
```

Если проверка существующей ссылки завершилась с ненулевым статусом, остановись и
разберись, какой Certbot уже установлен. Затем проверь компоненты:

```bash
runtime_component_check_failed=0

if ! curl --version; then
  runtime_component_check_failed=1
fi

if ! nginx -v; then
  runtime_component_check_failed=1
fi

if ! rsync --version; then
  runtime_component_check_failed=1
fi

if ! certbot --version; then
  runtime_component_check_failed=1
fi

if ! sudo systemctl enable --now nginx.service; then
  runtime_component_check_failed=1
fi

if ! sudo systemctl is-enabled nginx.service; then
  runtime_component_check_failed=1
fi

if ! sudo systemctl is-active nginx.service; then
  runtime_component_check_failed=1
fi

test "$runtime_component_check_failed" -eq 0
```

Не запускай `certbot --nginx` и `certbot renew --dry-run`: сертификатов и публичного
DNS на этом этапе ещё нет.

Повтори проверку отсутствия application toolchain:

```bash
application_toolchain_found=0

for command_name in node corepack npm npx pnpm yarn bun vite tsc turbo; do
  if command -v "$command_name" >/dev/null 2>&1; then
    printf 'FAIL: после установки найден %s\n' "$command_name"
    application_toolchain_found=1
  else
    printf 'PASS: %s отсутствует\n' "$command_name"
  fi
done

test "$application_toolchain_found" -eq 0
```

## 4. Создать изолированные document root

Создай четыре каталога. Только конечные `html/` принадлежат automation-пользователю:

```bash
sudo install -d -o deploy -g deploy -m 0755 \
  /var/www/sadhana-landing/html \
  /var/www/sadhana-app/html \
  /var/www/shlokahub-landing/html \
  /var/www/shlokahub-app/html
```

Создай различимые bootstrap-артефакты от имени `deploy`. Они нужны для проверки
routing до первых настоящих deploy и будут заменены будущим `rsync --delete`.

```bash
sudo -u deploy tee /var/www/sadhana-landing/html/index.html >/dev/null <<'EOF'
<!doctype html><html><body>site-id=sadhana-landing</body></html>
EOF

sudo -u deploy install -d -m 0755 \
  /var/www/sadhana-landing/html/bootstrap

sudo -u deploy tee \
  /var/www/sadhana-landing/html/bootstrap/static.txt >/dev/null <<'EOF'
site-id=sadhana-landing-static
EOF

sudo -u deploy tee /var/www/sadhana-app/html/index.html >/dev/null <<'EOF'
<!doctype html><html><body>site-id=sadhana-app</body></html>
EOF

sudo -u deploy tee /var/www/shlokahub-landing/html/index.html >/dev/null <<'EOF'
<!doctype html><html><body>site-id=shlokahub-landing</body></html>
EOF

sudo -u deploy install -d -m 0755 \
  /var/www/shlokahub-landing/html/bootstrap

sudo -u deploy tee \
  /var/www/shlokahub-landing/html/bootstrap/static.txt >/dev/null <<'EOF'
site-id=shlokahub-landing-static
EOF

sudo -u deploy tee /var/www/shlokahub-app/html/index.html >/dev/null <<'EOF'
<!doctype html><html><body>site-id=shlokahub-app</body></html>
EOF
```

Файлы создаются с текущим `umask`; явно зафиксируй безопасные read-only для Nginx
права:

```bash
sudo find \
  /var/www/sadhana-landing/html \
  /var/www/sadhana-app/html \
  /var/www/shlokahub-landing/html \
  /var/www/shlokahub-app/html \
  -type d -exec chmod 0755 {} +

sudo find \
  /var/www/sadhana-landing/html \
  /var/www/sadhana-app/html \
  /var/www/shlokahub-landing/html \
  /var/www/shlokahub-app/html \
  -type f -exec chmod 0644 {} +
```

Проверь ownership и границу записи:

```bash
sudo find \
  /var/www/sadhana-landing/html \
  /var/www/sadhana-app/html \
  /var/www/shlokahub-landing/html \
  /var/www/shlokahub-app/html \
  -maxdepth 2 -printf '%M %u:%g %p\n'

document_root_check_failed=0

for site_root in \
  /var/www/sadhana-landing/html \
  /var/www/sadhana-app/html \
  /var/www/shlokahub-landing/html \
  /var/www/shlokahub-app/html
do
  if test "$(stat -c '%U:%G' "$site_root")" != deploy:deploy; then
    printf 'FAIL: неверный владелец %s: %s\n' \
      "$site_root" \
      "$(stat -c '%U:%G' "$site_root")"
    document_root_check_failed=1
  fi

  if ! sudo -u deploy test -w "$site_root"; then
    printf 'FAIL: deploy не может писать в %s\n' "$site_root"
    document_root_check_failed=1
  fi

  if ! sudo -u www-data test -r "$site_root/index.html"; then
    printf 'FAIL: www-data не читает %s/index.html\n' "$site_root"
    document_root_check_failed=1
  fi

  if sudo -u www-data test -w "$site_root"; then
    printf 'FAIL: www-data может писать в %s\n' "$site_root"
    document_root_check_failed=1
  fi
done

test "$document_root_check_failed" -eq 0
```

Каждый `html/` и его bootstrap-артефакты должны принадлежать `deploy:deploy`.
Проверки должны подтвердить запись для `deploy`, чтение для `www-data` и отсутствие
записи для `www-data`.

## 5. Создать безопасный default virtual host

Неизвестный `Host` должен получать обычный `404`, а не содержимое первого сайта.

```bash
sudo tee /etc/nginx/sites-available/00-default-deny >/dev/null <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    access_log off;
    return 404;
}
EOF
```

## 6. Создать landing virtual hosts

Landing раздаёт только реально существующие файлы и каталоги. Неизвестный путь
возвращает `404`, а не `index.html`.

```bash
sudo tee /etc/nginx/sites-available/sadhana-landing >/dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;

    server_name sadhana-tracker.com www.sadhana-tracker.com;

    root /var/www/sadhana-landing/html;
    index index.html;

    access_log /var/log/nginx/sadhana-landing.access.log;
    error_log /var/log/nginx/sadhana-landing.error.log;

    location / {
        try_files $uri $uri/ =404;
    }
}
EOF

sudo tee /etc/nginx/sites-available/shlokahub-landing >/dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;

    server_name shlokahub.com www.shlokahub.com;

    root /var/www/shlokahub-landing/html;
    index index.html;

    access_log /var/log/nginx/shlokahub-landing.access.log;
    error_log /var/log/nginx/shlokahub-landing.error.log;

    location / {
        try_files $uri $uri/ =404;
    }
}
EOF
```

Одинарные кавычки вокруг `EOF` обязательны: без них shell подставит `$uri` до
записи файла и сломает конфигурацию.

## 7. Создать application virtual hosts со SPA fallback

Для application сначала ищется реальный файл или каталог. Если его нет, Nginx
внутренне открывает `index.html`. Отдельный exact location не допускает цикл
internal redirect и возвращает `404`, если будущий deploy временно не содержит
`index.html`.

```bash
sudo tee /etc/nginx/sites-available/sadhana-app >/dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;

    server_name app.sadhana-tracker.com;

    root /var/www/sadhana-app/html;
    index index.html;

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

sudo tee /etc/nginx/sites-available/shlokahub-app >/dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;

    server_name app.shlokahub.com www.app.shlokahub.com;

    root /var/www/shlokahub-app/html;
    index index.html;

    access_log /var/log/nginx/shlokahub-app.access.log;
    error_log /var/log/nginx/shlokahub-app.error.log;

    location = /index.html {
        try_files /index.html =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
```

## 8. Включить конфигурации и проверить их до reload

Убедись, что созданные Nginx-файлы принадлежат `root` и недоступны `deploy` на
запись:

```bash
sudo chown root:root \
  /etc/nginx/sites-available/00-default-deny \
  /etc/nginx/sites-available/sadhana-landing \
  /etc/nginx/sites-available/sadhana-app \
  /etc/nginx/sites-available/shlokahub-landing \
  /etc/nginx/sites-available/shlokahub-app

sudo chmod 0644 \
  /etc/nginx/sites-available/00-default-deny \
  /etc/nginx/sites-available/sadhana-landing \
  /etc/nginx/sites-available/sadhana-app \
  /etc/nginx/sites-available/shlokahub-landing \
  /etc/nginx/sites-available/shlokahub-app

nginx_permission_check_failed=0

for config_path in \
  /etc/nginx/sites-available/00-default-deny \
  /etc/nginx/sites-available/sadhana-landing \
  /etc/nginx/sites-available/sadhana-app \
  /etc/nginx/sites-available/shlokahub-landing \
  /etc/nginx/sites-available/shlokahub-app
do
  if sudo -u deploy test -w "$config_path"; then
    printf 'FAIL: deploy может менять %s\n' "$config_path"
    nginx_permission_check_failed=1
  fi
done

test "$nginx_permission_check_failed" -eq 0
```

Включи пять конфигураций:

```bash
sudo ln -s \
  /etc/nginx/sites-available/00-default-deny \
  /etc/nginx/sites-enabled/00-default-deny

sudo ln -s \
  /etc/nginx/sites-available/sadhana-landing \
  /etc/nginx/sites-enabled/sadhana-landing

sudo ln -s \
  /etc/nginx/sites-available/sadhana-app \
  /etc/nginx/sites-enabled/sadhana-app

sudo ln -s \
  /etc/nginx/sites-available/shlokahub-landing \
  /etc/nginx/sites-enabled/shlokahub-landing

sudo ln -s \
  /etc/nginx/sites-available/shlokahub-app \
  /etc/nginx/sites-enabled/shlokahub-app
```

Удали только штатную ссылку нового Nginx-пакета:

```bash
if test -L /etc/nginx/sites-enabled/default; then
  sudo unlink /etc/nginx/sites-enabled/default
elif test -e /etc/nginx/sites-enabled/default; then
  printf '%s\n' \
    'STOP: sites-enabled/default не является symlink; разберись вручную'
  false
fi
```

Сначала проверь синтаксис. Reload выполняется только внутри успешной ветки
`nginx -t`:

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

Проверь эффективный список server names и отсутствие конфликтов:

```bash
sudo nginx -T 2>&1 | grep -E \
  'configuration file|listen|server_name|root |try_files'
```

Не публикуй полный `nginx -T` в отчёте: после выпуска TLS он может содержать
фактические certificate paths.

## 9. Проверить routing локально на VDS

Сначала проверь четыре сайта через loopback с явным `Host`:

```bash
curl --fail --silent --show-error \
  --noproxy '*' \
  -H 'Host: sadhana-tracker.com' \
  http://127.0.0.1/ \
  | grep --fixed-strings 'site-id=sadhana-landing'

curl --fail --silent --show-error \
  --noproxy '*' \
  -H 'Host: app.sadhana-tracker.com' \
  http://127.0.0.1/bootstrap/direct-spa-route \
  | grep --fixed-strings 'site-id=sadhana-app'

curl --fail --silent --show-error \
  --noproxy '*' \
  -H 'Host: shlokahub.com' \
  http://127.0.0.1/ \
  | grep --fixed-strings 'site-id=shlokahub-landing'

curl --fail --silent --show-error \
  --noproxy '*' \
  -H 'Host: app.shlokahub.com' \
  http://127.0.0.1/bootstrap/direct-spa-route \
  | grep --fixed-strings 'site-id=shlokahub-app'
```

Проверь обычный статический путь landing:

```bash
curl --fail --silent --show-error \
  --noproxy '*' \
  -H 'Host: sadhana-tracker.com' \
  http://127.0.0.1/bootstrap/static.txt

curl --fail --silent --show-error \
  --noproxy '*' \
  -H 'Host: shlokahub.com' \
  http://127.0.0.1/bootstrap/static.txt
```

Ожидаются соответственно `site-id=sadhana-landing-static` и
`site-id=shlokahub-landing-static`.

Landing не должен применять SPA fallback:

```bash
curl --silent --show-error \
  --noproxy '*' \
  --output /dev/null \
  --write-out '%{http_code}\n' \
  -H 'Host: sadhana-tracker.com' \
  http://127.0.0.1/not-found

curl --silent --show-error \
  --noproxy '*' \
  --output /dev/null \
  --write-out '%{http_code}\n' \
  -H 'Host: shlokahub.com' \
  http://127.0.0.1/not-found
```

Обе команды должны вывести `404`.

Неизвестный `Host` также должен получить `404`:

```bash
curl --silent --show-error \
  --noproxy '*' \
  --output /dev/null \
  --write-out '%{http_code}\n' \
  -H 'Host: unknown.invalid' \
  http://127.0.0.1/
```

Убедись, что `deploy` по-прежнему не управляет Nginx и Certbot:

```bash
sudo -l -U deploy
sudo -u deploy test ! -w /etc/nginx

if test -e /etc/letsencrypt; then
  sudo -u deploy test ! -w /etc/letsencrypt
fi
```

`sudo -l -U deploy` не должен перечислять разрешённые команды.

## 10. Проверить внешний HTTP-интерфейс до DNS cutover

Перейди в окно `LOCAL`. `curl --resolve` отправляет запрос на новый VDS с нужным
`Host`, не меняя локальный DNS и публичные записи.

Проверь канонические имена четырёх сайтов:

```bash
curl --fail --silent --show-error \
  --connect-timeout 10 \
  --noproxy '*' \
  --resolve "sadhana-tracker.com:80:$VDS_HOST" \
  http://sadhana-tracker.com/ \
  | grep --fixed-strings 'site-id=sadhana-landing'

curl --fail --silent --show-error \
  --connect-timeout 10 \
  --noproxy '*' \
  --resolve "app.sadhana-tracker.com:80:$VDS_HOST" \
  http://app.sadhana-tracker.com/bootstrap/direct-spa-route \
  | grep --fixed-strings 'site-id=sadhana-app'

curl --fail --silent --show-error \
  --connect-timeout 10 \
  --noproxy '*' \
  --resolve "shlokahub.com:80:$VDS_HOST" \
  http://shlokahub.com/ \
  | grep --fixed-strings 'site-id=shlokahub-landing'

curl --fail --silent --show-error \
  --connect-timeout 10 \
  --noproxy '*' \
  --resolve "app.shlokahub.com:80:$VDS_HOST" \
  http://app.shlokahub.com/bootstrap/direct-spa-route \
  | grep --fixed-strings 'site-id=shlokahub-app'
```

Проверь подготовленные alias-имена:

```bash
curl --fail --silent --show-error \
  --connect-timeout 10 \
  --noproxy '*' \
  --resolve "www.sadhana-tracker.com:80:$VDS_HOST" \
  http://www.sadhana-tracker.com/ \
  | grep --fixed-strings 'site-id=sadhana-landing'

curl --fail --silent --show-error \
  --connect-timeout 10 \
  --noproxy '*' \
  --resolve "www.shlokahub.com:80:$VDS_HOST" \
  http://www.shlokahub.com/ \
  | grep --fixed-strings 'site-id=shlokahub-landing'

curl --fail --silent --show-error \
  --connect-timeout 10 \
  --noproxy '*' \
  --resolve "www.app.shlokahub.com:80:$VDS_HOST" \
  http://www.app.shlokahub.com/bootstrap/direct-spa-route \
  | grep --fixed-strings 'site-id=shlokahub-app'
```

Наконец, проверь снаружи безопасный default host:

```bash
curl --silent --show-error \
  --connect-timeout 10 \
  --noproxy '*' \
  --output /dev/null \
  --write-out '%{http_code}\n' \
  -H 'Host: unknown.invalid' \
  "http://$VDS_HOST/"
```

Ожидается `404`. Если внешний запрос не соединяется, сначала проверь в `ADMIN`
`sudo ss -lntp 'sport = :80'`, затем сетевой firewall в панели VDSina. Не меняй
DNS для обхода проблемы. UFW, Fail2ban и полный port baseline настраиваются следующим
тикетом.

## 11. Итоговая проверка

В окне `ADMIN`:

```bash
platform_check_failed=0

if ! sudo nginx -t; then
  platform_check_failed=1
fi

if ! sudo systemctl is-enabled nginx.service; then
  platform_check_failed=1
fi

if ! sudo systemctl is-active nginx.service; then
  platform_check_failed=1
fi

sudo find \
  /var/www/sadhana-landing/html \
  /var/www/sadhana-app/html \
  /var/www/shlokahub-landing/html \
  /var/www/shlokahub-app/html \
  -maxdepth 0 -printf '%M %u:%g %p\n'

for site_root in \
  /var/www/sadhana-landing/html \
  /var/www/sadhana-app/html \
  /var/www/shlokahub-landing/html \
  /var/www/shlokahub-app/html
do
  if test "$(stat -c '%U:%G' "$site_root")" != deploy:deploy; then
    printf 'FAIL: неверный владелец %s: %s\n' \
      "$site_root" \
      "$(stat -c '%U:%G' "$site_root")"
    platform_check_failed=1
  fi

  if ! sudo -u deploy test -w "$site_root"; then
    printf 'FAIL: deploy не может писать в %s\n' "$site_root"
    platform_check_failed=1
  fi

  if ! sudo -u www-data test -r "$site_root/index.html"; then
    printf 'FAIL: www-data не читает %s/index.html\n' "$site_root"
    platform_check_failed=1
  fi

  if sudo -u www-data test -w "$site_root"; then
    printf 'FAIL: www-data может писать в %s\n' "$site_root"
    platform_check_failed=1
  fi
done

application_toolchain_found=0

for command_name in node corepack npm npx pnpm yarn bun vite tsc turbo; do
  if command -v "$command_name" >/dev/null 2>&1; then
    printf 'FAIL: найден %s: %s\n' \
      "$command_name" \
      "$(command -v "$command_name")"
    application_toolchain_found=1
  fi
done

if test "$application_toolchain_found" -ne 0; then
  platform_check_failed=1
fi

test "$platform_check_failed" -eq 0
```

Bootstrap-файлы пока оставь на месте: они доказывают разграничение virtual hosts и
SPA fallback. Будущие release workflows заменят их прямым `rsync --delete`.

## 12. Откат Nginx-конфигурации

Откат нужен только если `nginx -t` или проверки routing не проходят. Действующий
Nginx-процесс не применяет ошибочную конфигурацию до reload.

В окне `ADMIN` отключи только файлы из этого runbook:

```bash
sudo unlink /etc/nginx/sites-enabled/00-default-deny
sudo unlink /etc/nginx/sites-enabled/sadhana-landing
sudo unlink /etc/nginx/sites-enabled/sadhana-app
sudo unlink /etc/nginx/sites-enabled/shlokahub-landing
sudo unlink /etc/nginx/sites-enabled/shlokahub-app
```

Восстанови штатный default site только если его файл существует:

```bash
if test -e /etc/nginx/sites-available/default; then
  sudo ln -s \
    /etc/nginx/sites-available/default \
    /etc/nginx/sites-enabled/default
fi

if sudo nginx -t; then
  if sudo systemctl reload nginx.service; then
    sudo systemctl is-active nginx.service
  else
    printf '%s\n' 'FAIL: nginx rollback reload не выполнен'
    false
  fi
else
  printf '%s\n' \
    'STOP: rollback-конфигурация невалидна; reload запрещён'
  false
fi
```

Не удаляй document roots и bootstrap-артефакты до выяснения причины: они принадлежат
`deploy` и не мешают откату Nginx.

## 13. Безопасный отчёт

Не прикладывай полный command output. Достаточно заполнить:

```text
Дата/время UTC:
Оператор:

[ ] curl, nginx, rsync, snapd и Certbot установлены: PASS
[ ] nginx.service enabled и active: PASS
[ ] Node.js/application package managers отсутствуют: PASS
[ ] четыре document root принадлежат deploy:deploy: PASS
[ ] deploy может писать во все четыре document root: PASS
[ ] www-data читает артефакты и не пишет в document root: PASS
[ ] deploy не может писать в Nginx/Certbot configuration: PASS
[ ] четыре отдельных HTTP virtual host: PASS
[ ] оба landing отдают существующие статические пути: PASS
[ ] оба landing возвращают 404 для неизвестного пути: PASS
[ ] оба application возвращают index.html для вложенного route: PASS
[ ] неизвестный Host возвращает 404 без содержимого сайта: PASS
[ ] nginx -t: PASS
[ ] локальные HTTP host checks: PASS
[ ] внешние HTTP host checks через --resolve: PASS
[ ] публичный DNS не менялся
[ ] сертификаты не выпускались

Результат: PASS / FAIL
Безопасные замечания:
```

После всех `PASS` тикет HTTP-платформы можно перевести из `ready-for-human` в
`awaiting-human-review`. Фактический IP, ключи, `known_hosts` и будущие certificate
identifiers в отчёт не включай.

## Источники

- [Ubuntu Server: How to install Nginx](https://documentation.ubuntu.com/server/how-to/web-services/install-nginx/)
- [Nginx: Server names](https://nginx.org/en/docs/http/server_names.html)
- [Nginx: `try_files`](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files)
- [Certbot: Nginx on Linux (snap)](https://certbot.eff.org/instructions?os=snap&tab=standard&ws=nginx)
