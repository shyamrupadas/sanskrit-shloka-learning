# Аудит готовности repositories к CI/CD на общий VDS

Дата исследования: 2026-07-25.

## Краткий вывод

Текущий ShlokaHub frontend готов к прямому статическому deploy на VDS без
изменения production-кода: он уже собирается в `apps/web/dist`, уже читает
`VITE_API_BASE_URL`, а его единственная workspace-зависимость —
`@sanskrit-shloka-learning/api-contract`. Нужен новый GitHub Actions workflow,
который:

1. запускается по `push` в `main` с точными path filters и вручную через
   `workflow_dispatch`;
2. устанавливает зафиксированные в repository Node 24 и pnpm 11.5.0;
3. отдельно собирает `api-contract`, затем выполняет lint, typecheck,
   contract tests, frontend unit tests и production build;
4. передаёт `VITE_API_BASE_URL` только в production build;
5. проверяет `apps/web/dist/index.html`, после чего выполняет прямой
   `rsync --delete` в `/var/www/shlokahub-app/html/`;
6. использует заранее проверенный `known_hosts`, а после deploy проверяет
   `/`, вложенный SPA route `/login` и Railway readiness endpoint.

Для будущего landing repository нельзя честно назвать install/build-команды,
пока не выбран stack и package manager. Уже достаточен согласованный контракт:
ветка `main` должна детерминированно предоставить `dist/index.html`. Самый
простой placeholder может хранить `dist/index.html` прямо в repository; после
выбора stack workflow заменяет это на frozen install и его штатную build-команду.
Остальная часть pipeline уже определена.

## Установленные факты о текущем monorepo

| Факт | Следствие для workflow | Источник |
| --- | --- | --- |
| Корневой `package.json` фиксирует Node `24.x`, `pnpm@11.5.0` и Turbo | Использовать `actions/setup-node` с `node-version-file: package.json`, затем `corepack enable`; не дублировать версии в workflow | [`package.json`](../../../package.json) |
| Workspace включает `apps/*` и `packages/*` | Install выполняется один раз из корня repository | [`pnpm-workspace.yaml`](../../../pnpm-workspace.yaml) |
| Web зависит от `@sanskrit-shloka-learning/api-contract: workspace:*` | До typecheck/test/build web требуется собранный `api-contract` | [`apps/web/package.json`](../../../apps/web/package.json), [`packages/api-contract/package.json`](../../../packages/api-contract/package.json) |
| Turbo `build` зависит от `^build` и публикует `dist/**` | `turbo run build --filter=@sanskrit-shloka-learning/web` корректно включает build зависимости | [`turbo.json`](../../../turbo.json) |
| Web build — `tsc -p tsconfig.build.json && vite build` | Production artifact — `apps/web/dist/` | [`apps/web/package.json`](../../../apps/web/package.json), [`netlify.toml`](../../../netlify.toml) |
| Web `test` равен `vitest run && playwright test`, но есть отдельный `test:unit` | Нельзя использовать общий `pnpm test`: согласованный gate должен вызвать `test:unit`, не Playwright | [`apps/web/package.json`](../../../apps/web/package.json) |
| `api-contract` имеет собственные `typecheck` и `test` | Изменения контракта должны проходить эти проверки, а не только web unit tests | [`packages/api-contract/package.json`](../../../packages/api-contract/package.json) |
| `SessionProvider` передаёт `import.meta.env.VITE_API_BASE_URL ?? ""` в `ApiClient` | Переменная уже поддержана; отсутствие значения незаметно переключит клиент на same-origin, поэтому CI должен явно проверить её наличие и точное значение | [`session-provider.tsx`](../../../apps/web/src/shared/session/session-provider.tsx) |
| Generated client конкатенирует `baseUrl` и пути, начинающиеся с `/api` | Значение должно быть без завершающего slash: `https://api.shlokahub.com` | [`client.ts`](../../../packages/api-contract/generated/frontend/client.ts) |
| Реальный публичный вложенный route — `/login` | Он подходит для проверки Nginx SPA fallback без авторизации | [`routes.ts`](../../../apps/web/src/shared/model/routes.ts) |
| Readiness endpoint реально существует по `/health/ready` | Smoke-check `https://api.shlokahub.com/health/ready` соответствует backend-коду | [`health.controller.ts`](../../../apps/api/src/health/health.controller.ts) |
| Существующий backend workflow уже применяет Node/package metadata, Corepack, frozen install, scoped workspace commands, `contents: read` и concurrency | Это более подходящий внутренний шаблон для monorepo-части, чем standalone Sadhana | [`backend-ci.yml`](../../../.github/workflows/backend-ci.yml) |

