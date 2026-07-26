# Карта: production-размещение статических сайтов на VDS

## Destination

Согласован доказательный пошаговый production-план для нового VDSina-сервера: четыре
статических сайта безопасно сосуществуют на одном VDS, ShlokaHub landing и frontend
автоматически выпускаются из GitHub, а Railway backend получает custom domain
`api.shlokahub.com`. План точно разделяет изменения репозиториев, ручную настройку
VDSina/Ubuntu, Cloudflare DNS, Railway и проверку первого выпуска; фактическая
реализация начинается после завершения карты.

## Notes

- План и отчёты вести на русском языке.
- Для внешних фактов использовать `research` и первичные источники; для решений
  использовать `grilling` и при необходимости `domain-modeling`.
- Новый VDS уже создан у VDSina: Ubuntu 26.04 LTS, 1 vCPU, 1 ГБ RAM, 10 ГБ NVMe,
  1 ТБ трафика. До настройки проверить фактическое свободное место и память.
- На одном VDS через Nginx сосуществуют четыре статических сайта: два существующих
  сайта Sadhana и два сайта ShlokaHub. Node.js и production build на VDS не нужны:
  сборка выполняется в GitHub Actions.
- Для защиты от кратковременного дефицита памяти добавить swap-файл 1 ГБ, если после
  обновления ОС остаётся не менее 3 ГБ свободного места, и ограничить рост журналов.
  Переход на тариф 2 ГБ/50 ГБ нужен только по измеренным признакам нехватки ресурсов;
  отдельный VDS сейчас не создаётся.
- ShlokaHub landing живёт в будущем отдельном repository, выпускается из `main` и
  предоставляет статический артефакт `dist/`. Конкретный frontend stack не фиксируется.
- ShlokaHub application frontend живёт в текущем pnpm monorepo, выпускается из `main`
  только при изменении `apps/web`, `packages/api-contract` или общих build/deploy
  зависимостей. Gate: frozen install, lint, typecheck, unit tests, production build.
  Playwright E2E пока не блокируют deploy.
- Оба ShlokaHub workflow полностью автоматические после успешного push в `main`;
  ручной `workflow_dispatch` не нужен.
- Deployment остаётся простым: `rsync --delete` готового `dist/` прямо в отдельный
  каталог сайта. Атомарные release-каталоги и автоматический rollback отложены;
  возврат выполняется через `git revert` и новый push в `main`.
- После deploy workflow проверяет landing `/`, application `/` и одну вложенную SPA
  ссылку, а также `https://api.shlokahub.com/health/ready`.
- Cloudflare используется в режиме `DNS only`; DNS-записи пользователь создаёт
  самостоятельно по точному чек-листу плана. TLS для статических сайтов выпускает и
  обновляет Let's Encrypt/Certbot на VDS; TLS для `api.shlokahub.com` обслуживает
  Railway.
- Канонические URL: `https://shlokahub.com` и `https://app.shlokahub.com`.
  `www.shlokahub.com` и `www.app.shlokahub.com` отвечают постоянным redirect на
  соответствующие канонические адреса.
- Backend остаётся в существующем Railway service. Для него настраивается
  `api.shlokahub.com`, а `FRONTEND_ORIGIN` меняется на точный origin
  `https://app.shlokahub.com`.
- Frontend build получает публичную GitHub Repository Variable
  `VITE_API_BASE_URL=https://api.shlokahub.com`; это не secret.
- На новом VDS создаются два пользователя: ручной `admin` с паролем и `sudo`, и
  automation-пользователь `deploy` без `sudo`. Прямой SSH-вход под `root` запрещён,
  парольная SSH-аутентификация остаётся включённой.
- Один общий SSH-ключ используется workflows всех четырёх repositories. Это
  осознанный MVP-риск. Проверенная строка `known_hosts` хранится в GitHub Secret;
  workflow не доверяет результату runtime `ssh-keyscan`.
