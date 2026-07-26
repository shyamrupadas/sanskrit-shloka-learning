# Безопасный административный и automation-доступ к VDS

Runbook подготавливает две отдельные SSH-учётные записи:

- `admin` — ручное обслуживание по паролю с `sudo`;
- `deploy` — automation по общему CI-ключу, без пароля, `sudo`, forwarding,
  tunnels и TTY.

Прямой SSH-вход под `root` запрещается только после проверки `admin` и `deploy` в
отдельных сессиях. IP-адрес, пароли, private/public keys, host-key fingerprint и
строка `known_hosts` не должны попадать в repository, ticket, commit, shell history,
screenshot или отчёт.

## Перед началом

Понадобятся:

- действующий bootstrap-доступ `root` к новому VDS;
- доступ к панели VDSina и VNC-консоли;
- длинный уникальный пароль для `admin` из password manager;
- общая CI-пара Ed25519-ключей; private key остаётся только у оператора и в
  предназначенных GitHub Secrets;
- отдельные окна терминала для bootstrap-, `admin`- и `deploy`-сессий.

На рабочей станции задай только переменные текущей сессии. Не сохраняй реальные
значения в repository:

```bash
export VDS_HOST='<точный host, который будут использовать workflows>'
export BOOTSTRAP_KEY_FILE='<путь к действующему bootstrap private key>'
export CI_PRIVATE_KEY_FILE='<путь к общему CI private key>'
export CI_PUBLIC_KEY_FILE="${CI_PRIVATE_KEY_FILE}.pub"
```

Убедись, что public key соответствует private key, не выводя private key:

```bash
test -f "$BOOTSTRAP_KEY_FILE"
test -f "$CI_PRIVATE_KEY_FILE"
test -f "$CI_PUBLIC_KEY_FILE"
chmod 600 "$BOOTSTRAP_KEY_FILE" "$CI_PRIVATE_KEY_FILE"
ssh-keygen -y -f "$CI_PRIVATE_KEY_FILE" |
  diff - <(cut -d ' ' -f 1-2 "$CI_PUBLIC_KEY_FILE")
```

Пустой вывод `diff` и exit code `0` подтверждают пару.

## 1. Проверить recovery и исходное состояние

Не меняй сервер, пока этот раздел не завершён.

1. В VDSina открой нужный сервер, вкладку «Доступ» и VNC.
2. Подключись к консоли и убедись, что можешь войти и получить рабочий shell.
3. Оставь VNC и текущую bootstrap-сессию открытыми до завершения всей матрицы
   доступа.
4. В bootstrap-сессии выполни:

```bash
cat /etc/os-release
uname -a
findmnt -no TARGET,SOURCE,FSTYPE,OPTIONS /
df -hT /
free -h
swapon --show
systemctl --failed
```

Зафиксируй вне repository фактический Ubuntu release, свободное место,
`MemAvailable`, наличие swap и результат входа через VNC. Остановись, если:

- установлен не ожидаемый Ubuntu 26.04 LTS;
- root filesystem read-only или заполнена;
- есть неизвестные failed units;
- VNC-сессия не открывается или не позволяет восстановить управление.

Swap на этом этапе только проверяется; его настройка относится к отдельному
security/resource baseline.

## 2. Получить и сверить SSH host key

До первого нового SSH-входа получи host key через доверенную VNC-консоль:

```bash
cut -d ' ' -f 1-2 /etc/ssh/ssh_host_ed25519_key.pub
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

Первая команда выводит public key, вторая — fingerprint. Перенеси оба значения
через доверенный console channel, не через ещё не проверенное SSH-соединение. На
рабочей станции создай файл вне repository:

```bash
umask 077
export SSH_KNOWN_HOSTS_FILE='<защищённый путь вне repository>'

IFS= read -r SSH_HOST_PUBLIC_KEY
# Вставь точные два поля из первой VNC-команды и нажми Enter.

case "$SSH_HOST_PUBLIC_KEY" in
  ssh-ed25519\ *) ;;
  *)
    echo 'FAIL: expected one Ed25519 public host key' >&2
    unset SSH_HOST_PUBLIC_KEY
    exit 1
    ;;
esac

printf '%s %s\n' "$VDS_HOST" "$SSH_HOST_PUBLIC_KEY" > "$SSH_KNOWN_HOSTS_FILE"
unset SSH_HOST_PUBLIC_KEY
chmod 600 "$SSH_KNOWN_HOSTS_FILE"

ssh-keygen -lf "$SSH_KNOWN_HOSTS_FILE"
ssh-keygen -F "$VDS_HOST" -f "$SSH_KNOWN_HOSTS_FILE" >/dev/null &&
  echo 'known-host-entry-ok'
```

Fingerprint локального файла должен в точности совпасть с fingerprint из VNC.
При несовпадении не подключайся по SSH и выясни причину. Не заменяй этот шаг
непроверенным `ssh-keyscan`.

Все следующие SSH-команды используют точный `VDS_HOST`, подготовленный файл,
`StrictHostKeyChecking=yes` и не обновляют другой `known_hosts`.

## 3. Создать и проверить `admin`

В открытой bootstrap-сессии:

```bash
adduser admin
adduser admin sudo
id admin
getent group sudo
```

`adduser` запросит пароль интерактивно. Не передавай пароль аргументом команды и не
вставляй его в shell history.

До запрета root login открой новую локальную сессию и принудительно проверь именно
парольный вход:

```bash
ssh \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" \
  -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password \
  "admin@$VDS_HOST"
