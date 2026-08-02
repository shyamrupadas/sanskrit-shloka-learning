# Bootstrap общей production-платформы на VDS

Status: awaiting-human-review
Accepted: 2026-08-02

## Problem Statement

Production frontend ShlokaHub всё ещё связан с временным Netlify-контрактом, backend
доступен только по Railway-generated адресу, а новый VDS ещё не подготовлен для
безопасного размещения четырёх статических сайтов. Одновременно два действующих сайта
Sadhana должны быть перенесены на новый сервер без широкой модернизации их release
pipelines.

Владелец приложения не может начать автоматические выпуски ShlokaHub, пока не
согласованы и не реализованы общий host security baseline, изолированные document
roots, DNS и TLS, безопасный SSH-доступ из GitHub Actions, точный production CORS
origin и публичный API domain. Ошибка порядка действий может оставить Sadhana
недоступным, направить frontend на неверный API, ослабить проверку SSH host key или
раскрыть чувствительные runtime-значения в репозитории.

## Solution

Новый Ubuntu VDS становится контролируемой общей production-платформой для двух
сайтов Sadhana и двух сайтов ShlokaHub. На нём настраиваются отдельные статические
virtual hosts, ограниченные административный и automation-доступы, firewall,
Fail2ban, управляемые журналы, автоматические security updates и условный swap.
Сборка Node.js на сервере не выполняется: VDS только принимает готовые статические
артефакты и раздаёт их через Nginx.

Rollout выполняется по проверяемым этапам. Сначала удаляется прежний Netlify
production contract и Railway backend переключается на точный origin будущего
application frontend. Затем поднимается и проверяется VDS, на него переносятся оба
сайта Sadhana, после чего настраиваются Railway custom domain, Cloudflare DNS и TLS
для ShlokaHub. Результатом становится готовая платформа, на которую следующие
спецификации последовательно выпускают application, а затем landing.

## User Stories

