# Доверенные входы production-выпуска ShlokaHub application

Этот runbook подготавливает Repository Variables и Repository Secrets, которые
понадобятся будущему workflow выпуска ShlokaHub application. Все действия в GitHub
и проверки VDS выполняет владелец вручную. Сам application deploy здесь не
запускается.

Не записывай в repository, issue, commit message, Actions log или итоговый отчёт
фактический deployment host, private key, содержимое `known_hosts`, fingerprints
или значения Secrets. В отчёте допустимы только имена настроек и результаты
`PASS`/`FAIL`.

## Что должно получиться

В application repository должны существовать:

| Тип | Имя | Контракт |
| --- | --- | --- |
| Repository Variable | `DEPLOY_HOST` | Проверенный host/IP production VDS без схемы, username, пробелов и завершающего `/` |
| Repository Variable | `DEPLOY_USER` | Ровно `deploy` |
| Repository Variable | `VITE_API_BASE_URL` | Ровно `https://api.shlokahub.com` |
| Repository Secret | `SSH_PRIVATE_KEY` | Согласованный private key automation-пользователя |
| Repository Secret | `SSH_KNOWN_HOSTS` | Полная заранее проверенная строка `known_hosts` для точного `DEPLOY_HOST` |

`VITE_API_BASE_URL` публично встраивается в browser bundle и поэтому является
Variable, а не Secret. `SSH_PRIVATE_KEY` и `SSH_KNOWN_HOSTS` остаются Secrets.

## 1. Подтвердить внешнее предусловие

Не продолжай, пока спецификация общей платформы и её итоговая проверка не приняты
человеком. В текущем checkout это подтверждают строки `Accepted:` в файлах:

- [спецификация bootstrap](../../.scratch/production-platform-bootstrap/spec.md);
- [итоговая проверка платформы](../../.scratch/production-platform-bootstrap/issues/10-verify-production-platform-readiness.md).

Проверка локального состояния не раскрывает production-данные:

```bash
test -n "$(sed -n 's/^Accepted: //p' \
  .scratch/production-platform-bootstrap/spec.md)"
test -n "$(sed -n 's/^Accepted: //p' \
  .scratch/production-platform-bootstrap/issues/10-verify-production-platform-readiness.md)"
```

Принятый отчёт уже подтверждает application document root, DNS/TLS,
`api.shlokahub.com`, production CORS и automation account. Если после приёмки
менялись VDS, SSH host keys, DNS, TLS, API custom domain или CORS, остановись и
повтори соответствующие проверки:

- SSH host key — сначала
  [независимая сверка](vds-secure-access.md#3-получить-и-независимо-сверить-ssh-host-key),
  затем automation account —
  [новые подключения](vds-secure-access.md#11-проверить-новые-подключения-после-restart);
- document root и Nginx — [HTTP-платформа](vds-http-platform.md);
- DNS и TLS application —
  [статические домены](shlokahub-static-domains.md);
- API custom domain — [API domain](amvera-domain-cutover.md);
- production CORS —
  [Amvera production](amvera-production.md#проверка-production-cors).

После проверки заново зафиксируй безопасный итог и получи человеческую приёмку
затронутой части `production-platform-bootstrap` до продолжения этого runbook.

## 2. Подготовить доверенные локальные материалы

Используй private key и `known_hosts`, сохранённые во время принятого bootstrap.
Не создавай новую пару ключей и не заменяй host key только ради этого шага.

В отдельной локальной shell-сессии задай чувствительные значения через переменные,
не добавляя их в файлы проекта:

```bash
export SHLOKAHUB_DEPLOY_HOST='<production VDS host или IP>'
export SHLOKAHUB_DEPLOY_KEY_FILE="${HOME}/.ssh/shlokahub-vds/deploy_ed25519"
export SHLOKAHUB_KNOWN_HOSTS_FILE="${HOME}/.ssh/shlokahub-vds/known_hosts"

test -n "$SHLOKAHUB_DEPLOY_HOST"
test -s "$SHLOKAHUB_DEPLOY_KEY_FILE"
test -s "$SHLOKAHUB_KNOWN_HOSTS_FILE"
chmod 600 "$SHLOKAHUB_DEPLOY_KEY_FILE" "$SHLOKAHUB_KNOWN_HOSTS_FILE"
ssh-keygen -F "$SHLOKAHUB_DEPLOY_HOST" \
  -f "$SHLOKAHUB_KNOWN_HOSTS_FILE" |
  awk '$2 == "ssh-ed25519" { found = 1 } END { exit !found }'
```

Последняя команда должна найти запись для точного значения `DEPLOY_HOST`. Затем
сверь её fingerprint с fingerprint Ed25519 host key, независимо полученным через
доверенную VDS console:

```bash
ssh-keygen -F "$SHLOKAHUB_DEPLOY_HOST" \
  -f "$SHLOKAHUB_KNOWN_HOSTS_FILE" |
  awk '$2 == "ssh-ed25519"' |
  ssh-keygen -lf -
```

В административной VDS console:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

Если fingerprints не совпадают, остановись. Не обновляй GitHub Secret и не
используй результат непроверенного `ssh-keyscan`. Полная процедура сверки описана
в [runbook безопасного доступа](vds-secure-access.md#3-получить-и-независимо-сверить-ssh-host-key).

## 3. Проверить automation-доступ и границы прав

В доверенной административной VDS console сначала проверь effective SSH policy
для `deploy`:

```bash
SHLOKAHUB_DEPLOY_SSH_POLICY="$(
  sudo sshd -T -C user=deploy,host=localhost,addr=127.0.0.1
)"

test "$(printf '%s\n' "$SHLOKAHUB_DEPLOY_SSH_POLICY" |
  awk '$1 == "authenticationmethods" { print $2 }')" = publickey
test "$(printf '%s\n' "$SHLOKAHUB_DEPLOY_SSH_POLICY" |
  awk '$1 == "passwordauthentication" { print $2 }')" = no
test "$(printf '%s\n' "$SHLOKAHUB_DEPLOY_SSH_POLICY" |
  awk '$1 == "kbdinteractiveauthentication" { print $2 }')" = no
test "$(printf '%s\n' "$SHLOKAHUB_DEPLOY_SSH_POLICY" |
  awk '$1 == "pubkeyauthentication" { print $2 }')" = yes

printf 'PASS: deploy accepts public-key authentication only\n'
```

Любое отличие от четырёх ожидаемых значений означает `FAIL`: вернись к
[SSH policy bootstrap](vds-secure-access.md#9-проверить-policy-до-restart), не
обновляй Secrets и не запускай release workflow. Эта серверная проверка нужна,
потому что один успешный вход с ключом не доказывает запрет пароля и interactive
authentication.

С локальной машины проверь key-only вход и доступ к единственному destination
будущего application workflow:

```bash
ssh \
  -i "$SHLOKAHUB_DEPLOY_KEY_FILE" \
  -o BatchMode=yes \
  -o IdentitiesOnly=yes \
  -o StrictHostKeyChecking=yes \
  -o "UserKnownHostsFile=$SHLOKAHUB_KNOWN_HOSTS_FILE" \
  "deploy@$SHLOKAHUB_DEPLOY_HOST" \
  'set -eu
   test "$(id -un)" = deploy
   if sudo -n true 2>/dev/null; then
     printf "FAIL: deploy has sudo\n"
     exit 1
   fi
   test -d /var/www/shlokahub-app/html
   test -w /var/www/shlokahub-app/html
   test "$(stat -c "%U:%G" /var/www/shlokahub-app/html)" = deploy:deploy
   test ! -w /etc/nginx
   test ! -w /etc/letsencrypt
   printf "PASS: trusted key-only access and application root\n"'
```

Команда должна закончиться единственной строкой `PASS`. Она не печатает host,
ключи или содержимое `known_hosts`.

Общая MVP-платформа намеренно использует одного automation-пользователя для
статических roots. Изоляция application выпуска обеспечивается двумя совместными
границами:

1. `deploy` не имеет `sudo` и не может менять Nginx или TLS configuration;
2. будущий workflow использует фиксированный destination
   `/var/www/shlokahub-app/html/` и не получает destination из Variable.

Не добавляй `deploy` в `sudo` и не создавай для workflow команду, которая принимает
remote path из пользовательского ввода. Проверка фиксированного destination входит
в следующий тикет автоматизации выпуска.

## 4. Заполнить GitHub Repository Variables и Secrets

Открой application repository в GitHub:
`Settings → Secrets and variables → Actions`.

На вкладке `Variables` создай или обнови три Repository Variables из таблицы в
начале runbook. Перед сохранением проверь:

- `DEPLOY_HOST` совпадает с `SHLOKAHUB_DEPLOY_HOST` и с host field полной строки
  `known_hosts`;
- `DEPLOY_USER` равен `deploy` с учётом регистра и без пробелов;
- `VITE_API_BASE_URL` равен `https://api.shlokahub.com` без завершающего `/`.

На вкладке `Secrets` создай или обнови:

- `SSH_PRIVATE_KEY` — полным содержимым проверенного
  `SHLOKAHUB_DEPLOY_KEY_FILE`;
- `SSH_KNOWN_HOSTS` — полным содержимым проверенного
  `SHLOKAHUB_KNOWN_HOSTS_FILE`, а не одним fingerprint.

На macOS передай содержимое файла в clipboard без вывода в terminal:

```bash
pbcopy < "$SHLOKAHUB_DEPLOY_KEY_FILE"
# Сохрани SSH_PRIVATE_KEY в GitHub, затем:
pbcopy < "$SHLOKAHUB_KNOWN_HOSTS_FILE"
# Сохрани SSH_KNOWN_HOSTS, затем очисти clipboard:
printf 'clipboard cleared' | pbcopy
```

Не вставляй значения в `gh ... --body`, shell history или диагностические команды.
GitHub не позволяет прочитать Secret после сохранения; доверие к его значению
обеспечивается заменой непосредственно из уже проверенного локального файла.

## 5. Проверить repository configuration без чтения Secrets

В GitHub UI проверь точные значения трёх Variables. Для Secrets проверь только
наличие имён и свежий timestamp обновления; их значения не раскрывай и не пытайся
восстановить.

Если GitHub CLI уже аутентифицирован для нужного repository, безопасную часть
проверки можно выполнить локально:

```bash
test "$(gh variable get DEPLOY_USER)" = 'deploy'
test "$(gh variable get VITE_API_BASE_URL)" = 'https://api.shlokahub.com'
test -n "$(gh variable get DEPLOY_HOST)"

for secret_name in SSH_PRIVATE_KEY SSH_KNOWN_HOSTS; do
  gh secret list --json name --jq '.[].name' |
    grep -Fx "$secret_name" >/dev/null
done

printf 'PASS: repository configuration names and public constants\n'
```

Эта проверка намеренно не печатает `DEPLOY_HOST` и не доказывает содержимое
Secrets. Соответствие Secrets доверенным файлам подтверждается только контролируемой
загрузкой из раздела 4, а фактическая совместимость — первым workflow из следующего
тикета.

## 6. Зафиксировать безопасный результат

Сохрани вне repository только необходимую защищённую операционную заметку о том,
какие локальные файлы были источниками Secrets. В ticket/report перенеси лишь этот
шаблон:

```text
production-platform-bootstrap accepted: PASS
DEPLOY_HOST configured and matched to verified host-key entry: PASS
DEPLOY_USER exact value verified: PASS
VITE_API_BASE_URL exact canonical value verified: PASS
SSH_PRIVATE_KEY replaced from trusted local source: PASS
SSH_KNOWN_HOSTS replaced from independently verified local source: PASS
deploy key-only access and no-sudo boundary: PASS
ShlokaHub application root access: PASS
Sensitive production values recorded in repository/report: NO
```

Если любой пункт не подтверждён, не отмечай тикет выполненным и не начинай
application workflow. После всех `PASS` владелец отмечает оставшиеся критерии
тикета выполненными, меняет его статус с `ready-for-human` на
`awaiting-human-review` и передаёт на человеческую приёмку. Сам production deploy
остаётся работой следующего тикета.