- Минимальный host security baseline: UFW открывает только `22`, `80`, `443`;
  включены Fail2ban, log rotation и автоматические security updates без
  автоматической перезагрузки.
- Railway сразу получает единственный production
  `FRONTEND_ORIGIN=https://app.shlokahub.com`; `localhost` в production не
  разрешается.
- Локация VDS не является параметром плана: сервер уже создан, а доступность выбора
  региона для этого тарифа не подтверждена.
- Git index и commits не менять.

## Decisions so far

- [Проверить production baseline VDSina и Ubuntu 26.04](decisions/01-vdsina-ubuntu-baseline.md) — один VDS пригоден для контролируемого MVP при условном swap, лимитах журналов и измеримых порогах; первым шагом масштабирования остаётся upgrade одного VDS до 2 ГБ/50 ГБ.
- [Проверить DNS, TLS и Railway custom domain](decisions/02-domains-tls-railway.md) — статические имена идут DNS-only на VDS с двумя Certbot-сертификатами, а Railway требует выданные CNAME и TXT; cutover должен согласовать build-time API URL и единственный точный CORS origin.
- [Проверить готовность repositories к CI/CD на общий VDS](decisions/03-repository-cicd-readiness.md) — monorepo pipeline, SSH/rsync и smoke-check определены; landing ждёт только stack-specific install/build adapter, а Sadhana reference требует безопасной host-key verification и release gates.
- [Выбрать точную схему общего VDS и границу Sadhana](decisions/04-server-layout-security.md) — четыре изолированных document roots обслуживает один ограниченный deploy-user; перенос Sadhana включает connection values, проверенный host key и первый проверочный deploy, но не широкую модернизацию CI.
- [Выбрать точные release pipelines для landing и application](decisions/05-release-pipelines.md) — оба сайта выпускаются одним последовательным job только после push в `main`, с очередью deploy, согласованными gates, проверенным SSH/rsync и smoke-checks; откат выполняется через `git revert`.
- [Выбрать последовательность DNS, TLS, Railway CORS и первого выпуска](decisions/06-cutover-sequence.md) — реализация начинается с удаления Netlify-конфигурации и очистки актуальных документов; затем CORS переключается на новый origin, первым выпускается application, а после его проверки — landing-заглушка.
- [Согласовать итоговый пошаговый production-план](decisions/07-production-plan.md) — rollout последовательно очищает Netlify contract, переключает Railway CORS, поднимает VDS, восстанавливает оба сайта Sadhana, готовит DNS/TLS и выпускает ShlokaHub application перед landing; handoff разделён на три specs.

## Not yet specified

Нет: маршрут до destination полностью определён. Фактические runtime-значения
вводятся и проверяются во время реализации, но не являются новым planning-решением.

## Out of scope

- Фактическая настройка VDSina, Ubuntu, Cloudflare, Railway, GitHub Secrets/Variables,
  реализация workflows и production deploy: они начинаются после завершения карты.
- Cloudflare proxy/CDN/WAF, автоматический DNS management и ограничение SSH по
  динамическим адресам GitHub-hosted runners.
- Атомарные release-каталоги, автоматический rollback, containerization, Docker,
  Kubernetes и self-hosted GitHub runner.
- Отдельный VDS для ShlokaHub или немедленный upgrade тарифа без измеренной нехватки
  ресурсов.
- Постоянный uptime monitoring, paging, APM и полноценная observability-платформа.
- Перенос backend с Railway, изменение Neon topology или новая DB migration.
- Широкая модернизация Sadhana workflows сверх необходимого для безопасного переноса:
  дополнительные quality gates, concurrency и прочие независимые улучшения CI.
- Публикация server IP, SSH key material, Railway targets и certificate identifiers
  в wayfinding/spec artifacts; необходимые значения вводятся в соответствующие
  внешние системы во время реализации, а Secrets не коммитятся.
