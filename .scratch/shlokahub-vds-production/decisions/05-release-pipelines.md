# Выбрать точные release pipelines для landing и application

Type: grilling
Status: resolved
Blocked by: 03 - Проверить готовность repositories к CI/CD на общий VDS

## Question

Какие точные GitHub Actions workflows для отдельного landing repository и frontend
в текущем monorepo реализуют согласованные triggers, проверки, build-time API URL,
безопасный SSH/rsync deploy, concurrency и smoke-check, оставаясь достаточно простыми
для MVP без атомарных releases и автоматического rollback?

## Answer

Оба production workflow строятся как один последовательный job
`verify → build → deploy → smoke` на GitHub-hosted Ubuntu runner. Отдельная передача
артефакта между jobs, GitHub Environment approval и ручной `workflow_dispatch` не
нужны. Выпуск запускается только после push в `main`; откат выполняется через
`git revert` и новый push в `main`.

Для каждого repository задаётся собственная concurrency group с
`cancel-in-progress: false`: уже начавшийся неатомарный `rsync` не прерывается, а
следующий выпуск ждёт его завершения. Workflow получает только
`permissions: contents: read`.

### Application workflow

Push trigger ограничен следующими paths:

- `apps/web/**`;
- `packages/api-contract/**`;
- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`;
- `tsconfig.base.json`, `turbo.json`;
- сам application deploy workflow.

Job выполняет:

1. `actions/checkout` текущего commit;
2. `actions/setup-node` с `node-version-file: package.json`;
3. `corepack enable`;
4. `pnpm install --frozen-lockfile`;
5. `pnpm --filter "@sanskrit-shloka-learning/web^..." build`;
6. `pnpm --filter @sanskrit-shloka-learning/web lint`;
7. `pnpm --filter @sanskrit-shloka-learning/web... typecheck`;
8. `pnpm --filter @sanskrit-shloka-learning/api-contract test`;
9. `pnpm --filter @sanskrit-shloka-learning/web test:unit`;
10. проверку, что Repository Variable `VITE_API_BASE_URL` точно равна
    `https://api.shlokahub.com`;
11. `pnpm turbo run build --filter=@sanskrit-shloka-learning/web` с
    `VITE_API_BASE_URL` в environment;
12. проверку наличия `apps/web/dist/index.html`;
13. SSH/rsync deploy `apps/web/dist/` в
    `/var/www/shlokahub-app/html/`;
14. smoke-check `https://app.shlokahub.com/`,
    `https://app.shlokahub.com/login` и
    `https://api.shlokahub.com/health/ready`.

Playwright E2E не входит в release gate.

### Landing workflow

Отдельный landing repository запускает workflow на любой push в `main`, без path
filters. Он использует тот же один job, permissions, concurrency, SSH/rsync и
smoke-подход. До deploy repository обязан детерминированно предоставить
`dist/index.html`:

- после выбора stack workflow использует зафиксированные в repository версии
  runtime/package manager, lockfile, frozen/immutable install и штатную build-команду;
- для первоначальной полностью статической заглушки допустим committed
  `dist/index.html` без install/build.

После проверки артефакта workflow копирует `dist/` в
`/var/www/shlokahub-landing/html/` и проверяет
`https://shlokahub.com/`. Конкретные install/build-команды не фиксируются до
создания repository, потому что frontend stack намеренно не выбран.

### Общий deploy contract

Оба repositories используют:

- Variables `DEPLOY_HOST` и `DEPLOY_USER` (`deploy`);
- Secrets `SSH_PRIVATE_KEY` и `SSH_KNOWN_HOSTS`;
- заранее проверенную строку host key без runtime `ssh-keyscan`;
- SSH options `BatchMode=yes`, `IdentitiesOnly=yes`,
  `StrictHostKeyChecking=yes`;
- `rsync -avz --delete` с trailing slash у source и отдельным жёстко заданным
  destination.

Smoke-check использует `curl --fail --silent --show-error --location` с
ограниченными retries. Его ошибка делает workflow красным, но не запускает
автоматический rollback: оператор диагностирует причину и при необходимости
делает `git revert`.

Техническое обоснование и проверенные команды:
[аудит готовности repositories к CI/CD](../research/03-repository-cicd-readiness.md).
