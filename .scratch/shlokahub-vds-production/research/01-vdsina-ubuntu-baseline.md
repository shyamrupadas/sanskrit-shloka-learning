# Production baseline VDSina и Ubuntu 26.04 для четырёх статических сайтов

Дата проверки: 2026-07-25.

## Вопрос

Какие актуальные возможности и ограничения VDSina standard VDS и Ubuntu 26.04 LTS
нужно учесть в точном bootstrap-плане для уже созданного сервера 1 vCPU / 1 ГБ RAM /
10 ГБ NVMe: первоначальный доступ, изменение тарифа, расширение диска после upgrade,
swap, security updates, firewall, Fail2ban, Nginx, Certbot, журналирование и измеримые
пороги, после которых четыре малонагруженных статических сайта следует переносить или
масштабировать?

## Краткий вывод

Текущий VDS можно использовать как контролируемый MVP-хост для четырёх статических
сайтов. В production на нём не запускаются Node.js, сборка, база данных или API:
GitHub Actions передаёт готовые файлы, а единственная постоянная прикладная нагрузка —
Nginx. Четыре virtual host не означают четыре отдельных процесса Nginx.

При этом запас ресурсов нельзя считать гарантированным:

- VDSina прямо продаёт сочетание 1 core / 1 ГБ / 10 ГБ / 1 ТБ и предлагает на
  стандартных VDS готовый образ Ubuntu 26.04
  ([тарифы VDSina](https://vdsina.ru/pricing/standard));
- release notes Ubuntu 26.04 называют для Ubuntu Server стартовую конфигурацию от
  1,5 ГБ RAM и 4 ГБ storage. Текущий VDS ниже указанной стартовой точки по RAM
  ([Ubuntu 26.04 LTS release notes](https://documentation.ubuntu.com/release-notes/26.04/));
- Ubuntu 26.04 LTS получает обычные security updates и critical fixes до апреля
  2031 года
  ([Ubuntu 26.04 LTS release notes](https://documentation.ubuntu.com/release-notes/26.04/)).

Поэтому решение — не покупать второй сервер заранее, а:

1. проверить фактическую разметку, свободный диск и память;
2. добавить 1 ГБ swap только если после обновления ОС остаётся не менее 3 ГБ
   свободного места;
3. установить только необходимый набор сервисов;
4. ограничить рост журналов;
5. в первые недели проверять ресурсы после каждого deploy и затем еженедельно;
6. при достижении измеримых порогов сначала перейти на тариф 2 ГБ / 50 ГБ, а не
   делить четыре статических сайта между двумя VDS.

Второй VDS нужен не для текущей ёмкости, а если позднее потребуется изоляция отказов
или разные административные границы. Это отдельное решение и сейчас не требуется.

## Факты о VDSina, влияющие на план

### Тариф и трафик

На актуальной странице standard VDS тариф 5 ₽/день содержит 1 core, 1 ГБ RAM,
10 ГБ storage и 1 ТБ трафика. Трафик считается за календарный месяц; для этого
тарифа указана стоимость превышения 200 ₽ за 1 ТБ. Порт — до 1 Гбит/с
([VDSina: standard VDS](https://vdsina.ru/pricing/standard)).

Для четырёх малопосещаемых статических сайтов 1 ТБ — большой начальный лимит, но это
не безлимит. Измерять нужно не только число запросов, а фактический egress в панели
VDSina: большие изображения, видео и source maps могут израсходовать трафик независимо
от загрузки CPU.

### Первоначальный и аварийный доступ

VDSina сообщает данные доступа после активации на email учётной записи и позволяет
поменять root-пароль
([VDSina: как узнать пароль от сервера](https://vdsina.ru/qa/q/kak-uznat-parol-ot-moego-vds)).
Для recovery доступна VNC-консоль из вкладки «Доступ» в панели сервера
([VDSina: подключение через VNC](https://vdsina.ru/qa/q/kak-podklyuchitsya-k-vds-cherez-vnc)).

Практическое следствие: начальный root-доступ нужен только для bootstrap. До запрета
root SSH следует создать и проверить `admin` и `deploy` в отдельных сессиях. VNC
нужно заранее найти в панели и считать аварийным каналом на случай ошибочной настройки
SSH или UFW.

### Upgrade и диск

VDSina разрешает сменить тариф в панели. Переход вызывает автоматическую
перезагрузку; размер виртуального диска при upgrade увеличивается, но раздел или
логический том внутри ОС нужно расширить отдельно. Переход с большего тарифа обратно
на меньший невозможен
([VDSina: смена тарифа](https://vdsina.ru/qa/q/kak-izmenit-tarif-vds)).

Перед расширением VDSina настоятельно рекомендует сделать резервную копию. Для
простого Linux layout провайдер описывает `growpart` и последующее `resize2fs`, но
пример использует конкретные `/dev/vda` и ext-файловую систему
([VDSina: расширение диска](https://vdsina.ru/qa/q/kak-rasshirit-diskovoe-prostranstvo-posle-smeny-tarifa)).
Снимок создаётся как отдельная оплачиваемая услуга в разделе «Резервная копия»
([VDSina: snapshot сервера](https://vdsina.ru/qa/q/kak-sdelat-bekap-vds-servera)).

Нельзя слепо копировать имена устройств из инструкции. Перед будущим upgrade нужно
сохранить вывод `lsblk -f`, `findmnt /` и `df -hT /`:

- простой ext4-раздел: после snapshot использовать `growpart` для фактического
  устройства и `resize2fs`;
- LVM: расширить нужный logical volume через `lvextend --resizefs`; Ubuntu
  документирует этот путь отдельно
  ([Ubuntu: управление LVM](https://documentation.ubuntu.com/server/how-to/storage/manage-logical-volumes/index.html));
- другая файловая система: использовать её штатный инструмент, а не `resize2fs`.

## Точный bootstrap baseline

Ниже — порядок настройки. Он сохраняет согласованные решения: парольный SSH остаётся
для `admin`, root SSH запрещается, `deploy` работает только по общему CI-ключу и не
получает `sudo`.

### 1. Зафиксировать исходное состояние

После первого входа, до установки пакетов:

```bash
cat /etc/os-release
uname -a
lsblk -f
findmnt /
df -hT
free -h
swapon --show
ip -brief address
systemctl --failed
```

Критерии продолжения:

- `/etc/os-release` подтверждает Ubuntu 26.04 LTS;
- root filesystem не read-only и не заполнена;
- известны тип файловой системы и фактическое устройство;
- после обновления пакетов остаётся минимум 3 ГБ свободного места перед созданием
  swap. Если меньше — сначала выяснить расход через `du`/журналы либо перейти на
  2 ГБ / 50 ГБ: создавать swap и оставлять системе менее 2 ГБ operational headroom
  не следует.

### 2. Обновить ОС и поставить минимальные пакеты

```bash
apt update
apt full-upgrade
apt install nginx ufw fail2ban unattended-upgrades rsync
```

Ubuntu устанавливает Nginx из archive через `apt`; пакет запускает сервис, а состояние
проверяется через `systemctl`
([Ubuntu: установка Nginx](https://documentation.ubuntu.com/server/how-to/web-services/install-nginx/)).
Для Ubuntu 26.04 пакет `nginx-common` уже содержит `/etc/logrotate.d/nginx`,
systemd unit и UFW application profile
([Ubuntu package file list: nginx-common](https://packages.ubuntu.com/resolute-updates/all/nginx-common/filelist)).
Отдельный Node.js runtime на VDS не устанавливается.

После установки:

```bash
nginx -t
systemctl is-enabled nginx
systemctl is-active nginx
systemctl --failed
test -f /var/run/reboot-required && cat /var/run/reboot-required.pkgs
```

Если обновление требует reboot, выполнить его вручную в согласованное окно и повторить
проверки. Автоматический reboot ниже остаётся выключенным.

### 3. Создать `admin` и `deploy`

```bash
adduser admin
adduser admin sudo
adduser --disabled-password --gecos "" deploy
```

Ubuntu рекомендует `adduser`; членство в группе `sudo` даёт административные права
([Ubuntu: управление пользователями](https://documentation.ubuntu.com/server/how-to/security/user-management/)).
В Ubuntu 26.04 команда `sudo` по умолчанию предоставляется реализацией `sudo-rs`, но
обычный сценарий с группой `sudo` сохраняется в официальной документации.

В `/home/deploy/.ssh/authorized_keys` помещается только согласованный общий публичный
CI-ключ. Приватный ключ на VDS не копируется. Проверить владельца и права:

```bash
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
id admin
id deploy
```

Каталоги всех четырёх сайтов создаются отдельно. Их точные имена должен закрепить
server-layout ticket; принцип прав:

- владелец deployment-каталога — `deploy`;
- Nginx (`www-data`) имеет только чтение и traversal;
- `deploy` не входит в `sudo` и не владеет `/etc/nginx`, сертификатами или системными
  unit-файлами;
- один общий ключ осознанно может менять все четыре каталога, но не настройки хоста.

### 4. Настроить SSH без потери доступа

Ubuntu рекомендует держать свои изменения в `/etc/ssh/sshd_config.d/`, проверять
конфигурацию через `sshd -t` до restart и отдельно предупреждает о риске заблокировать
единственный удалённый доступ
([Ubuntu: OpenSSH server](https://documentation.ubuntu.com/server/how-to/security/openssh-server/)).

Минимальная политика:

```text
PermitRootLogin no
PasswordAuthentication yes
PubkeyAuthentication yes
AllowUsers admin deploy

Match User deploy
    PasswordAuthentication no
    KbdInteractiveAuthentication no
    AllowAgentForwarding no
    AllowTcpForwarding no
    X11Forwarding no
    PermitTunnel no
```

Порядок применения:

1. не закрывать текущую root-сессию;
2. выполнить `sshd -t`;
3. проверить эффективные значения через `sshd -T`;
4. в новой сессии войти как `admin` по паролю и подтвердить `sudo`;
5. в другой новой сессии войти как `deploy` по ключу и подтвердить, что
   `sudo -n true` завершается ошибкой;
6. только после обеих проверок выполнить `systemctl restart ssh.service`;
7. проверить новый вход повторно.

`PermitRootLogin no` запрещает прямой SSH root. Парольная аутентификация остаётся
доступна для `admin`; у `deploy` пароль отключён и разрешён CI-ключ.

### 5. Добавить swap 1 ГБ

Сначала повторно проверить `swapon --show`. Если образ уже имеет не менее 1 ГБ
активного swap, второй файл не создавать. Если swap отсутствует и после обновления
свободно не менее 3 ГБ:

```bash
dd if=/dev/zero of=/swapfile bs=1M count=1024 status=progress
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

Затем один раз добавить в `/etc/fstab`:

```text
/swapfile none swap sw 0 0
```

и проверить:

```bash
findmnt --verify
swapon --show
free -h
```

`swapon` учитывает swap entries из `/etc/fstab`; его manpage предупреждает, что
наиболее переносимый способ создать swapfile — записать его через `dd`, поскольку
файлы с holes могут быть отвергнуты
([Ubuntu manpage: swapon](https://manpages.ubuntu.com/manpages/noble/man8/swapon.8.html)).

`vm.swappiness` заранее не менять. Документация ядра прямо указывает, что оптимальное
значение зависит от workload и требует эксперимента; default равен 60
([Linux kernel: swappiness](https://docs.kernel.org/admin-guide/sysctl/vm.html)).
Swap здесь — страховка от краткого memory spike, а не замена RAM. Постоянное активное
использование swap является сигналом upgrade.

### 6. Включить UFW в безопасном порядке

Ubuntu называет `ufw` штатным firewall tool и указывает, что изначально он выключен
([Ubuntu: firewall](https://documentation.ubuntu.com/server/how-to/security/firewalls/)).

До `ufw enable` сначала открыть SSH:

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status verbose
```

Проверить новую SSH-сессию, HTTP и HTTPS снаружи. Оставлять порт 80 открытым нужно не
только для redirect: HTTP-01 challenge Let's Encrypt выполняется только на порту 80
([Let's Encrypt: challenge types](https://letsencrypt.org/docs/challenge-types/)).

### 7. Включить Fail2ban только для SSH

Fail2ban ограничивает повторные ошибки аутентификации, но не устраняет риск слабого
пароля — это явно указано в manpage Ubuntu
([Ubuntu manpage: fail2ban](https://manpages.ubuntu.com/manpages/resolute/man1/fail2ban.1.html)).
Поскольку парольный вход `admin` сознательно оставлен, пароль должен быть длинным и
уникальным, а SSH jail — активным.

Создать локальный override, не редактируя пакетный `jail.conf`:

```ini
[sshd]
enabled = true
backend = systemd
banaction = ufw
port = ssh
findtime = 10m
maxretry = 5
bantime = 1h
```

Значения `5 попыток / 10 минут / 1 час` — рекомендуемая стартовая политика этого
проекта, а не обязательные defaults Fail2ban. В Ubuntu 26.04 пакет содержит SSH filter,
systemd backend и готовое действие UFW
([Ubuntu package file list: fail2ban](https://packages.ubuntu.com/resolute/all/fail2ban/filelist)).

Проверка:

```bash
fail2ban-client -t
systemctl enable --now fail2ban
fail2ban-client status
fail2ban-client status sshd
```

Не включать nginx jails «на всякий случай»: сайты не имеют HTTP-аутентификации, а
непроверенный filter может банить легитимные запросы. Fail2ban нужен здесь для
реальной поверхности атаки — парольного SSH.

### 8. Настроить security updates без автоматической перезагрузки

Ubuntu 26.04 устанавливает `unattended-upgrades` по умолчанию; security updates
применяются ежедневно. Управляют этим `/etc/apt/apt.conf.d/20auto-upgrades` и
`50unattended-upgrades`, журналы находятся в `/var/log/unattended-upgrades`
([Ubuntu: automatic updates](https://documentation.ubuntu.com/server/how-to/software/automatic-updates/)).

Проверить, что включены:

```text
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
```

В отдельном drop-in явно оставить:

```text
Unattended-Upgrade::Automatic-Reboot "false";
```

Это совпадает с default Ubuntu, но явный проектный override защищает выбранную политику.
Официальная документация подтверждает, что default автоматического reboot — `false`.

Проверка:

```bash
systemctl list-timers 'apt-*'
unattended-upgrade --dry-run --debug
```

Наличие `/var/run/reboot-required` проверяется во время еженедельного обслуживания;
перезагрузка выполняется вручную после smoke-check сайтов.

### 9. Ограничить рост журналов на диске 10 ГБ

`nginx-common`, `ufw` и `fail2ban` уже устанавливают собственные файлы в
`/etc/logrotate.d/`; это нужно проверить, а не создавать параллельные правила.
Nginx при ротации должен переоткрывать log files по `USR1`; это штатный upstream
механизм
([Nginx: rotating log-files](https://nginx.org/en/docs/control.html)).

Проверки:

```bash
ls -l /etc/logrotate.d/nginx /etc/logrotate.d/ufw /etc/logrotate.d/fail2ban
systemctl status logrotate.timer
logrotate --debug /etc/logrotate.conf
journalctl --disk-usage
```

Для маленького root disk стоит добавить journald drop-in:

```ini
[Journal]
SystemMaxUse=200M
SystemKeepFree=2G
```

`SystemMaxUse` ограничивает journal, а `SystemKeepFree` сохраняет свободное место;
journald применяет более строгий из этих лимитов
([systemd: journald.conf](https://www.freedesktop.org/software/systemd/man/252/journald.conf.html)).
200 МБ — проектный предел для этого малонагруженного VDS, не default systemd.

После изменения:

```bash
systemctl restart systemd-journald
journalctl --disk-usage
```

### 10. Установить Certbot, но выпускать сертификаты только после DNS

Официальные инструкции Certbot рекомендуют snap для Nginx:

```bash
snap install certbot --classic
ln -s /snap/bin/certbot /usr/local/bin/certbot
```

После того как Cloudflare `DNS only` записи указывают на VDS, HTTP virtual hosts
работают на порту 80 и домены резолвятся извне, сертификаты можно получить через
`certbot --nginx`. Автоматическое renewal устанавливается вместе с Certbot; его нужно
проверить командой:

```bash
certbot renew --dry-run
systemctl list-timers | grep -i certbot
```

Источник: [Certbot: Nginx on Linux (snap)](https://certbot.eff.org/instructions?os=snap&tab=standard&ws=nginx).
Точные certificate groups, canonical redirects и порядок DNS описывает отдельное
исследование доменов; здесь важно только не запускать Certbot до публичной
доступности HTTP virtual host.

## Verification checklist после bootstrap

Baseline считается завершённым, когда одновременно выполняются проверки:

```bash
sshd -t
nginx -t
ufw status verbose
fail2ban-client status sshd
systemctl is-active ssh nginx ufw fail2ban
systemctl is-enabled ssh nginx ufw fail2ban
systemctl --failed
free -h
swapon --show
df -hT /
journalctl --disk-usage
```

И подтверждено снаружи:

- `admin` входит по паролю и может использовать `sudo`;
- `deploy` входит общим CI-ключом, но не имеет `sudo`;
- root по SSH не входит;
- открыты только публично нужные TCP `22`, `80`, `443`;
- после появления DNS HTTP virtual hosts доступны по ожидаемому Host header;
- после выпуска TLS `certbot renew --dry-run` успешен;
- VNC recovery найден в панели VDSina.

## Измеримые пороги масштабирования

Ни Ubuntu, ни Nginx, ни VDSina не публикуют универсальный порог «сколько статических
сайтов помещается в 1 ГБ». Ниже — operational guardrails именно для этого проекта.
Они отделяют разовый шум от устойчивой нехватки ресурса.

### Диск

- **Предупреждение:** root filesystem занята на 70% или свободно менее 2 ГБ.
  Определить источник через `du`, `journalctl --disk-usage`, Nginx logs и apt cache.
- **Upgrade на 50 ГБ:** после безопасной очистки занято не менее 80% либо свободно
  менее 1,5 ГБ; также upgrade делается до следующего deploy, если новый artifact
  оставит менее 2 ГБ.
- Любой неожиданный рост более чем на 500 МБ за неделю требует найти источник, а не
  просто увеличить диск.

Главный вероятный лимит тарифа — именно 10 ГБ: 1 ГБ swap занимает 10% всего
виртуального диска, а ОС, package cache и логи обычно тяжелее самих статических
сборок.

### Память и swap

- **Предупреждение:** `MemAvailable` ниже 200 MiB и swap используется более чем на
  256 MiB в трёх последовательных проверках вне package upgrade.
- **Upgrade на 2 ГБ:** любое событие OOM-killer; либо swap устойчиво выше 512 MiB;
  либо обычный HTTP-трафик вызывает постоянный swap-in/swap-out и заметную задержку.
- Разовый swap во время `apt full-upgrade` не является достаточным основанием, если
  после завершения система возвращается к норме.

Проверка OOM:

```bash
journalctl -k --since '7 days ago' | grep -Ei 'out of memory|oom-killer|killed process'
```

### CPU и responsiveness

- **Предупреждение:** 15-minute load average устойчиво выше `0.7` на одном vCPU в
  обычном режиме, не во время обновления пакетов.
- **Upgrade/расследование:** load average выше `1.0` в течение 15 минут вместе с
  ростом latency или timeout. Сначала выяснить, Nginx ли это, I/O от swap, бот-трафик
  или посторонний процесс.

Само по себе краткое значение load выше 1 не требует upgrade.

### Трафик

- **Предупреждение:** использовано 70% месячного 1 ТБ до последней недели месяца.
- **Upgrade или оптимизация assets:** прогноз превышает 80–90% лимита. До смены
  тарифа проверить крупные assets, cache headers и случайную публикацию source maps.

### Доступность и операционная сложность

Ресурсный upgrade не исправляет повторяющиеся ошибки конфигурации или deploy.
Отдельный сервер рассматривается только если нужны fault isolation, разные владельцы
или независимые maintenance windows. Для простого дефицита RAM/disk переход на
1 core / 2 ГБ / 50 ГБ дешевле и проще эксплуатации двух одинаковых VDS.

## Режим наблюдения без новой monitoring-платформы

Постоянная observability находится вне scope карты. Для MVP достаточно сохранить
результаты этих команд:

```bash
uptime
free -h
swapon --show
df -hT /
journalctl --disk-usage
systemctl --failed
fail2ban-client status sshd
```

Периодичность:

- до bootstrap и после него;
- после каждого из первых четырёх deploy;
- ежедневно первую неделю после cutover;
- затем еженедельно и перед upgrade ОС/тарифа.

Дополнительно раз в неделю проверить `reboot-required`, размер `/var/log/nginx`,
последние ошибки Nginx и месячный трафик в панели VDSina.

## Итоговое решение по ticket

Принять один уже созданный VDS 1 vCPU / 1 ГБ / 10 ГБ как MVP production host для
четырёх статических сайтов с указанным baseline. Это контролируемое исключение из
стартовой рекомендации Ubuntu 26.04 по RAM, а не доказательство, что ресурсный запас
неограничен.

Первый путь масштабирования — один тариф 1 core / 2 ГБ / 50 ГБ после измеренного
срабатывания порогов. Перед сменой тарифа сделать snapshot; после автоматического
увеличения виртуального диска проверить layout и расширить раздел/filesystem штатным
для него способом. Понижение тарифа обратно VDSina не поддерживает.