```

Внутри новой `admin`-сессии:

```bash
id
sudo -v
sudo id -u
```

Последняя команда должна вывести `0`. Не продолжай, если отдельный парольный вход
или `sudo` не работают.

## 4. Создать и проверить `deploy`

В bootstrap-сессии:

```bash
adduser --disabled-password --gecos "" deploy
passwd -l deploy
install -d -o deploy -g deploy -m 700 /home/deploy/.ssh
install -o deploy -g deploy -m 600 /dev/null /home/deploy/.ssh/authorized_keys
```

Открой `/home/deploy/.ssh/authorized_keys` редактором и вставь ровно одну строку —
содержимое согласованного общего `CI_PUBLIC_KEY_FILE`. Private key на VDS не
копируется.

После сохранения:

```bash
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
passwd -S deploy
id deploy
sudo -l -U deploy
if id -nG deploy | tr ' ' '\n' | grep -qx sudo; then
  echo 'FAIL: deploy belongs to sudo' >&2
  exit 1
fi
```

`passwd -S deploy` должен показывать locked password, а `sudo -l -U deploy` —
сообщать, что пользователь не может выполнять команды через `sudo`. Это
авторитетная проверка всех sudoers sources; не продолжай, если команда перечисляет
хотя бы одно разрешение. До изменения SSH-политики открой с рабочей станции
отдельную key-only сессию:

```bash
ssh \
  -i "$CI_PRIVATE_KEY_FILE" \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" \
  -o BatchMode=yes \
  -o IdentitiesOnly=yes \
  -o PreferredAuthentications=publickey \
  "deploy@$VDS_HOST" \
  'id && if sudo -n true 2>/dev/null; then exit 1; else echo no-sudo; fi'
```

Ожидаются пользователь `deploy` и строка `no-sudo`.

## 5. Подготовить SSH policy

В bootstrap-сессии сохрани резервную копию основной конфигурации:

```bash
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.before-shlokahub
chmod a-w /etc/ssh/sshd_config.before-shlokahub
```

Создай `/etc/ssh/sshd_config.d/00-shlokahub-access.conf` со следующим точным
содержимым:

```text
PermitRootLogin no
PasswordAuthentication yes
KbdInteractiveAuthentication no
PubkeyAuthentication yes
AllowUsers admin deploy

Match User deploy
    AuthenticationMethods publickey
    PasswordAuthentication no
    KbdInteractiveAuthentication no
    DisableForwarding yes
    PermitTunnel no
    PermitTTY no

Match all
```

Префикс `00-` важен: Ubuntu читает drop-ins в начале основной конфигурации, а
OpenSSH использует первое найденное значение большинства директив. `Match all`
завершает user-specific block и не позволяет ему затронуть следующие файлы.

До reload выполни синтаксическую и effective-config проверки:

```bash
sshd -t

sshd -T |
  grep -E '^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication|pubkeyauthentication|allowusers) '

sshd -T -C user=deploy,host=localhost,addr=127.0.0.1 |
  grep -E '^(authenticationmethods|passwordauthentication|kbdinteractiveauthentication|disableforwarding|permittunnel|permittty) '

sshd -T -C user=admin,host=localhost,addr=127.0.0.1 |
  grep -E '^(passwordauthentication|kbdinteractiveauthentication|pubkeyauthentication|permittty) '
```

Обязательные effective values:

```text
permitrootlogin no
passwordauthentication yes
kbdinteractiveauthentication no
pubkeyauthentication yes
allowusers admin deploy

authenticationmethods publickey
passwordauthentication no
kbdinteractiveauthentication no
disableforwarding yes
permittunnel no
permittty no
```

Если `sshd -t` или любое effective value не совпадает, не применяй конфигурацию.
Исправь конфликтующий drop-in, снова выполни проверки и оставь bootstrap/VNC
открытыми.

## 6. Применить policy и проверить матрицу доступа

Не закрывая bootstrap-, VNC- и уже проверенную `admin`-сессии:

```bash
systemctl restart ssh.service
systemctl is-active ssh.service
sshd -t
```

С рабочей станции выполни проверки в новых сессиях.

### `admin`: пароль и `sudo` работают

```bash
ssh \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" \
  -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password \
  "admin@$VDS_HOST"
```

Внутри:

```bash
sudo -v
sudo id -u
```

### `deploy`: работает только CI-ключ, `sudo` отсутствует

```bash
ssh \
  -i "$CI_PRIVATE_KEY_FILE" \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" \
  -o BatchMode=yes \
  -o IdentitiesOnly=yes \
  -o PreferredAuthentications=publickey \
  "deploy@$VDS_HOST" \
  'test "$(id -un)" = deploy &&
   test ! -t 0 &&
   if sudo -n true 2>/dev/null; then exit 1; else echo deploy-policy-ok; fi'