Официальная документация pnpm подтверждает семантику фильтров:
`<package>...` выбирает package и все его зависимости, а `<package>^...` —
только зависимости ([pnpm Filtering](https://pnpm.io/filtering)).

## Pipeline ShlokaHub application

### Trigger и path filters

```yaml
on:
  push:
    branches:
      - main
    paths:
      - "apps/web/**"
      - "packages/api-contract/**"
      - "package.json"
      - "pnpm-lock.yaml"
      - "pnpm-workspace.yaml"
      - "tsconfig.base.json"
      - "turbo.json"
      - ".github/workflows/frontend-deploy.yml"
  workflow_dispatch:
    inputs:
      ref:
        description: "Git ref to deploy (main by default)"
        required: false
        default: "main"
```

Почему список именно такой:

- `apps/web/**` — весь frontend, включая Vite, ESLint, Vitest, TypeScript,
  Playwright-конфигурацию и public assets;
- `packages/api-contract/**` — единственная локальная runtime/build-зависимость
  web, включая generated client;
- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` — версии runtime,
  package manager, dependency graph и install policy;
- `tsconfig.base.json` — общий TypeScript contract;
- `turbo.json` — граф и outputs production build;
- сам workflow — изменение release-процесса должно проверить новый процесс.

`apps/api/**` и `railway.json` не входят в filter: они не меняют статический
frontend artifact. GitHub применяет branch и path filters совместно, поэтому
workflow выполнится только при совпадении обоих условий
([GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onpushpull_requestpull_request_targetpaths-paths-ignore)).
Path filter нужен только для `push`; ручной запуск остаётся доступен всегда.

Если этот deploy workflow впоследствии сделают обязательным PR check, следует
вынести проверки в отдельный безусловный CI workflow: GitHub предупреждает, что
пропущенный из-за path filter required check остаётся `Pending`. Для текущего
post-merge deploy workflow это ограничение не мешает.

### Permissions и concurrency

```yaml
permissions:
  contents: read

concurrency:
  group: shlokahub-app-production
  cancel-in-progress: false
```

`contents: read` достаточно checkout и setup-node; GitHub рекомендует выдавать
`GITHUB_TOKEN` только минимально необходимые permissions
([GitHub automatic token authentication](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication)).

Один production deploy одного repository не должен идти параллельно. При
согласованном неатомарном `rsync` нельзя отменять уже идущий run посередине
копирования, поэтому `cancel-in-progress: false`: текущий run завершится, а
новейший pending run выпустит актуальное состояние следом. GitHub гарантирует не
более одного running job/run в concurrency group
([GitHub concurrency](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#concurrency)).
Concurrency groups ограничены repository, но cross-repository lock не нужен:
четыре workflows пишут в четыре разных каталога.

### Checkout, install и gates

Рекомендуемая последовательность команд:

```yaml
- uses: actions/checkout@v6
  with:
    ref: ${{ inputs.ref || github.sha }}

- uses: actions/setup-node@v6
  with:
    node-version-file: package.json

- run: corepack enable
- run: pnpm install --frozen-lockfile

- name: Build frontend workspace dependencies
  run: pnpm --filter "@sanskrit-shloka-learning/web^..." build

- name: Lint frontend
  run: pnpm --filter @sanskrit-shloka-learning/web lint

- name: Typecheck frontend and workspace dependencies
  run: pnpm --filter @sanskrit-shloka-learning/web... typecheck

- name: Test API contract
  run: pnpm --filter @sanskrit-shloka-learning/api-contract test

- name: Test frontend units
  run: pnpm --filter @sanskrit-shloka-learning/web test:unit

- name: Validate production API URL
  env:
    VITE_API_BASE_URL: ${{ vars.VITE_API_BASE_URL }}
  run: test "$VITE_API_BASE_URL" = "https://api.shlokahub.com"

- name: Build production frontend
  env:
    VITE_API_BASE_URL: ${{ vars.VITE_API_BASE_URL }}
  run: pnpm turbo run build --filter=@sanskrit-shloka-learning/web

- name: Validate artifact
  run: test -f apps/web/dist/index.html
```

Первый dependency build нужен до typecheck/tests: `api-contract` экспортирует
JS и declarations из игнорируемого Git каталогом `dist/`, которого нет в чистом
checkout. Финальный Turbo build снова включает dependency по графу, но Turbo
переиспользует уже полученный результат.

`pnpm install --frozen-lockfile` соответствует принятому gate и рекомендации
официального `actions/setup-node` хранить lockfile и использовать frozen install
в CI
([setup-node advanced usage](https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md#checking-in-lockfiles)).
Кэш не обязателен для минимально рабочего pipeline; его можно добавить позже
через `cache: pnpm`, не меняя корректность выпуска.

`VITE_API_BASE_URL` должна существовать как GitHub Repository Variable со
значением `https://api.shlokahub.com`, а не как Secret. GitHub Variables
предназначены для несекретной конфигурации
([GitHub Variables](https://docs.github.com/en/actions/concepts/workflows-and-actions/variables)),
а Vite прямо указывает, что `VITE_*` значения статически встраиваются в
client bundle и не должны содержать секреты
([Vite Env Variables](https://vite.dev/guide/env-and-mode.html)).

`workflow_dispatch.inputs.ref` делает согласованный ручной rollback
воспроизводимым: оператор указывает прежний commit SHA/tag, но workflow из
default branch прогоняет над ним те же gates перед повторным `rsync`.

### Variables, Secrets и SSH

В обоих ShlokaHub repositories:

| Тип | Имя | Значение/назначение |
| --- | --- | --- |
| Repository Variable | `DEPLOY_HOST` | Публичный IP или DNS name VDS |
| Repository Variable | `DEPLOY_USER` | `deploy` |
| Repository Secret | `SSH_PRIVATE_KEY` | Один согласованный общий private key |
| Repository Secret | `SSH_KNOWN_HOSTS` | Заранее проверенная полная host-key строка для точного `DEPLOY_HOST` |

Только в application repository:

| Тип | Имя | Значение |
| --- | --- | --- |
| Repository Variable | `VITE_API_BASE_URL` | `https://api.shlokahub.com` |

IP/hostname и username не являются секретами, поэтому хранить их в Secrets, как
в Sadhana, не требуется. GitHub отмечает, что Variables выводятся без
маскирования, а чувствительные данные нужно хранить как Secrets
([GitHub Variables](https://docs.github.com/en/actions/concepts/workflows-and-actions/variables)).
Несмотря на то что host public key сам по себе публичен, карта явно фиксирует
`SSH_KNOWN_HOSTS` как Secret; workflow должен следовать этому решению.

Подготовка SSH и deploy должны иметь такую форму:

```yaml
- name: Configure SSH and deploy
  env:
    DEPLOY_HOST: ${{ vars.DEPLOY_HOST }}
    DEPLOY_USER: ${{ vars.DEPLOY_USER }}
    SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
    SSH_KNOWN_HOSTS: ${{ secrets.SSH_KNOWN_HOSTS }}
  run: |
    install -d -m 700 "$HOME/.ssh"
    printf '%s\n' "$SSH_PRIVATE_KEY" > "$HOME/.ssh/deploy_key"
    chmod 600 "$HOME/.ssh/deploy_key"
    printf '%s\n' "$SSH_KNOWN_HOSTS" > "$HOME/.ssh/known_hosts"
    chmod 644 "$HOME/.ssh/known_hosts"

    rsync -avz --delete \
      -e "ssh -i $HOME/.ssh/deploy_key -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes" \
      apps/web/dist/ \
      "$DEPLOY_USER@$DEPLOY_HOST:/var/www/shlokahub-app/html/"
```

Обязательные детали:

- `SSH_KNOWN_HOSTS` получают из доверенного VDS console/bootstrap-сеанса и
  сверяют по fingerprint **до** добавления в GitHub; workflow не вызывает
  `ssh-keyscan`;
- `StrictHostKeyChecking=yes` действительно защищает только при заранее
  проверенном `known_hosts`;
- `BatchMode=yes` запрещает зависнуть в ожидании password prompt;
- `IdentitiesOnly=yes` заставляет использовать переданный deploy key;
- source заканчивается `/`, destination — отдельный заранее созданный и
  принадлежащий `deploy` каталог;
- workflow не создаёт remote directories через `sudo` и не имеет sudo-доступа.

OpenSSH прямо предупреждает: `known_hosts`, построенный через `ssh-keyscan` без
проверки ключа, оставляет пользователя уязвимым для MITM
([OpenBSD ssh-keyscan(1)](https://man.openbsd.org/ssh-keyscan.1)).

`rsync --delete` удаляет в destination файлы, отсутствующие в source; поэтому
предварительный `test -f .../index.html`, trailing slash и уникальный hard-coded
destination обязательны
([официальный rsync(1)](https://download.samba.org/pub/rsync/rsync.1)).
Неатомарность и отсутствие автоматического rollback здесь осознанны и уже
приняты картой.

### Smoke-check после application deploy

```yaml
- name: Smoke-check production
  run: |
    curl --fail --silent --show-error --location \
      --retry 5 --retry-delay 2 --retry-all-errors \
      https://app.shlokahub.com/
    curl --fail --silent --show-error --location \
      --retry 5 --retry-delay 2 --retry-all-errors \
      https://app.shlokahub.com/login
    curl --fail --silent --show-error --location \
      --retry 5 --retry-delay 2 --retry-all-errors \
      https://api.shlokahub.com/health/ready
```

`/login` проверяет именно Nginx SPA fallback, а не только наличие root
`index.html`. API check подтверждает DNS/TLS Railway и database readiness.
Красный smoke-check не откатывает уже скопированные файлы — это соответствует
согласованному MVP-процессу.

## Pipeline будущего ShlokaHub landing

Trigger:

```yaml
on:
  push:
    branches:
      - main
  workflow_dispatch:
    inputs:
      ref:
        description: "Git ref to deploy (main by default)"
        required: false
        default: "main"
```

Path filters standalone landing repository не нужны: любой tracked файл
потенциально влияет на artifact или release process. Permissions и concurrency:

```yaml
permissions:
  contents: read

concurrency:
  group: shlokahub-landing-production
  cancel-in-progress: false
```

Обязательный repository contract до первого deploy:

1. `main` — production branch;
2. после одной документированной build-команды существует `dist/index.html`;
3. если dependencies нужны, Node/package-manager versions и lockfile находятся
   в repository, а install выполняется в frozen/immutable режиме;
4. deploy source — `dist/`, target —
   `/var/www/shlokahub-landing/html/`;
5. Repository Variables/Secrets — те же `DEPLOY_HOST`, `DEPLOY_USER`,
   `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS`;
6. после deploy `curl` с теми же fail/retry options проверяет
   `https://shlokahub.com/`.

До появления repository нельзя выбрать между `npm ci`, `pnpm install
--frozen-lockfile`, `yarn install --immutable` или zero-build placeholder без
выдуманного требования. Это единственный оставшийся repository-level параметр;
SSH, deploy и smoke части не зависят от stack.

## Что перенять из Sadhana и что исправить

Исследованы локальные:

- [Sadhana app deploy workflow](/Users/shyam/projects/sadhana/.github/workflows/deploy.yml);
- [Sadhana landing deploy workflow](/Users/shyam/projects/sadhana-tracker-landing/.github/workflows/deploy.yml);
- [Sadhana app package.json](/Users/shyam/projects/sadhana/package.json);
- [Sadhana landing package.json](/Users/shyam/projects/sadhana-tracker-landing/package.json).

### Перенять

- GitHub-hosted Ubuntu runner собирает artifact, Node.js на VDS не нужен.
- Lockfile install: `yarn install --immutable` в app и `npm ci` в landing.
- Artifact source с trailing slash: `./dist/`.
- Прямой `rsync -avz --delete` в отдельный site directory.
- SSH private key в GitHub Secret, права `0700` для `.ssh` и `0600` для key.
- Один workflow/job «verify → build → deploy» достаточен для MVP.

### Исправить

| Sadhana reference | ShlokaHub решение |
| --- | --- |
| Только `push` в `master` | `push` в `main` плюс `workflow_dispatch` с ref |
| Нет `permissions` | `permissions: contents: read` |
| Нет `concurrency` | Уникальная production group, `cancel-in-progress: false` |
| App/landing workflow не имеют quality gates | Application: dependency build, lint, typecheck, contract tests, web unit tests, production build |
| Node и action versions заданы независимо от project metadata | Для monorepo читать Node из root `package.json`, pnpm — через Corepack из `packageManager` |
| `ssh-keyscan` выполняется прямо перед соединением | Писать заранее проверенный `SSH_KNOWN_HOSTS` Secret; runtime scan запрещён |
| `StrictHostKeyChecking=yes` применяется к только что, но не доверенно полученному ключу | Проверенный key плюс `StrictHostKeyChecking=yes`, `BatchMode=yes`, `IdentitiesOnly=yes` |
| `SERVER_IP` и `SERVER_USER` хранятся как Secrets | Несекретные `DEPLOY_HOST`/`DEPLOY_USER` — Variables |
| Нет проверки, что `dist` действительно собран | До `--delete` обязательно проверять `dist/index.html` |
| Нет post-deploy check | Landing `/`; app `/`, `/login`; API `/health/ready` |
| Нет path filters | В monorepo использовать точный frontend dependency boundary |

Sadhana workflows тоже потребуется восстановить на новом VDS, заменив connection
values и создав их прежние destination directories:

- `/var/www/sadhana-app/html/`;
- `/var/www/sadhana-landing/html/`.

Их безопасное исправление `known_hosts`, permissions, concurrency и smoke-check
желательно выполнить при том же bootstrap. Это не требуется для сборки
ShlokaHub, но устраняет одинаковый MITM-риск на общем сервере.

## Итоговое решение ticket

Минимальный CI/CD состоит из двух независимых workflows с общим проверенным SSH
credential contract и разными destination directories:

| Repository | Artifact | Destination | Smoke |
| --- | --- | --- | --- |
| Текущий monorepo | `apps/web/dist/` | `/var/www/shlokahub-app/html/` | app `/`, app `/login`, API `/health/ready` |
| Будущий landing repo | `dist/` | `/var/www/shlokahub-landing/html/` | landing `/` |

Текущий monorepo pipeline определён полностью. Для landing отложен только
stack-specific install/build adapter; zero-build `dist/index.html` уже является
рабочим вариантом заглушки. Тесты и сборки в ходе этого read-only аудита не
запускались, секреты не читались.
