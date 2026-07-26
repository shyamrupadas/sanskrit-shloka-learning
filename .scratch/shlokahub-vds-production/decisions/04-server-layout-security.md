# Выбрать точную схему общего VDS и границу Sadhana

Type: grilling
Status: resolved
Blocked by: 01 - Проверить production baseline VDSina и Ubuntu 26.04; 02 - Проверить DNS, TLS и Railway custom domain; 03 - Проверить готовность repositories к CI/CD на общий VDS

## Question

Какая точная структура пользователей, SSH-доступа, каталогов, ownership, Nginx
server blocks, TLS certificates, redirects, firewall, swap, logs и security updates
реализует уже согласованный простой baseline для четырёх сайтов на новом VDS? Какие
минимальные действия по восстановлению двух Sadhana sites входят в этот rollout, а
какие изменения их workflows следует оставить отдельной работой?

## Answer

Принята единая простая схема одного VDS без контейнеров и отдельных release-каталогов.

### Пользователи и SSH

- `admin` — ручная административная учётная запись с длинным уникальным паролем,
  членством в `sudo` и разрешённым парольным SSH-входом.
- `deploy` — automation-пользователь без пароля и `sudo`; в
  `/home/deploy/.ssh/authorized_keys` находится только общий публичный CI-ключ для
  четырёх repositories.
- Прямой SSH-вход под `root` запрещён. Вход разрешён только `admin` и `deploy`;
  для `deploy` отдельно запрещены парольная и interactive-аутентификация, agent/X11/
  TCP forwarding и tunnels.
- Изменения SSH применяются только после `sshd -t` и проверки в отдельных сессиях,
  что `admin` входит и получает `sudo`, `deploy` входит по ключу без `sudo`, а root
  больше не входит. VDSina VNC остаётся аварийным каналом.

### Каталоги и ownership

Создаются четыре независимых deployment-каталога:

```text
/var/www/sadhana-landing/html/
/var/www/sadhana-app/html/
/var/www/shlokahub-landing/html/
/var/www/shlokahub-app/html/
```

Их владелец и группа — `deploy:deploy`, каталоги доступны на чтение и traversal
Nginx. `www-data` ничего в них не записывает. `deploy` может менять содержимое всех
четырёх сайтов, но не владеет `/etc/nginx`, сертификатами и systemd-конфигурацией.
Это соответствует уже принятому MVP-риску одного пользователя и одного ключа для
всех workflows.

### Nginx и TLS

- Для каждого сайта используется отдельный Nginx virtual host и отдельный document
  root. Неизвестный `Host` обрабатывается default server и не попадает ни на один
  сайт.
- `sadhana-tracker.com` обслуживает Sadhana landing, а
  `app.sadhana-tracker.com` — Sadhana SPA. Новые aliases для Sadhana этим rollout
  не добавляются.
- `shlokahub.com` обслуживает ShlokaHub landing, а `app.shlokahub.com` — ShlokaHub
  SPA. `www.shlokahub.com` и `www.app.shlokahub.com` постоянно перенаправляются на
  соответствующие канонические HTTPS-адреса с сохранением path и query.
- Для обоих application virtual hosts используется SPA fallback на `index.html`;
  landing hosts раздают существующие статические пути без SPA fallback.
- HTTP остаётся открыт для ACME renewal и перенаправляется на HTTPS после выпуска
  сертификатов.
- Certbot на новом VDS выпускает независимые сертификаты для существующих имён
  Sadhana и две пары для ShlokaHub:
  `shlokahub.com` + `www.shlokahub.com` и
  `app.shlokahub.com` + `www.app.shlokahub.com`. Сертификат
  `api.shlokahub.com` принадлежит Railway, не VDS.
- После настройки обязательны `nginx -t`, reload Nginx и
  `certbot renew --dry-run`. Точная последовательность DNS и cutover остаётся в
  отдельном решении карты.

### Host security и ресурсы

- UFW: default deny incoming, default allow outgoing; снаружи открыты только TCP
  `22`, `80`, `443`.
- Fail2ban включён только для SSH: `maxretry=5`, `findtime=10m`, `bantime=1h`,
  `backend=systemd`, блокировка через UFW.
- Если активного swap ещё нет и после обновления ОС свободно не менее 3 ГБ,
  создаётся `/swapfile` размером 1 ГБ. При меньшем свободном месте сначала
  устраняется расход диска или повышается тариф; `vm.swappiness` заранее не
  меняется.
- Проверяются штатные logrotate rules Nginx, UFW и Fail2ban. Для journald задаются
  `SystemMaxUse=200M` и `SystemKeepFree=2G`.
- Security updates устанавливаются автоматически каждый день, но automatic reboot
  явно выключен; наличие `reboot-required` проверяется вручную.
- После bootstrap и первых deploy контролируются диск, `MemAvailable`, swap, OOM,
  load и трафик по порогам из решения
  [«Проверить production baseline VDSina и Ubuntu 26.04»](01-vdsina-ubuntu-baseline.md).

### Граница переноса Sadhana

В общий rollout входят:

1. создание двух каталогов Sadhana с указанным ownership;
2. размещение общего публичного CI-ключа у `deploy`;
3. обновление GitHub connection values на новый VDS (`SERVER_IP`,
   `SERVER_USER=deploy` и, только если ключ заменён, `SSH_PRIVATE_KEY`);
4. получение SSH host key через доверенную VDSina console/bootstrap-сессию,
   проверка fingerprint и сохранение полной строки в GitHub Secret
   `SSH_KNOWN_HOSTS` обоих Sadhana repositories;
5. удаление runtime `ssh-keyscan` из обоих workflows и использование заранее
   проверенного `known_hosts` с `StrictHostKeyChecking=yes`;
6. ручной запуск обоих workflows после переключения и проверка обоих production
   сайтов.

Более широкая модернизация Sadhana workflows — явные GitHub permissions,
concurrency, дополнительные quality gates и иные улучшения, не нужные для безопасного
переноса, — остаётся отдельной будущей работой. Она не блокирует production-план
ShlokaHub.
