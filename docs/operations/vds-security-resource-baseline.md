# Security- и resource-baseline общего VDS

Runbook завершает bootstrap уже защищённого HTTP-хоста:

- UFW публикует только TCP `22`, `80` и `443`;
- Fail2ban защищает только SSH через UFW;
- journald ограничен 200 МБ и сохраняет 2 ГБ свободного места;
- штатные правила logrotate проверены, а не продублированы;
- security updates устанавливаются ежедневно без автоматической перезагрузки;
- при отсутствии активного swap и достаточном месте создаётся `/swapfile` размером
  1 ГБ;
- итоговая диагностика фиксирует безопасные показатели ресурсов и разграничение
  document roots.

Все команды выполняются вручную. Runbook не меняет DNS, TLS, GitHub Secrets,
Sadhana workflows и содержимое сайтов. Фактический IP, ключи, `known_hosts`, пароли
и иные runtime-значения не должны попадать в repository, ticket, screenshot или
отчёт.

## Что должно быть готово

Перед началом:

- выполнен [runbook безопасного доступа](vds-secure-access.md);
- выполнен [runbook HTTP-платформы](vds-http-platform.md);
- `admin` входит по SSH, получает `sudo`, а VDSina VNC остаётся доступна;
- `deploy` входит только по ключу, не имеет `sudo` и не меняет системную
  конфигурацию;
- четыре HTTP virtual host отвечают ожидаемым содержимым, неизвестный `Host`
  возвращает `404`;
- текущие административная и recovery-сессии не закрываются до внешней проверки
  UFW.

Используй три окна:

1. `ADMIN` — уже открытая SSH-сессия `admin`;
2. `VERIFY` — новое SSH-соединение для проверки доступа после включения UFW;
3. `LOCAL` — внешние проверки с ноутбука.

В окне `LOCAL` подготовь те же локальные переменные, что использовались в предыдущих
runbooks:

```bash
export VDS_HOST='<IPv4 нового VDS>'
export SSH_KNOWN_HOSTS_FILE="$HOME/.ssh/shlokahub-vds/known_hosts"
```

Не выводи значения переменных в отчёт.

## 1. Зафиксировать исходное состояние

В окне `ADMIN`:

```bash
id
sudo -v

cat /etc/os-release
uname -a
findmnt -no TARGET,SOURCE,FSTYPE,OPTIONS /
df -hT /
free -h
swapon --show
sudo systemctl --failed
sudo ss -lntup
```

Затем проверь предыдущие этапы:

```bash
sudo sshd -t
sudo nginx -t
sudo systemctl is-active ssh.service nginx.service
sudo systemctl is-enabled ssh.service nginx.service

for site_root in \
  /var/www/sadhana-landing/html \
  /var/www/sadhana-app/html \
  /var/www/shlokahub-landing/html \
  /var/www/shlokahub-app/html
do
  stat -c '%A %U:%G %n' "$site_root"
done
```

Остановись, если:

- root filesystem read-only или заполнена;
- есть неизвестные failed units;
- SSH или Nginx не проходят проверку;
- любой document root не принадлежит `deploy:deploy`;
- VNC/recovery console недоступна.

Не исправляй здесь несвязанные failed units или ownership: сначала выясни причину.

## 2. Установить host-security packages

До установки проверь, не существует ли уже управляемая вручную конфигурация. UFW
может ещё не быть установлен после предыдущего этапа:

```bash
if command -v ufw >/dev/null 2>&1; then
  sudo ufw status verbose
  sudo ufw show added
else
  printf '%s\n' 'INFO: UFW ещё не установлен'
fi

sudo test ! -e /etc/fail2ban/jail.d/shlokahub-sshd.local
sudo test ! -e /etc/systemd/journald.conf.d/60-shlokahub-resource-limits.conf
sudo test ! -e /etc/apt/apt.conf.d/99-shlokahub-security-updates
```

Если UFW установлен, первые две команды могут показать `Status: inactive` и пустой
список правил. Если UFW уже активен, уже содержит правила либо один из трёх
project-specific файлов существует, остановись и сравни фактическую конфигурацию с
этим runbook. Не выполняй `ufw reset` и не перезаписывай неизвестные настройки:
reset может удалить нужный доступ и разорвать SSH-сессию.

Сначала полностью обнови ОС, затем установи недостающие системные пакеты. Порог
свободного места для swap измеряется только после этого обновления:

```bash
if sudo apt-get update; then
  if sudo apt-get full-upgrade --yes; then
    sudo apt-get install \
      --yes \
      --no-install-recommends \
      ufw \
      fail2ban \
      unattended-upgrades \
      logrotate
  else
    printf '%s\n' 'STOP: full-upgrade завершился ошибкой'
    false
  fi
else
  printf '%s\n' 'STOP: apt-get update завершился ошибкой'
  false
fi
```

Проверь пакеты и состояние системы:

```bash
dpkg-query -W \
  -f='${binary:Package} ${db:Status-Abbrev} ${Version}\n' \
  ufw \
  fail2ban \
  unattended-upgrades \
  logrotate

sudo systemctl --failed

if test -e /var/run/reboot-required; then
  printf '%s\n' 'INFO: после настройки нужен ручной reboot'
else
  printf '%s\n' 'INFO: reboot сейчас не запрошен'
fi
```

Если пакетное обновление требует reboot, сначала закончи проверки этого runbook.
Перезагрузку выполняй вручную в согласованное окно, после чего повтори итоговую
диагностику и smoke-check четырёх HTTP virtual hosts.

## 3. Создать swap только при выполнении условий

Сначала проверь активный swap:

```bash
swapon --show --bytes
free -h
```

Если вывод `swapon` не пуст, новый swap не создавай независимо от его типа. Зафиксируй
фактический размер в безопасном отчёте и перейди к следующему разделу.

Если активного swap нет, проверь точное доступное место и конфликты:

```bash
available_bytes="$(df --output=avail -B1 / | tail -n 1 | tr -d ' ')"
minimum_bytes=$((3 * 1024 * 1024 * 1024))

printf 'Свободно перед swap: %s байт\n' "$available_bytes"

test "$available_bytes" -ge "$minimum_bytes"
sudo test ! -e /swapfile
! grep -Eq '^[[:space:]]*/swapfile[[:space:]]' /etc/fstab
```

Все три последние проверки должны завершиться успешно. Если свободно меньше 3 ГБ,
остановись: сначала найди расход диска или повысь тариф до 2 ГБ RAM / 50 ГБ диска.
Не уменьшай согласованный порог и не создавай swap меньшего размера как обход.

Создай неразреженный файл и включи его:

```bash
sudo dd \
  if=/dev/zero \
  of=/swapfile \
  bs=1M \
  count=1024 \
  status=progress

sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

До изменения `/etc/fstab` проверь активный файл:

```bash
sudo stat -c '%A %U:%G %s %n' /swapfile
swapon --show --bytes
free -h
```

Ожидается `/swapfile` размером `1073741824` байт с правами `-rw-------` и активный
swap. Создай отдельную резервную копию `fstab`, не перезаписывая существующую:

```bash
sudo test ! -e /etc/fstab.before-shlokahub-swap
sudo cp --archive /etc/fstab /etc/fstab.before-shlokahub-swap
printf '%s\n' '/swapfile none swap sw 0 0' \
  | sudo tee -a /etc/fstab >/dev/null
```

Проверь единственную запись, синтаксис mount table и повторное включение:

```bash
test "$(grep -Ec '^[[:space:]]*/swapfile[[:space:]]+none[[:space:]]+swap[[:space:]]+sw[[:space:]]+0[[:space:]]+0[[:space:]]*$' /etc/fstab)" -eq 1
sudo findmnt --verify
sudo swapoff /swapfile
sudo swapon --all
swapon --show --bytes
free -h
```

Не меняй `vm.swappiness`: swap нужен для краткого memory spike, а устойчивое
использование swap является сигналом расследования или повышения тарифа.

## 4. Включить UFW без потери SSH-доступа

Ещё раз убедись, что UFW не содержит неизвестных правил:

```bash
sudo ufw status verbose
sudo ufw show added
```

Ожидается `Status: inactive` и отсутствие добавленных allow/deny rules. Сначала
разреши SSH, HTTP и будущий HTTPS, и только затем включай firewall:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP and ACME'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw --force enable
```

Не закрывая окно `ADMIN`, проверь effective state:

```bash
sudo ufw status verbose
sudo ufw status numbered
sudo systemctl is-active ufw.service
sudo systemctl is-enabled ufw.service
```

Ожидается:

- `Status: active`;
- default `deny (incoming)` и `allow (outgoing)`;
- allow rules только для TCP `22`, `80`, `443` (включая соответствующие IPv6 rules,
  если IPv6 включён);
- `ufw.service` active и enabled.

В окне `VERIFY` открой новое соединение с ноутбука:

```bash
ssh \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" \
  "admin@$VDS_HOST"
```

