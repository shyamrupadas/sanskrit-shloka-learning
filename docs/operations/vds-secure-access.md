# Безопасный административный и automation-доступ к VDS

Runbook описывает полный bootstrap нового VDS с нуля:

- первоначальный вход выполняется по выданному VDSina паролю `root`;
- на ноутбуке создаётся общий CI-ключ;
- на VDS создаются `admin` с паролем и `sudo` и `deploy` без пароля и `sudo`;
- прямой SSH-вход `root` запрещается только после проверки новых учётных записей;
- `deploy` ограничивается key-only доступом без forwarding, tunnels и TTY.

Все рабочие команды выполняются из терминала ноутбука. VNC используется только как
независимый канал сверки SSH host key и как аварийный способ восстановления доступа.

IP-адрес, пароли, private/public keys, host-key fingerprint и строка `known_hosts`
не должны попадать в repository, ticket, commit, screenshot или отчёт.

## Что понадобится

До начала получи в VDSina:

- IPv4-адрес нового VDS;
- первоначальный пароль `root`;
- возможность открыть VNC для этого VDS.

Никаких заранее созданных `admin`, `deploy` или SSH-ключей не требуется.

Используй три окна терминала ноутбука:

1. `ROOT` — первоначальная SSH-сессия, которую нельзя закрывать до конца настройки;
2. `ADMIN` — отдельная проверка входа `admin`;
3. `DEPLOY` — отдельные проверки CI-ключа и ограничений `deploy`.

Команды с пометкой «на ноутбуке» выполняются локально. Команды с пометкой
«в окне `ROOT`» выполняются внутри SSH-сессии на VDS.

## 1. Подготовить каталог и переменные на ноутбуке

Текущий каталог терминала не имеет значения: все файлы создаются по абсолютным
путям внутри `~/.ssh/shlokahub-vds`.

На ноутбуке:

```bash
mkdir -p "$HOME/.ssh/shlokahub-vds"
chmod 700 "$HOME/.ssh/shlokahub-vds"

export VDS_HOST='<IPv4 нового VDS>'
export SSH_KNOWN_HOSTS_FILE="$HOME/.ssh/shlokahub-vds/known_hosts"
export DEPLOY_KEY_FILE="$HOME/.ssh/shlokahub-vds/deploy_ed25519"
```

Значение `VDS_HOST` не сохраняй в repository. Эти три `export` нужно повторять в
каждом новом локальном окне терминала.

## 2. Создать CI-ключ `deploy` на ноутбуке

Проверь, что выбранный путь ещё не занят:

```bash
test ! -e "$DEPLOY_KEY_FILE"
test ! -e "$DEPLOY_KEY_FILE.pub"
```

Обе команды должны завершиться без вывода. Затем создай Ed25519-пару:

```bash
ssh-keygen \
  -t ed25519 \
  -f "$DEPLOY_KEY_FILE" \
  -C "shlokahub-ci-deploy" \
  -N ""
```

Пустой passphrase выбран намеренно: GitHub Actions должен использовать ключ без
интерактивного ввода. Private key защищается GitHub Secret и правами локального
файла.

Проверь созданные файлы:

```bash
chmod 600 "$DEPLOY_KEY_FILE"
chmod 644 "$DEPLOY_KEY_FILE.pub"

ls -l "$DEPLOY_KEY_FILE" "$DEPLOY_KEY_FILE.pub"
ssh-keygen -lf "$DEPLOY_KEY_FILE.pub"
```

Назначение файлов:

- `$DEPLOY_KEY_FILE` — private key, будущий GitHub Secret `SSH_PRIVATE_KEY`;
- `$DEPLOY_KEY_FILE.pub` — public key, который будет установлен пользователю
  `deploy` на VDS.

Private key нельзя копировать на VDS или выводить через `cat`.

## 3. Получить и независимо сверить SSH host key

Сначала через панель VDSina открой VNC и убедись, что recovery console доступна.
Рабочую настройку через неё выполнять не нужно.

В VNC получи fingerprint серверного Ed25519 host key:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

На ноутбуке получи публичный host key:

```bash
umask 077

ssh-keyscan \
  -T 10 \
  -t ed25519 \
  "$VDS_HOST" \
  > "$SSH_KNOWN_HOSTS_FILE"

test -s "$SSH_KNOWN_HOSTS_FILE"
chmod 600 "$SSH_KNOWN_HOSTS_FILE"
ssh-keygen -lf "$SSH_KNOWN_HOSTS_FILE"
```

Fingerprint на ноутбуке должен в точности совпасть с fingerprint в VNC. При
несовпадении не подключайся по SSH и выясни причину.

`ssh-keyscan` сам по себе не подтверждает подлинность ключа: доверие появляется
только после независимого сравнения fingerprints. Непроверенный runtime
`ssh-keyscan` в GitHub Actions запрещён.

## 4. Первый вход `root` с ноутбука

В первом локальном окне открой сессию `ROOT`:

```bash
ssh \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" \
  -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password \
  "root@$VDS_HOST"
```

Введи первоначальный пароль `root`, выданный VDSina. Не закрывай эту сессию до
завершения всех проверок и не выполняй hardening, пока `admin` и `deploy` не
проверены в отдельных новых соединениях.

## 5. Проверить исходное состояние VDS

В окне `ROOT`, до любых изменений:

```bash
cat /etc/os-release
uname -a
findmnt -no TARGET,SOURCE,FSTYPE,OPTIONS /
df -hT /
free -h
swapon --show
systemctl --failed
```

Зафиксируй вне repository:

- фактический Ubuntu release;
- свободное место на `/`;
- `MemAvailable`;
- наличие активного swap;
- результат открытия recovery/VNC.

Остановись, если установлен не ожидаемый Ubuntu release, root filesystem read-only
или заполнена, есть неизвестные failed units либо recovery console недоступна. Swap
на этом этапе только проверяется; его настройка относится к отдельному
security/resource baseline.

## 6. Создать `admin`

В окне `ROOT`:

```bash
adduser admin
usermod -aG sudo admin

id admin
getent group sudo
```

`adduser` попросит:

1. дважды ввести новый длинный уникальный пароль `admin`;
2. заполнить имя и остальные необязательные поля — их можно пропустить Enter;
3. подтвердить создание через `Y`.

Храни пароль `admin` в password manager. Не используй пароль `root`, не передавай
пароль аргументом команды и не вставляй его в shell history.

### Проверить `admin` до запрета root

В новом окне `ADMIN` на ноутбуке повтори переменные:

```bash
export VDS_HOST='<IPv4 нового VDS>'
export SSH_KNOWN_HOSTS_FILE="$HOME/.ssh/shlokahub-vds/known_hosts"
```

Открой отдельное парольное соединение:

```bash
ssh \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" \
  -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password \
  "admin@$VDS_HOST"
```

Внутри `ADMIN`:

```bash
id
sudo -v
sudo id -u
```

Последняя команда должна вывести `0`. Оставь эту сессию открытой. Не продолжай,
если отдельный парольный вход или `sudo` не работают.

## 7. Создать `deploy`

В окне `ROOT`:

```bash
adduser --disabled-password --gecos "" deploy
passwd -l deploy

install -d \
  -o deploy \
  -g deploy \
  -m 700 \
  /home/deploy/.ssh

install \
  -o deploy \
  -g deploy \
  -m 600 \
  /dev/null \
  /home/deploy/.ssh/authorized_keys
```

Теперь передай созданный на ноутбуке public key. В новом окне `DEPLOY` повтори
переменные:

```bash
export VDS_HOST='<IPv4 нового VDS>'
export SSH_KNOWN_HOSTS_FILE="$HOME/.ssh/shlokahub-vds/known_hosts"
export DEPLOY_KEY_FILE="$HOME/.ssh/shlokahub-vds/deploy_ed25519"
```

Из окна `DEPLOY` на ноутбуке выполни:

```bash
ssh \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" \
  -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password \
  "root@$VDS_HOST" \
  'cat > /home/deploy/.ssh/authorized_keys &&
   chown deploy:deploy /home/deploy/.ssh/authorized_keys &&
   chmod 600 /home/deploy/.ssh/authorized_keys' \
  < "$DEPLOY_KEY_FILE.pub"
```

Введи первоначальный пароль `root`. Команда передаёт только public key; private key
остаётся на ноутбуке.

В окне `ROOT` проверь результат:

```bash
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

wc -l /home/deploy/.ssh/authorized_keys
ssh-keygen -lf /home/deploy/.ssh/authorized_keys
passwd -S deploy
id deploy
sudo -l -U deploy
```

Ожидается:

- `authorized_keys` содержит ровно одну строку;
- `passwd -S deploy` показывает locked password;
- `id deploy` не содержит группу `sudo`;
- `sudo -l -U deploy` сообщает, что пользователь не может выполнять команды через
  `sudo`.

Не продолжай, если `sudo -l -U deploy` перечисляет хотя бы одно разрешение.

### Проверить key-only вход `deploy`

В окне `DEPLOY` на ноутбуке:

```bash
ssh \
  -i "$DEPLOY_KEY_FILE" \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" \
  -o BatchMode=yes \
  -o IdentitiesOnly=yes \
  -o PreferredAuthentications=publickey \
  "deploy@$VDS_HOST" \
  'id &&
   if sudo -n true 2>/dev/null; then
     echo "FAIL: deploy has sudo"
     exit 1
   else
     echo "PASS: deploy has no sudo"
   fi'
```

Ожидаются пользователь `deploy` и `PASS: deploy has no sudo`.

## 8. Создать SSH policy

В окне `ROOT` сохрани резервную копию:

```bash
cp -a \
  /etc/ssh/sshd_config \
  /etc/ssh/sshd_config.before-shlokahub
```

Открой новый drop-in:

```bash
nano /etc/ssh/sshd_config.d/00-shlokahub-access.conf
```

Вставь в `nano` только следующий текст — без строк `cat`, `EOF` и без Markdown
backticks:

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

Сохрани файл через `Ctrl+O`, нажми Enter, затем закрой `nano` через `Ctrl+X`.

Установи права и проверь содержимое:

```bash
chmod 600 /etc/ssh/sshd_config.d/00-shlokahub-access.conf
cat /etc/ssh/sshd_config.d/00-shlokahub-access.conf
```

Префикс `00-` важен: Ubuntu читает drop-ins в начале основной конфигурации, а
OpenSSH использует первое найденное значение большинства директив. `Match all`
завершает user-specific block.

## 9. Проверить policy до restart

В окне `ROOT`:

```bash
sshd -t
```

Успешная команда ничего не выводит и возвращает обычное приглашение shell. При любой
ошибке не перезапускай SSH.

Проверь общие effective values:

```bash
sshd -T |
  grep -E '^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication|pubkeyauthentication|allowusers) '
```

Ожидается:

```text
permitrootlogin no
passwordauthentication yes
kbdinteractiveauthentication no
pubkeyauthentication yes
allowusers admin deploy
```

Проверь effective values для `deploy`:

```bash
sshd -T -C user=deploy,host=localhost,addr=127.0.0.1 |
  grep -E '^(authenticationmethods|passwordauthentication|kbdinteractiveauthentication|disableforwarding|permittunnel|permittty) '
```

Ожидается:

```text
authenticationmethods publickey
passwordauthentication no
kbdinteractiveauthentication no
disableforwarding yes
permittunnel no
permittty no
```

Если хотя бы одно значение отличается, не применяй конфигурацию. Исправь
конфликтующий drop-in и снова выполни `sshd -t` и `sshd -T`.

## 10. Применить policy

Не закрывай уже открытые сессии `ROOT` и `ADMIN`.

В окне `ROOT`:

```bash
systemctl restart ssh.service
systemctl is-active ssh.service
sshd -t
```

Ожидается `active`, а `sshd -t` не должен ничего вывести.

## 11. Проверить новые подключения после restart

Проверяй именно новые соединения, а не уже открытые сессии.

### Новый вход `admin`

На ноутбуке:

```bash
ssh \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" \
  -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password \
  "admin@$VDS_HOST"
```

Внутри новой сессии:

```bash
sudo -v
sudo id -u
```

Последняя команда должна вывести `0`.

### Новый key-only вход `deploy`

На ноутбуке:

```bash
ssh \
  -i "$DEPLOY_KEY_FILE" \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" \
  -o BatchMode=yes \
  -o IdentitiesOnly=yes \
  "deploy@$VDS_HOST" \
  'test "$(id -un)" = deploy &&
   if sudo -n true 2>/dev/null; then exit 1; else echo PASS; fi'
```