1. Как владелец приложения, я хочу убрать Netlify из актуального production-контракта ShlokaHub, чтобы документация и конфигурация не указывали на больше не используемую платформу.
2. Как разработчик, я хочу сохранить отдельный localhost origin для локальной разработки, чтобы production cutover не нарушил локальный запуск приложения.
3. Как владелец приложения, я хочу заранее установить в Railway единственный точный `FRONTEND_ORIGIN=https://app.shlokahub.com`, чтобы production API принимал браузерные запросы только от будущего канонического application frontend.
4. Как владелец приложения, я хочу исключить `localhost` и прежний Netlify origin из production CORS allowlist, чтобы переходный режим не ослаблял production-политику.
5. Как оператор, я хочу до bootstrap проверить фактическую версию Ubuntu, свободные диск и память, swap и recovery channel, чтобы план опирался на реальное состояние нового VDS.
6. Как оператор, я хочу иметь отдельную административную учётную запись с `sudo`, чтобы выполнять ручное обслуживание без прямого входа под `root`.
7. Как оператор, я хочу проверить вход и `sudo` административной учётной записи до запрета `root`, чтобы не потерять управляемый доступ к серверу.
8. Как разработчик, я хочу иметь отдельного automation-пользователя без пароля и `sudo`, чтобы GitHub Actions мог обновлять только статические артефакты.
9. Как владелец приложения, я хочу запретить automation-пользователю forwarding, tunnels и интерактивную аутентификацию, чтобы общий CI-ключ давал минимально необходимый доступ.
10. Как владелец приложения, я хочу запретить прямой SSH-вход под `root`, чтобы уменьшить поверхность атаки на VDS.
11. Как оператор, я хочу применять SSH-конфигурацию только после синтаксической проверки и проверки матрицы доступа, чтобы hardening не заблокировал управление сервером.
12. Как владелец приложения, я хочу иметь отдельный document root для каждого из четырёх сайтов, чтобы их артефакты и Nginx routing не смешивались.
13. Как разработчик, я хочу, чтобы deployment roots принадлежали automation-пользователю, а Nginx имел только read-доступ, чтобы deploy не требовал `sudo`.
14. Как пользователь Sadhana, я хочу продолжать открывать landing и application по прежним каноническим адресам, чтобы перенос инфраструктуры не менял пользовательские ссылки.
15. Как пользователь ShlokaHub, я хочу открывать landing и application по каноническим HTTPS-адресам, чтобы у продукта были стабильные production entry points.
16. Как пользователь, я хочу, чтобы прямое открытие вложенного application route возвращало SPA, чтобы bookmark и обновление страницы работали.
17. Как владелец сайта, я хочу, чтобы неизвестный `Host` не попадал ни на один из четырёх сайтов, чтобы default virtual host не раскрывал чужой контент.
18. Как пользователь, я хочу автоматически переходить с HTTP на HTTPS, чтобы production-трафик использовал защищённое соединение.
19. Как пользователь ShlokaHub, я хочу, чтобы `www`-адрес landing постоянно перенаправлял на канонический адрес с сохранением path и query, чтобы не возникало дублей URL.
20. Как оператор, я хочу открыть снаружи только TCP-порты `22`, `80` и `443`, чтобы VDS не публиковал ненужные сервисы.
21. Как оператор, я хочу включить SSH-защиту Fail2ban, чтобы повторные неуспешные попытки входа временно блокировались.
22. Как оператор, я хочу ограничить рост system journals и сохранить штатную rotation журналов Nginx, UFW и Fail2ban, чтобы 10 ГБ диска не заполнялись логами.
23. Как оператор, я хочу ежедневно получать security updates без автоматической перезагрузки, чтобы исправления устанавливались регулярно, а перезапуск оставался контролируемым.
24. Как оператор, я хочу добавить swap размером 1 ГБ только при достаточном свободном месте, чтобы кратковременный дефицит памяти не создавал OOM без риска заполнить маленький диск.
25. Как владелец приложения, я хочу использовать один общий проверенный CI-ключ для четырёх repositories как явно принятый MVP-компромисс, чтобы не усложнять первый rollout.
26. Как разработчик, я хочу получать SSH host key через доверенный канал и хранить точную `known_hosts` строку в GitHub Secrets, чтобы workflow не доверял подменяемому runtime `ssh-keyscan`.
27. Как разработчик Sadhana, я хочу заменить только connection values и небезопасную host-key verification, чтобы перенос не превратился в независимую переработку существующих workflows.
28. Как пользователь Sadhana, я хочу, чтобы оба сайта были проверены на новом VDS до DNS cutover, чтобы риск простоя при переключении был ограничен.
29. Как владелец Sadhana, я хочу сохранить Railway API и почтовые DNS-записи без изменений, чтобы перенос статических сайтов не затронул несвязанные сервисы.
30. Как оператор, я хочу выпустить и проверить отдельные сертификаты для Sadhana landing и application после DNS cutover, чтобы оба существующих сайта снова обслуживались по HTTPS.
31. Как владелец ShlokaHub, я хочу привязать `api.shlokahub.com` к существующему Railway backend, чтобы frontend не зависел от generated hostname.
32. Как оператор, я хочу создать только выданные Railway CNAME и TXT records в режиме Cloudflare `DNS only`, чтобы ownership и TLS API подтверждались штатным способом Railway.
33. Как пользователь ShlokaHub, я хочу получать успешный readiness-ответ по публичному API domain, чтобы application release мог проверить реальный production маршрут.
34. Как оператор, я хочу создать три статические DNS-записи ShlokaHub в режиме `DNS only`, чтобы TLS статических сайтов выпускал и обновлял Certbot на VDS.
35. Как оператор, я хочу выпускать отдельные certificate groups для landing- и application-имён ShlokaHub, чтобы TLS lifecycle соответствовал границам сайтов.
36. Как оператор, я хочу проверить автоматическое обновление сертификатов, Nginx-конфигурацию, SSH, firewall, ownership и ресурсы, чтобы платформа была готова до первого ShlokaHub deploy.
37. Как владелец приложения, я хочу хранить IP, ключи, Railway targets и certificate identifiers только в предназначенных внешних системах, чтобы чувствительные и изменяемые runtime-значения не попали в planning artifacts и repository.
38. Как владелец приложения, я хочу повышать тариф одного VDS только по измеренным признакам нехватки ресурсов, чтобы не создавать отдельный сервер или лишние расходы заранее.

## Implementation Decisions

