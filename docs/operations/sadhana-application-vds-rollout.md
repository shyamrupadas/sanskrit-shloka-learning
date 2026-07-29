# Восстановление Sadhana application на новом VDS

Runbook завершает перенос существующего Sadhana application pipeline на уже
подготовленный VDS. Он не меняет DNS или TLS и не модернизирует release-контракт:
workflow по-прежнему запускается только push в `master`, выполняет прежние
install/build, синхронизирует `dist/` через `rsync --delete` в
`/var/www/sadhana-app/html/` и не имеет ручного dispatch.

Настройки GitHub и команды VDS выполняются владельцем вручную. Не записывай в
репозиторий, issue, комментарий к workflow или итоговый отчёт фактический IP,
private key, содержимое `known_hosts` либо значения Secrets.

## 1. Проверить локальные входные данные

Открой терминал на ноутбуке и задай пути к уже подготовленным файлам. Значение
`VDS_HOST` должно в точности совпадать со значением, которое позднее попадёт в
GitHub Variable `SERVER_IP`.

```bash
export VDS_HOST='<новый VDS host или IP>'
export DEPLOY_KEY_FILE="$HOME/.ssh/shlokahub-vds/deploy_ed25519"
export SSH_KNOWN_HOSTS_FILE="$HOME/.ssh/shlokahub-vds/known_hosts"

test -n "$VDS_HOST"
test -s "$DEPLOY_KEY_FILE"
test -s "$SSH_KNOWN_HOSTS_FILE"
chmod 600 "$DEPLOY_KEY_FILE" "$SSH_KNOWN_HOSTS_FILE"
```

Проверь fingerprint сохранённого host key:

```bash
ssh-keygen -lf "$SSH_KNOWN_HOSTS_FILE"
```

Он должен совпасть с fingerprint Ed25519 host key, независимо полученным через
доверенную VDSina VNC/recovery console:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

