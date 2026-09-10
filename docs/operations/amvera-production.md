# Backend release в Amvera

## Проверка и продвижение commit

[`Backend CI`](../../.github/workflows/backend-ci.yml) запускается на push в `main`
при изменениях API, API-контракта, корневых dependency/workspace/toolchain metadata,
Dockerfile, `.dockerignore`, container entrypoint или самого workflow. На время
coexistence сохранён также фильтр `railway.json`. Frontend-код, frontend release
workflow и общие документы сами по себе backend release не запускают. Изменение
общего lockfile запускает проверку, даже если его причиной была frontend dependency.

Job `verify` проверяет SHA события push: устанавливает зависимости по frozen
lockfile, собирает workspace dependencies, выполняет typecheck, tests и production
build API с зависимостями, затем `docker build --target production .`. Это финальная
стадия корневого Dockerfile, которую должна собирать Amvera. Image остаётся в CI
runner; публикации в registry нет. Секреты Amvera и базы данных workflow не нужны.

Только после успеха всех шагов `verify` запускается отдельный job `promote` с
`contents: write`. Остальные jobs наследуют `contents: read`; verify checkout не
сохраняет credentials. Promotion checkout использует штатный короткоживущий
`GITHUB_TOKEN` и полную историю проверенного SHA. Обычный push
`git push origin "${GITHUB_SHA}:refs/heads/amvera-api"` создаёт ветку при первом
успешном запуске, затем обновляет её fast-forward ровно на этот SHA.

`amvera-api` — только указатель на проверенный backend commit. В неё нельзя делать
ручные commits, pull requests или независимые изменения, а также merge-back в
`main`. Non-fast-forward push завершается ошибкой: force push и автоматическое
исправление расхождения истории запрещены. При ошибке проверить историю и правила
доступа к ветке; не заменять команду на принудительный push. Rulesets/branch
protection должны разрешать promotion создавать и обновлять эту служебную ветку.

Concurrency `backend-ci-${{ github.ref }}` с `cancel-in-progress: true` отменяет
устаревший незавершённый запуск при следующем подходящем backend push. Ошибка или
отмена verify пропускает promotion. Повторный запуск старого commit после более
нового release не откатит ветку: обычный Git push отвергнет обновление назад.
Push в `amvera-api` не подходит под branch filter Backend CI и не создаёт рекурсию.

## Подключение webhook и условный fallback

При bootstrap подключить в Amvera текущий GitHub repository, событие push и target
branch `amvera-api` по [инструкции Amvera](https://docs.amvera.ru/applications/git/webhooks.html).
Для приватного repository read token, необходимый Amvera, хранится на стороне
платформы и не используется в GitHub Actions. Подключение Amvera и первый deployment
выполняются в тикете 04; настройка workflow сама по себе не подтверждает доставку webhook.

Сначала проверить обычный push через `GITHUB_TOKEN`: сопоставить SHA успешного
Backend CI, `refs/heads/amvera-api`, webhook delivery и исходный commit сборки
Amvera. Ограничение на запуск новых Actions workflows через этот token описано
в [документации GitHub](https://docs.github.com/en/actions/concepts/security/github_token);
оно само по себе не подтверждает поведение внешнего Amvera webhook.

Только если реальный Amvera webhook игнорирует такой push, допускается fallback:

1. Создать fine-grained GitHub token с доступом только к этому repository и правом
   **Contents: Read and write**, ограниченным сроком действия, без лишних прав.
2. Сохранить его как Actions secret `AMVERA_PROMOTION_TOKEN`.
3. Добавить `token: ${{ secrets.AMVERA_PROMOTION_TOKEN }}` только в `with` шага
   checkout job `promote`. Не передавать token в verify, Docker build или runtime.
4. Повторить проверку доставки и SHA; настроить ротацию token до истечения срока.

Fallback не включён заранее. Push остаётся fast-forward в ту же служебную ветку;
credentials-based deploy pipeline и публикация image не добавляются.

## Проверка первого запуска

- При ошибке любого verify step promotion должен быть skipped, а `amvera-api`
  должна сохранить прежний SHA (или отсутствовать до первого успеха).
- После полного успеха SHA ветки должен совпасть с SHA проверенного push, а Amvera
  должна получить именно этот исходный commit.
- Frontend-only push без изменений общих metadata не должен создавать Backend CI
  run или перемещать ветку. Следующий backend release может включать промежуточные
  frontend commits как часть истории `main`.

Результаты внешней проверки фиксировать без tokens, database URLs и webhook secrets.