- Спецификация охватывает первые шесть этапов итогового production rollout: удаление Netlify contract, раннее переключение Railway CORS, bootstrap VDS, перенос двух сайтов Sadhana, Railway custom domain для API и подготовку DNS/Nginx/TLS для ShlokaHub.
- Из актуальной repository-конфигурации и operational-документации удаляется утверждение, что Netlify является production frontend. Документация фиксирует `https://app.shlokahub.com` как канонический production origin и сохраняет отдельный `http://localhost:5173` для локальной разработки.
- Production Railway service получает ровно один `FRONTEND_ORIGIN`: `https://app.shlokahub.com`. Изменение применяется до frontend cutover и намеренно завершает поддержку прежнего Netlify frontend; после Railway deployment проверяется generated readiness endpoint.
- Используется уже созданный VDS с фактически установленной Ubuntu. До изменений оператор сверяет release, ресурсы, swap и аварийный доступ через доверенную VDSina console.
- На VDS устанавливаются Nginx, UFW, Fail2ban, Certbot и системные средства обслуживания. Node.js, package manager и production build toolchain на VDS не устанавливаются.
- Создаются две host-учётные записи: ручной `admin` с паролем и `sudo`, а также `deploy` без пароля и `sudo`. Прямой root login запрещается; `deploy` допускается только по ключу и без forwarding/tunnels.
- SSH hardening применяется только после синтаксической проверки и проверки отдельных сессий `admin`, `deploy` и запрещённого `root`. Аварийный console-доступ сохраняется.
- Четыре сайта получают независимые document roots, принадлежащие `deploy:deploy`. Nginx только читает их; `deploy` не управляет Nginx, systemd или сертификатами.
- Один общий публичный CI-ключ авторизуется для `deploy` и используется workflows четырёх repositories. Это ограниченный MVP-риск; разделение ключей и пользователей отложено.
- Проверенный SSH host key извлекается через доверенную bootstrap-сессию, сверяется по fingerprint и передаётся workflows как `SSH_KNOWN_HOSTS`. Runtime `ssh-keyscan` не используется, `StrictHostKeyChecking=yes` обязателен.
- Nginx обслуживает отдельные landing и application virtual hosts для Sadhana и ShlokaHub. Application hosts используют SPA fallback; landing hosts раздают существующие статические пути. Безопасный default host не выдаёт содержимое сайтов.
- Канонические ShlokaHub URL — `https://shlokahub.com` и `https://app.shlokahub.com`. Только `www.shlokahub.com` выполняет постоянный redirect на канонический landing с сохранением path и query; `www`-имя для application не поддерживается.
- UFW использует deny incoming / allow outgoing и публикует только TCP `22`, `80`, `443`. Fail2ban защищает SSH через UFW с согласованными ограничениями повторных попыток.
- Journald ограничивается размером 200 МБ и обязан оставлять 2 ГБ свободного места; штатные rotation rules остальных журналов проверяются. Security updates выполняются ежедневно, automatic reboot выключен.
- Если swap отсутствует и после обновления доступно не менее 3 ГБ диска, создаётся swap-файл 1 ГБ. При меньшем запасе сначала освобождается место или повышается тариф; `vm.swappiness` заранее не меняется.
- Перенос Sadhana ограничивается новыми connection values, проверенным host key, первым deploy и production smoke-check. Существующие branch triggers, install/build, `rsync --delete`, deploy destinations и отсутствие ручного dispatch сохраняются.
- Sadhana DNS cutover меняет только A-записи landing, `www` и application на новый VDS в режиме `DNS only`. Railway API CNAME и почтовые записи не меняются.
- Для Sadhana выпускаются отдельные сертификаты landing-группы и application; `www` landing перенаправляется на канонический landing. Короткое контролируемое окно TLS между DNS cutover и выдачей сертификатов принято.
- `api.shlokahub.com` добавляется к существующему Railway backend service. Cloudflare получает точные CNAME и TXT, выданные Railway, в режиме `DNS only`; Railway управляет TLS этого имени.
- Три статических имени ShlokaHub получают A-записи на VDS в режиме `DNS only`. Certbot управляет двумя certificate groups: landing с его `www`-именем и application без `www`-имени.
- До первых ShlokaHub deployments пустые roots могут возвращать `404`; готовность платформы определяется корректными DNS, TLS, routing и host checks, а не наличием ещё не выпущенного артефакта.
- Фактические IP, private key, host-key строка, Railway targets, certificate identifiers и Secret values не записываются в repository или спецификацию. Публичные connection values задаются в repository Variables, чувствительные — в Secrets.
- Bootstrap считается завершённым только после восстановления обоих production-сайтов Sadhana, успешного публичного `https://api.shlokahub.com/health/ready` и готовности статических ShlokaHub virtual hosts и TLS.
- Следующая спецификация `shlokahub-application-production-release` начинает реализацию только после завершения этой платформенной спецификации.
- Изменения схемы БД и новые DB migrations не требуются.