Если fingerprints не совпали, остановись. Не обновляй Secret и не запускай
workflow до выяснения причины. Подробная процедура первичного получения и сверки
ключа находится в
[runbook безопасного доступа](vds-secure-access.md#3-получить-и-независимо-сверить-ssh-host-key).
`ssh-keyscan` допустим на ноутбуке только вместе с независимой сверкой fingerprint;
workflow никогда не должен доверять результату runtime `ssh-keyscan`.

## 2. Проверить automation-доступ и VDS root

Убедись, что локальный общий CI private key открывает key-only сессию `deploy` на
новом VDS:

```bash
ssh \
  -i "$DEPLOY_KEY_FILE" \
  -o BatchMode=yes \
  -o IdentitiesOnly=yes \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" \
  "deploy@$VDS_HOST" \
  'set -eu
   test "$(id -un)" = deploy
   test -d /var/www/sadhana-app/html
   test -w /var/www/sadhana-app/html
   test "$(stat -c "%U:%G" /var/www/sadhana-app/html)" = deploy:deploy
   printf "PASS: deploy access and application root\n"'
```

Успех команды доказывает соответствие локального private key ключу, установленному
на VDS, но не раскрывает и не проверяет сохранённый GitHub Secret. Оставляй
`SSH_PRIVATE_KEY` без изменения только если из локального key inventory или
истории первоначальной настройки достоверно известно, что Secret был загружен
именно из неизменённого `DEPLOY_KEY_FILE`.

Если общий CI-ключ был создан заново для нового VDS либо происхождение текущего
Secret нельзя подтвердить, замена `SSH_PRIVATE_KEY` проверенным общим ключом
необходима. Если локальный ключ не входит, сначала проверь соответствующий public
key в `/home/deploy/.ssh/authorized_keys`; не создавай ещё одну пару до установления
причины.

Через отдельную административную сессию проверь границы прав:

```bash
ssh \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" \
  "admin@$VDS_HOST"
```

На VDS выполни:

```bash
sudo -l -U deploy
sudo -u deploy test -w /var/www/sadhana-app/html
sudo -u www-data test ! -w /var/www/sadhana-app/html
sudo -u deploy test ! -w /etc/nginx
sudo nginx -t
```

Ожидаются отсутствие разрешённых `sudo`-команд для `deploy`, запись в application
root только для `deploy` и успешная проверка Nginx.

## 3. Обновить GitHub Actions Variables и Secrets

В GitHub открой application repository Sadhana:
`Settings → Secrets and variables → Actions`.

На вкладке `Variables` обнови `Repository variables`:

| Variable | Действие |
| --- | --- |
| `SERVER_IP` | Установить новый VDS host/IP без схемы, username, пробелов и завершающего `/`. Значение должно совпадать с `VDS_HOST`. |
| `SERVER_USER` | Установить ровно `deploy`. |

На вкладке `Secrets` обнови `Repository secrets`:

| Secret | Действие |
| --- | --- |
| `SSH_KNOWN_HOSTS` | Вставить полное содержимое проверенного `SSH_KNOWN_HOSTS_FILE`, а не один fingerprint. |
| `SSH_PRIVATE_KEY` | Оставить без изменения только при доказанном соответствии из раздела 2; иначе заменить содержимым проверенного общего `DEPLOY_KEY_FILE`. |

Workflow читает публичные connection values через `vars.*`, а чувствительные
значения — через `secrets.*`. Не дублируй `SERVER_IP` и `SERVER_USER` в Secrets.
Если private key пришлось ротировать, сохрани прежний локальный ключ в защищённом
хранилище до успешного первого workflow, но не добавляй второй Secret или fallback
в workflow.

Перед сохранением `SSH_KNOWN_HOSTS` можно безопасно передать файл в clipboard, не
выводя его в историю терминала:

```bash
pbcopy < "$SSH_KNOWN_HOSTS_FILE"
```

Если `pbcopy` недоступен, открой файл локальным редактором и скопируй всё
содержимое вручную. Не вставляй строку в issue, commit message или Actions log.

При необходимой ротации тем же способом скопируй private key, не печатая его:

```bash
pbcopy < "$DEPLOY_KEY_FILE"
```

После сохранения Secret очисти clipboard, скопировав в него несекретный текст.

## 4. Проверить изменение workflow

В application repository `.github/workflows/deploy.yml` должен:

- сохранять trigger только для push в `master`;
- сохранять `yarn install --immutable` и `yarn build`;
- записывать `SSH_KNOWN_HOSTS` в `~/.ssh/known_hosts`;
- использовать `StrictHostKeyChecking=yes`;
- не содержать `ssh-keyscan`;
- сохранять `rsync -avz --delete`, source `./dist/` с trailing slash и destination
  `/var/www/sadhana-app/html/`;
- не содержать `workflow_dispatch`.

Локальная проверка без вывода Secret values:

```bash
cd /Users/shyam/projects/sadhana

grep --fixed-strings 'branches: [ "master" ]' .github/workflows/deploy.yml
grep --fixed-strings 'yarn install --immutable' .github/workflows/deploy.yml
grep --fixed-strings 'yarn build' .github/workflows/deploy.yml
grep --fixed-strings 'SSH_KNOWN_HOSTS' .github/workflows/deploy.yml
grep --fixed-strings 'StrictHostKeyChecking=yes' .github/workflows/deploy.yml
grep --fixed-strings 'rsync -avz --delete' .github/workflows/deploy.yml
grep --fixed-strings './dist/' .github/workflows/deploy.yml
grep --fixed-strings '/var/www/sadhana-app/html/' .github/workflows/deploy.yml

if grep -Eq 'ssh-keyscan|workflow_dispatch' .github/workflows/deploy.yml; then
  printf 'FAIL: запрещённый runtime discovery или ручной dispatch\n'
  exit 1
fi
```

## 5. Запустить первый deploy

У workflow нет ручного dispatch. После проверки Variables и Secrets отправь
подготовленный commit workflow в `master` application repository обычным push:

```bash
cd /Users/shyam/projects/sadhana
git status --short
git log -1 --oneline
git push origin master
```

Открой `Actions → Deploy App`, выбери run для отправленного commit и дождись
успешного завершения `build-and-deploy`. Проверь, что:

1. `Install dependencies` и `Build project` зелёные.
2. `Deploy to VPS` зелёный.
3. В log отсутствует `ssh-keyscan`.
4. GitHub маскирует Secrets; не копируй в отчёт connection values или фрагменты
   log, даже если часть значений скрыта.

Если run завершился ошибкой до `rsync`, production artifact не менялся. Если
ошибка возникла во время `rsync`, не переключай DNS: устрани причину и повтори
обычным новым push/revert, не добавляя `workflow_dispatch`.

## 6. Проверить артефакт и ownership

После зелёного workflow снова подключись как `deploy` и проверь результат:

```bash
ssh \
  -i "$DEPLOY_KEY_FILE" \
  -o BatchMode=yes \
  -o IdentitiesOnly=yes \
  -o StrictHostKeyChecking=yes \
  -o UserKnownHostsFile="$SSH_KNOWN_HOSTS_FILE" \
  "deploy@$VDS_HOST" \
  'set -eu
   app_root=/var/www/sadhana-app/html
   test -s "$app_root/index.html"
   test -d "$app_root/assets"
   test -n "$(find "$app_root/assets" -type f -print -quit)"
   test "$(stat -c "%U:%G" "$app_root")" = deploy:deploy
   test -z "$(find "$app_root" ! -user deploy -print -quit)"
   test -z "$(find "$app_root" ! -group deploy -print -quit)"
   printf "PASS: artifact and ownership\n"'
```

`rsync --delete` должен заменить bootstrap-содержимое полным production `dist/`.
Не выполняй `chown` как обход ошибки: неверный ownership означает проблему
подготовки VDS или deploy-контракта, которую нужно исправить до DNS cutover.

## 7. Проверить HTTP и прямой SPA route до DNS cutover

Команды выполняются на ноутбуке и направляют только текущий запрос на новый VDS,
не меняя локальный или публичный DNS:

```bash
curl --fail --silent --show-error \
  --connect-timeout 10 \
  --noproxy '*' \
  --resolve "app.sadhana-tracker.com:80:$VDS_HOST" \
  http://app.sadhana-tracker.com/ \
  | grep --fixed-strings '<title>Sadhana</title>'

curl --fail --silent --show-error \
  --connect-timeout 10 \
  --noproxy '*' \
  --resolve "app.sadhana-tracker.com:80:$VDS_HOST" \
  http://app.sadhana-tracker.com/login \
  | grep --fixed-strings '<title>Sadhana</title>'
```

Обе команды должны завершиться успешно. Вторая проверяет Nginx SPA fallback при
прямом открытии вложенного route `/login`. Если на этом этапе включён только HTTP,
не проверяй HTTPS с подменой TLS и не используй `curl -k`: DNS cutover и выпуск
сертификата относятся к следующему тикету.

## 8. Снять post-deploy snapshot

В административной сессии VDS выполни проверки из
[security/resource baseline](vds-security-resource-baseline.md#9-снять-безопасный-итоговый-snapshot):
диск, `MemAvailable`, swap, OOM, load, размеры журналов, ownership и
`reboot-required`. Отдельно зафиксируй безопасный процент месячного трафика из
панели VDSina.

Итоговый отчёт должен содержать только:

- timestamp и commit SHA первого успешного workflow;
- PASS/FAIL build, deploy, artifact, ownership, `/` и `/login`;
- безопасные ресурсные показатели и процент трафика;
- подтверждение, что DNS ещё не переключался.

Не включай в отчёт IP/hostname нового VDS, private/public key material, fingerprint,
строку `known_hosts`, Secret values, Actions log fragments с connection values или
GitHub account identifiers.

## 9. Условие передачи следующему этапу

К DNS cutover Sadhana можно переходить только когда одновременно:

- GitHub Variables указывают на `deploy` и новый VDS;
- GitHub Secrets содержат проверенный host key и доказуемо соответствующий CI key;
- private key сохранён либо осознанно ротирован;
- первый `Deploy App` для нужного commit зелёный;
- production artifact и ownership проверены;
- `/` и прямой `/login` возвращают Sadhana SPA с нового VDS;
- post-deploy resource snapshot не нарушает согласованные пороги;
- в отчёте нет чувствительных runtime-значений.

До выполнения всех условий оставь DNS без изменений.