Ожидается `PASS`.

### Парольный и interactive вход `deploy` запрещены

На ноутбуке:

```bash
ssh \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" \
  -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password,keyboard-interactive \
  "deploy@$VDS_HOST"
```

Ожидается `Permission denied` без входа в shell.

### Forwarding `deploy` запрещён

На ноутбуке:

```bash
ssh \
  -i "$DEPLOY_KEY_FILE" \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" \
  -o BatchMode=yes \
  -o IdentitiesOnly=yes \
  -o ExitOnForwardFailure=yes \
  -W 127.0.0.1:22 \
  "deploy@$VDS_HOST" \
  < /dev/null
```

Ожидается отказ вроде `administratively prohibited`.

### Новый прямой вход `root` запрещён

На ноутбуке:

```bash
ssh \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" \
  -o PubkeyAuthentication=no \
  -o PreferredAuthentications=password \
  -o NumberOfPasswordPrompts=1 \
  "root@$VDS_HOST"
```

Введи правильный первоначальный пароль `root` один раз. Ожидается
`Permission denied`. Если root shell открылся, выполни `exit`: hardening не
сработал, и старую сессию `ROOT` закрывать нельзя.

### Повторно проверить отсутствие `sudo`

В оставшемся окне `ROOT`:

```bash
sudo -l -U deploy
```

Команда не должна перечислять разрешённые `deploy` команды.

## 12. Подготовить GitHub Secrets

На ноутбуке уже находятся два необходимых значения:

- `SSH_PRIVATE_KEY` — содержимое `$DEPLOY_KEY_FILE`;
- `SSH_KNOWN_HOSTS` — содержимое `$SSH_KNOWN_HOSTS_FILE`.

На macOS их можно по очереди копировать в clipboard без вывода в терминал:

```bash
pbcopy < "$DEPLOY_KEY_FILE"
```

```bash
pbcopy < "$SSH_KNOWN_HOSTS_FILE"
```

Вставляй значения только в предназначенные GitHub Secrets. Не добавляй файлы в
repository и не печатай private key в terminal или CI logs.

## 13. Аварийный откат

Если после restart новые `admin` или `deploy` соединения не открываются, используй
всё ещё открытую сессию `ROOT`:

```bash
mv \
  /etc/ssh/sshd_config.d/00-shlokahub-access.conf \
  /root/00-shlokahub-access.conf.failed

sshd -t
systemctl restart ssh.service
systemctl is-active ssh.service
```

Если старая root-сессия тоже потеряна, восстановление выполняется через VNC. Поэтому
VNC не используется для обычной работы, но её доступность проверяется до hardening.

## 14. Безопасный отчёт

Не прикладывай command output целиком. Достаточно заполнить:

```text
Дата/время UTC:
Оператор:

[ ] VNC recovery доступна: PASS
[ ] Фактический Ubuntu release проверен
[ ] Свободные диск и память проверены
[ ] Активный swap проверен
[ ] Fingerprint VNC и SSH_KNOWN_HOSTS: MATCH
[ ] admin password SSH до hardening: PASS
[ ] admin sudo до hardening: PASS
[ ] deploy CI key-only до hardening: PASS
[ ] deploy password locked: PASS
[ ] deploy sudo permissions отсутствуют: PASS
[ ] sshd -t до restart: PASS
[ ] effective config: PASS
[ ] ssh.service после restart: active
[ ] новая admin password SSH-сессия и sudo: PASS
[ ] новая deploy CI key-only сессия: PASS
[ ] deploy password/interactive authentication: REJECTED
[ ] deploy forwarding/tunnels/TTY: REJECTED
[ ] новый root SSH login: REJECTED
[ ] StrictHostKeyChecking=yes с подготовленным known_hosts: PASS

Результат: PASS / FAIL
Безопасные замечания:
```

Тикет доступа переводится в `awaiting-human-review` только после всех `PASS`.

## Источники

- [VDSina: подключение через VNC](https://vdsina.ru/qa/q/kak-podklyuchitsya-k-vds-cherez-vnc)
- [Ubuntu Server: OpenSSH server](https://documentation.ubuntu.com/server/how-to/security/openssh-server/)
- [Ubuntu Server: управление пользователями](https://documentation.ubuntu.com/server/how-to/security/user-management/)