Внутри новой сессии:

```bash
id
sudo -v
sudo ufw status verbose
```

Не продолжай, если новое SSH-соединение не открылось. Сохрани старую сессию и
используй VNC для диагностики; не отключай host-key checking.

В окне `LOCAL` проверь HTTP-интерфейс:

```bash
curl --fail --silent --show-error \
  --connect-timeout 10 \
  --noproxy '*' \
  --resolve "sadhana-tracker.com:80:$VDS_HOST" \
  http://sadhana-tracker.com/ \
  >/dev/null

curl --silent --show-error \
  --connect-timeout 10 \
  --noproxy '*' \
  --output /dev/null \
  --write-out '%{http_code}\n' \
  -H 'Host: unknown.invalid' \
  "http://$VDS_HOST/"
```

Ожидаются успешный Sadhana HTTP-ответ и `404` для неизвестного `Host`. Порт `443`
разрешён заранее, но до выпуска сертификатов Nginx может ещё не слушать его.

## 5. Сверить listeners с firewall

В окне `ADMIN`:

```bash
sudo ss -lntup
sudo ufw status numbered
```

Разбери каждый socket по адресу bind:

- публичные TCP listeners должны быть ожидаемыми SSH/Nginx listeners;
- loopback-only resolver и системные listeners не публикуются наружу;
- UDP-listeners не получают входящих allow rules;
- UFW не содержит inbound allow rules, кроме TCP `22`, `80`, `443`;
- TCP `443` может быть разрешён без listener до TLS-этапа.

Не останавливай неизвестный listener вслепую. Если процесс слушает публичный адрес и
не относится к SSH/Nginx, выясни его происхождение; UFW должен по-прежнему блокировать
его снаружи.

С ноутбука дополнительно проверь нужные порты любым доступным TCP-клиентом. Например,
если установлен Netcat:

```bash
nc -vz -w 10 "$VDS_HOST" 22
nc -vz -w 10 "$VDS_HOST" 80
```

Проверка `443` обязательна только после выпуска TLS. Не сканируй чужие адреса и не
сохраняй IP VDS в отчёте.

## 6. Включить Fail2ban только для SSH

Создай отдельный local override:

```bash
sudo install -d \
  -o root \
  -g root \
  -m 755 \
  /etc/fail2ban/jail.d

sudo tee /etc/fail2ban/jail.d/shlokahub-sshd.local >/dev/null <<'EOF'
[sshd]
enabled = true
backend = systemd
banaction = ufw
port = ssh
findtime = 10m
maxretry = 5
bantime = 1h
EOF

sudo chown root:root /etc/fail2ban/jail.d/shlokahub-sshd.local
sudo chmod 644 /etc/fail2ban/jail.d/shlokahub-sshd.local
```

Проверь конфигурацию до запуска:

```bash
sudo fail2ban-client -t
```

Только после успешной проверки включи автозапуск и перезапусти сервис, чтобы local
override применился даже в случае, если package installation уже запустила Fail2ban:

```bash
sudo systemctl enable fail2ban.service
sudo systemctl restart fail2ban.service
sudo systemctl is-active fail2ban.service
sudo systemctl is-enabled fail2ban.service
sudo fail2ban-client ping
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

Проверь effective значения:

```bash
sudo fail2ban-client --dump-pretty
sudo fail2ban-client get sshd findtime
sudo fail2ban-client get sshd maxretry
sudo fail2ban-client get sshd bantime
sudo fail2ban-client get sshd actions
```

В dump-конфигурации jail `sshd` должен создаваться с backend `systemd`; остальные
команды должны вывести `600` секунд, `5`, `3600` секунд и действие UFW. Не имитируй
пять неудачных входов со своего рабочего адреса: это создаст реальный ban и может
заблокировать административный доступ.

Проверь, что других jail нет:

```bash
sudo fail2ban-client status
```

В `Jail list` ожидается только `sshd`. Nginx jails не включаются: текущие сайты не
имеют HTTP-аутентификации, а непроверенные filters могут блокировать легитимный
трафик.

## 7. Ограничить journald и проверить logrotate

Сначала проверь штатные package-managed rules:

```bash
sudo ls -l \
  /etc/logrotate.d/nginx \
  /etc/logrotate.d/ufw \
  /etc/logrotate.d/fail2ban