## Testing Decisions

- Главный тестовый шов — внешний production-контракт через публичные HTTPS-адреса. Хороший тест наблюдает DNS resolution, TLS, HTTP status, redirect target, SPA fallback и API readiness, не проверяя внутреннее устройство workflow или Nginx template.
- Для каждого этапа используется проверка самого высокого доступного интерфейса: Railway deployment/readiness для раннего CORS change; HTTP virtual-host responses до DNS cutover; публичные Sadhana URL после cutover; публичный API domain и статические ShlokaHub имена после DNS/TLS.
- Redirect-проверки обязаны подтверждать постоянный status и сохранение path/query. Application-проверки обязаны открывать вложенный route напрямую, а неизвестный `Host` не должен получать ни один сайт.
- Host diagnostics дополняют внешний seam: проверяются синтаксис и effective state SSH/Nginx, матрица входов, firewall rules, открытые порты, ownership, Certbot dry run, диск, `MemAvailable`, swap, OOM, load, traffic, размеры журналов и наличие `reboot-required`.
- Для переноса Sadhana prior art — существующие workflows прямого `rsync --delete`; сохраняется их внешний deploy-контракт, но runtime host-key discovery заменяется заранее проверенным `known_hosts`.
- Для Railway prior art — существующий production runbook и health controller tests, которые уже фиксируют `/health/ready` как release gate. В рамках этой спецификации runtime API-код и эти тесты не меняются.
- Для CORS prior art — существующие env-validation и API startup tests, которые требуют один точный HTTP(S) origin. Принимается dashboard-настройка конкретного production origin и ручной browser preflight на следующем application release.
- Новые продуктовые unit/component tests не нужны: спецификация не меняет пользовательскую логику или UI. Автоматизация инфраструктурных проверок может жить в workflows/runbooks, но должна проверять наблюдаемое поведение, а не текст конфигурационных файлов.
- Проверки не должны печатать private key, connection strings, пароли, токены или полные Secret values. Отчёт сохраняет только безопасные результаты, timestamps и идентификаторы, допустимые для эксплуатации.

## Out of Scope

- Выпуск ShlokaHub application и landing артефактов; они описаны следующими двумя спецификациями.
- Cloudflare proxy/CDN/WAF, автоматизация DNS и Cloudflare API token на VDS.
- Ограничение SSH по динамическим адресам GitHub-hosted runners.
- Атомарные release-каталоги, автоматический rollback, Docker, Kubernetes, self-hosted runner и containerization.
- Отдельный VDS для ShlokaHub или немедленный upgrade тарифа без измеренной нехватки ресурсов.
- Широкая модернизация Sadhana workflows: новые quality gates, permissions, concurrency и прочие независимые CI-улучшения.
- Перенос backend с Railway, изменение Neon topology и новые DB migrations.
- Удаление Railway-generated backend hostname до успешной проверки custom domain.
- Постоянный uptime monitoring, paging, APM и полноценная observability-платформа.
- Публикация фактических IP, SSH key material, Railway targets, certificate identifiers или Secrets в repository и planning artifacts.

## Further Notes

- Источник решений — карта `shlokahub-vds-production` и её семь resolved decisions; новых planning-решений в этой спецификации не вводится.
- Rollout сознательно принимает два временных окна: прежний Netlify frontend перестаёт проходить production CORS после раннего переключения Railway, а Sadhana может кратко получить TLS-ошибку между DNS cutover и выпуском сертификата.
- После bootstrap и каждого первого deploy снимаются показатели ресурсов. Первую неделю они проверяются ежедневно, затем еженедельно. Сначала повышается тариф одного VDS до 2 ГБ RAM / 50 ГБ диска; отдельный VDS рассматривается только как последующая изоляция отказов.
- Спецификация готова к декомпозиции через `to-tickets`: порядок действий, внешние handoffs, security baseline и тестовые seams определены.