```

Проверка password/interactive authentication обязана завершиться отказом, в котором
сервер предлагает только `publickey`. Временный диагностический файл содержит host,
поэтому его нельзя прикладывать к отчёту:

```bash
export DEPLOY_AUTH_DIAGNOSTIC="$(mktemp)"

if LC_ALL=C ssh \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" \
  -o BatchMode=yes \
  -o PubkeyAuthentication=no \
  -o PasswordAuthentication=yes \
  -o KbdInteractiveAuthentication=yes \
  -o PreferredAuthentications=password,keyboard-interactive \
  "deploy@$VDS_HOST" true \
  2>"$DEPLOY_AUTH_DIAGNOSTIC"
then
  echo 'FAIL: deploy accepted interactive authentication' >&2
  rm -f "$DEPLOY_AUTH_DIAGNOSTIC"
  exit 1
elif grep -Eq 'Permission denied \(publickey\)\.$' "$DEPLOY_AUTH_DIAGNOSTIC"
then
  echo 'PASS: deploy server offered publickey only'
  rm -f "$DEPLOY_AUTH_DIAGNOSTIC"
else
  echo "FAIL: unexpected authentication result; inspect $DEPLOY_AUTH_DIAGNOSTIC securely" >&2
  exit 1
fi
```

Проверка TCP forwarding через direct stream обязана завершиться отказом:

```bash
if ssh \
  -i "$CI_PRIVATE_KEY_FILE" \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" \
  -o BatchMode=yes \
  -o IdentitiesOnly=yes \
  -o ExitOnForwardFailure=yes \
  -W 127.0.0.1:22 \
  "deploy@$VDS_HOST" \
  < /dev/null
then
  echo 'FAIL: deploy forwarding unexpectedly succeeded' >&2
  exit 1
else
  echo 'PASS: deploy forwarding rejected'
fi
```

### `root`: новый прямой вход запрещён

Проверяй только после успешных новых сессий `admin` и `deploy`:

```bash
if ssh \
  -i "$BOOTSTRAP_KEY_FILE" \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" \
  -o BatchMode=yes \
  -o IdentitiesOnly=yes \
  -o PreferredAuthentications=publickey \
  "root@$VDS_HOST" true
then
  echo 'FAIL: root login unexpectedly succeeded' >&2
  exit 1
else
  echo 'PASS: root login rejected'
fi
```

Текущая bootstrap-сессия может оставаться живой после restart; это не означает, что
новый root login разрешён.

После успешной матрицы ещё раз проверь key-only соединение с тем же закреплённым
host key:

```bash
ssh \
  -i "$CI_PRIVATE_KEY_FILE" \
  -o BatchMode=yes \
  -o IdentitiesOnly=yes \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" \
  "deploy@$VDS_HOST" true
```

Полное содержимое `SSH_KNOWN_HOSTS_FILE` позднее передаётся в GitHub Secret
`SSH_KNOWN_HOSTS`; его нельзя печатать в CI logs или добавлять в repository.

## 7. Аварийный откат

Если после restart новые `admin`- или `deploy`-сессии не открываются, используй
оставшуюся bootstrap-сессию либо VNC:

```bash
mv \
  /etc/ssh/sshd_config.d/00-shlokahub-access.conf \
  /root/00-shlokahub-access.conf.failed
sshd -t
systemctl restart ssh.service
systemctl is-active ssh.service
```

После восстановления доступа диагностируй effective config. Не включай root login
как постоянное исправление и не закрывай recovery-сессию до повторного успешного
прохождения всей матрицы.

## 8. Безопасный отчёт оператору

Не прикладывай command output целиком. Достаточно заполнить:

```text
Дата/время UTC:
Оператор:

[ ] VNC recovery login: PASS
[ ] Фактический Ubuntu release проверен
[ ] Свободные диск и память проверены
[ ] Активный swap проверен
[ ] admin password SSH до hardening: PASS
[ ] admin sudo до hardening: PASS
[ ] sshd -t до restart: PASS
[ ] effective config: PASS
[ ] ssh.service после restart: active
[ ] новая admin password SSH-сессия и sudo: PASS
[ ] deploy CI key-only: PASS
[ ] deploy password/interactive authentication: REJECTED
[ ] deploy sudo: REJECTED
[ ] deploy forwarding/tunnels/TTY: REJECTED
[ ] новый root SSH login: REJECTED
[ ] fingerprint VNC и SSH_KNOWN_HOSTS: MATCH
[ ] StrictHostKeyChecking=yes с подготовленным known_hosts: PASS

Результат: PASS / FAIL
Безопасные замечания:
```

Тикет доступа можно переводить в `awaiting-human-review` только после всех `PASS`.

## Источники

- [VDSina: подключение через VNC](https://vdsina.ru/qa/q/kak-podklyuchitsya-k-vds-cherez-vnc)
- [Ubuntu Server: OpenSSH server](https://documentation.ubuntu.com/server/how-to/security/openssh-server/)
- [Ubuntu Server: управление пользователями](https://documentation.ubuntu.com/server/how-to/security/user-management/)