sudo systemctl is-active logrotate.timer
sudo systemctl is-enabled logrotate.timer
sudo logrotate --debug /etc/logrotate.conf
sudo journalctl --disk-usage
```

Все три файла должны существовать. `logrotate --debug` не выполняет rotation; он
проверяет полный configuration graph. Если пакетного файла нет или debug сообщает
ошибку, остановись и восстанови пакетную конфигурацию. Не создавай параллельное
правило для того же журнала.

Создай journald drop-in:

```bash
sudo install -d \
  -o root \
  -g root \
  -m 755 \
  /etc/systemd/journald.conf.d

sudo tee \
  /etc/systemd/journald.conf.d/60-shlokahub-resource-limits.conf \
  >/dev/null <<'EOF'
[Journal]
SystemMaxUse=200M
SystemKeepFree=2G
EOF

sudo chown \
  root:root \
  /etc/systemd/journald.conf.d/60-shlokahub-resource-limits.conf
sudo chmod \
  644 \
  /etc/systemd/journald.conf.d/60-shlokahub-resource-limits.conf
```

Проверь объединённую конфигурацию и примени её:

```bash
sudo systemd-analyze cat-config systemd/journald.conf
sudo systemctl restart systemd-journald.service
sudo systemctl is-active systemd-journald.service
sudo journalctl --disk-usage
```

В объединённой конфигурации последние effective значения должны быть
`SystemMaxUse=200M` и `SystemKeepFree=2G`. Настройка ограничивает дальнейший рост;
не удаляй старые журналы вручную только ради немедленного совпадения текущего
размера с лимитом.

## 8. Включить ежедневные security updates без automatic reboot

Проверь package defaults и текущую конфигурацию:

```bash
sudo test -f /etc/apt/apt.conf.d/50unattended-upgrades
apt-config dump | grep -E \
  'APT::Periodic::(Update-Package-Lists|Unattended-Upgrade)|Unattended-Upgrade::(Allowed-Origins|Origins-Pattern|Automatic-Reboot)'
```

Создай поздний project override:

```bash
sudo tee /etc/apt/apt.conf.d/99-shlokahub-security-updates >/dev/null <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

sudo chown root:root /etc/apt/apt.conf.d/99-shlokahub-security-updates
sudo chmod 644 /etc/apt/apt.conf.d/99-shlokahub-security-updates
```

Проверь effective значения и явно включи timers:

```bash
apt-config dump | grep -E \
  'APT::Periodic::(Update-Package-Lists|Unattended-Upgrade)|Unattended-Upgrade::(Allowed-Origins|Origins-Pattern|Automatic-Reboot)'

sudo systemctl enable --now apt-daily.timer apt-daily-upgrade.timer
systemctl is-enabled apt-daily.timer apt-daily-upgrade.timer
systemctl list-timers apt-daily.timer apt-daily-upgrade.timer
```

Ожидается:

- оба значения `APT::Periodic` равны `1`;
- security origin Ubuntu остаётся разрешён package-managed конфигурацией;
- `Automatic-Reboot` равен `false`;
- оба APT timer включены и имеют следующие запуски.

Запусти безопасную симуляцию без установки:

```bash
sudo unattended-upgrade --dry-run --debug
```

Команда должна завершиться без configuration errors. Она может перечислить package
updates; это не Secret. Не меняй package-managed `50unattended-upgrades`, если
проектный override уже обеспечивает выбранную reboot policy.

Проверь отложенную перезагрузку:

```bash
if test -e /var/run/reboot-required; then
  printf '%s\n' 'REBOOT REQUIRED: запланировать ручную перезагрузку'
else
  printf '%s\n' 'REBOOT NOT REQUIRED'
fi
```

Automatic reboot остаётся запрещён. После ручной перезагрузки повторно проверь SSH,
UFW, Fail2ban, Nginx и четыре HTTP virtual host.

## 9. Итоговая диагностика

В окне `ADMIN` выполни проверки с единым failure flag:

```bash
baseline_check_failed=0

if ! sudo sshd -t; then
  baseline_check_failed=1
fi

if ! sudo nginx -t; then
  baseline_check_failed=1
fi

for service_name in \
  ssh.service \
  nginx.service \
  ufw.service \
  fail2ban.service \
  systemd-journald.service
do
  if ! sudo systemctl is-active "$service_name"; then
    baseline_check_failed=1
  fi
done

for unit_name in \
  ssh.service \
  nginx.service \
  ufw.service \
  fail2ban.service \
  logrotate.timer \
  apt-daily.timer \
  apt-daily-upgrade.timer
do
  if ! sudo systemctl is-enabled "$unit_name"; then
    baseline_check_failed=1
  fi
done

if ! sudo fail2ban-client status sshd; then
  baseline_check_failed=1
fi

if ! sudo logrotate --debug /etc/logrotate.conf; then
  baseline_check_failed=1
fi

failed_unit_count="$(
  sudo systemctl --failed --no-legend --plain \
    | sed '/^[[:space:]]*$/d' \
    | wc -l \
    | tr -d ' '
)"

if test "$failed_unit_count" -ne 0; then
  printf 'FAIL: обнаружено failed units: %s\n' "$failed_unit_count"
  baseline_check_failed=1
fi

for site_root in \
  /var/www/sadhana-landing/html \
  /var/www/sadhana-app/html \
  /var/www/shlokahub-landing/html \
  /var/www/shlokahub-app/html
do
  if test "$(stat -c '%U:%G' "$site_root")" != deploy:deploy; then
    printf 'FAIL: неверный владелец %s\n' "$site_root"
    baseline_check_failed=1
  fi

  if ! sudo -u deploy test -w "$site_root"; then
    printf 'FAIL: deploy не может писать в %s\n' "$site_root"
    baseline_check_failed=1
  fi

  if sudo -u www-data test -w "$site_root"; then
    printf 'FAIL: www-data может писать в %s\n' "$site_root"
    baseline_check_failed=1
  fi
done

test "$baseline_check_failed" -eq 0
```

Затем сними безопасные показатели:

```bash
date -u '+%Y-%m-%dT%H:%M:%SZ'
uptime
awk '/MemAvailable/ { print }' /proc/meminfo
free -h
swapon --show
df -hT /
sudo journalctl --disk-usage
sudo du -sh \
  /var/log/nginx \
  /var/log/unattended-upgrades \
  2>/dev/null
sudo journalctl \
  -k \
  --since '7 days ago' \
  --grep='out of memory|oom-killer|killed process' \
  --case-sensitive=false \
  --no-pager
sudo ss -lntup
sudo ufw status verbose
sudo fail2ban-client status sshd
```

Пустой вывод OOM-проверки ожидаем. Если установленная версия `journalctl` не
поддерживает `--case-sensitive`, используй:

```bash
sudo journalctl -k --since '7 days ago' --no-pager \
  | grep -Ei 'out of memory|oom-killer|killed process' \
  || true
```

В панели VDSina отдельно зафиксируй безопасный процент месячного трафика без IP,
account identifiers или billing details.

Повтори из окна `LOCAL` HTTP-проверки всех четырёх hosts и неизвестного `Host` из
[runbook HTTP-платформы](vds-http-platform.md#10-проверить-внешний-http-интерфейс-до-dns-cutover).
Проверка `deploy` по CI-ключу и отсутствия `sudo` повторяется по
[runbook доступа](vds-secure-access.md#повторно-проверить-отсутствие-sudo).

## 10. Пороговые значения и обслуживание

После bootstrap и каждого из первых четырёх deploy фиксируй:

- занятость и свободное место root filesystem;
- `MemAvailable`, использование swap и наличие OOM events;
- 15-minute load average;
- размер system journal и журналов Nginx;
- месячный трафик из панели VDSina;
- наличие `/var/run/reboot-required`.

Первую неделю проверяй показатели ежедневно, затем еженедельно.

Начни расследование, если:

- root filesystem занята на 70% или свободно меньше 2 ГБ;
- `MemAvailable` меньше 200 МиБ и swap больше 256 МиБ в трёх последовательных
  проверках вне package upgrade;
- 15-minute load average устойчиво выше `0.7`;
- диск неожиданно вырос более чем на 500 МБ за неделю;
- использовано 70% месячного трафика до последней недели месяца.

Сначала повысь один VDS до 2 ГБ RAM / 50 ГБ диска, если:

- после безопасной очистки диск занят минимум на 80% или свободно меньше 1,5 ГБ;
- произошёл любой OOM event;
- swap устойчиво использует больше 512 МиБ;
- обычный HTTP-трафик вызывает постоянный swap-in/swap-out и задержки;
- 15-minute load выше `1.0` вместе с latency или timeout;
- прогноз трафика превышает 80–90% месячного лимита.

Не маскируй повторяющиеся configuration/deploy errors увеличением тарифа. Отдельный
VDS относится к будущей fault isolation, а не к текущему baseline.

## 11. Точечный откат

Откат выполняется только для настройки, которая не прошла свою проверку. Не
возвращай весь host в исходное состояние из-за одной ошибки.

### Fail2ban

Если local jail невалиден, удали только project override и перезапусти сервис:

```bash
sudo rm /etc/fail2ban/jail.d/shlokahub-sshd.local
sudo systemctl restart fail2ban.service
sudo fail2ban-client status
```

Если после удаления сервис не запускается, причина находится в другой
конфигурации — не отключай firewall.

### Journald

```bash
sudo rm \
  /etc/systemd/journald.conf.d/60-shlokahub-resource-limits.conf
sudo systemctl restart systemd-journald.service
sudo systemctl is-active systemd-journald.service
```

Удаление drop-in не восстанавливает уже rotated journals; оно только возвращает
package/system defaults для будущего хранения.

### Automatic updates

```bash
sudo rm /etc/apt/apt.conf.d/99-shlokahub-security-updates
apt-config dump | grep -E \
  'APT::Periodic::(Update-Package-Lists|Unattended-Upgrade)|Unattended-Upgrade::Automatic-Reboot'
```

После отката отдельно подтверди, что package defaults не включили automatic reboot.

### Swap

Если `/swapfile` создан этим runbook, но проверка `fstab` не проходит:

1. через `sudoedit /etc/fstab` удали только строку
   `/swapfile none swap sw 0 0`;
2. выполни:

```bash
sudo findmnt --verify
sudo swapoff /swapfile
sudo rm /swapfile
swapon --show
```

Резервная копия `/etc/fstab.before-shlokahub-swap` остаётся для ручного сравнения.
Не копируй её поверх текущего `fstab`, если после bootstrap были другие изменения.

### UFW

Не выполняй удалённо `ufw reset` или `ufw disable` при исправном SSH. Ошибочное
лишнее правило удаляй по точному номеру только после `sudo ufw status numbered`,
сохраняя allow rule для `22/tcp`. Если SSH потерян, используй VDSina VNC и сначала
восстанови правило `22/tcp`, затем повтори внешнюю проверку.

## 12. Безопасный отчёт

Не прикладывай полный command output. Достаточно заполнить:

```text
Дата/время UTC:
Оператор:

[ ] UFW active, enabled, deny incoming / allow outgoing: PASS
[ ] inbound allow rules только TCP 22, 80, 443: PASS
[ ] публичные listeners сверены с firewall: PASS
[ ] новый вход admin после включения UFW и sudo: PASS
[ ] HTTP virtual hosts и безопасный default Host после UFW: PASS
[ ] Fail2ban active и enabled, единственный jail sshd: PASS
[ ] Fail2ban: systemd / UFW / 5 попыток / 10 минут / 1 час: PASS
[ ] package logrotate rules Nginx, UFW и Fail2ban существуют: PASS
[ ] logrotate.timer active/enabled и debug-проверка успешна: PASS
[ ] journald: SystemMaxUse=200M, SystemKeepFree=2G: PASS
[ ] security updates ежедневные, automatic reboot=false: PASS
[ ] reboot-required проверен: PASS / REQUIRED
[ ] swap уже существовал либо создан по условию >=3 ГБ: PASS
[ ] vm.swappiness не изменялся: PASS
[ ] четыре document root принадлежат deploy:deploy: PASS
[ ] deploy пишет, www-data не пишет в document roots: PASS
[ ] SSH/Nginx syntax и required services: PASS
[ ] диск, MemAvailable, swap, OOM, load и журналы проверены: PASS
[ ] месячный трафик проверен в VDSina: PASS

Результат: PASS / FAIL
Безопасные замечания:
```

Не включай IP, usernames кроме согласованных `admin`/`deploy`, SSH key material,
`known_hosts`, пароли, certificate identifiers или Secret values.

После всех `PASS` ticket security/resource baseline можно перевести из
`ready-for-human` в `awaiting-human-review`. Следующие tickets отдельно восстанавливают
Sadhana application и landing; этот runbook не меняет их repositories или workflows.

## Источники

- [Ubuntu Server: Firewall](https://documentation.ubuntu.com/server/how-to/security/firewalls/)
- [Ubuntu Server: Automatic updates](https://documentation.ubuntu.com/server/how-to/software/automatic-updates/)
- [Ubuntu manpage: Fail2ban](https://manpages.ubuntu.com/manpages/resolute/man1/fail2ban.1.html)
- [Ubuntu manpage: swapon](https://manpages.ubuntu.com/manpages/noble/man8/swapon.8.html)
- [systemd: journald.conf](https://www.freedesktop.org/software/systemd/man/252/journald.conf.html)
- [Nginx: Rotating log files](https://nginx.org/en/docs/control.html)
