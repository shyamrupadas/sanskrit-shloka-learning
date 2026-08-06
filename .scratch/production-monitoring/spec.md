# Простой monitoring общей production-платформы через HetrixTools

Status: ready-for-agent

## Problem Statement

На общей VDS размещены четыре публичных статических сайта: landing и application
frontend Sadhana, а также landing и application frontend ShlokaHub. Два backend
работают отдельно в Railway и используют Neon. Поэтому успешная загрузка frontend
не подтверждает доступность backend или базы данных, а отказ одной VDS одновременно
затрагивает все четыре статических сайта.

Настроенные уведомления VDSina покрывают баланс, оплату, окончание услуги, трафик и
другие события хостинга, но не предупреждают о заполнении root filesystem, нехватке
RAM, устойчивом использовании swap, высокой load average, падении Nginx или
недоступности конкретного production endpoint. Ручные замеры после rollout
зафиксировали baseline, но не создают постоянного alerting.

Владелец приложений принимает установку лёгкого HetrixTools Server Monitoring Agent
на VDS и внешние проверки чаще первоначально обсуждавшегося почасового интервала.
Проверки сайтов и backend должны выполняться с наименьшей поддерживаемой HetrixTools
частотой — раз в 10 минут. Для MVP не требуется отдельная 30-минутная задержка:
HetrixTools делает штатные быстрые retry внутри одного checkup cycle, подтверждает
outage большинством locations и сразу отправляет alert. Решение должно предупреждать
по email и в Telegram, оставаться простым в обслуживании и не требовать собственной
observability-платформы.

## Solution

Production monitoring строится вокруг HetrixTools. Шесть независимых внешних Website
Uptime Monitor раз в 10 минут проверяют четыре публичных frontend и readiness двух
backend. Для HTTPS проверяются итоговый успешный status, ожидаемый marker ответа,
TLS hostname/validity и срок сертификата. Проверки выполняются из нескольких
HetrixTools locations, а outage подтверждается согласованным большинством locations
после штатных быстрых retry внутри одного checkup cycle. Дополнительный alert delay
не задаётся, поэтому устойчивый отказ обнаруживается не позднее следующей плановой
10-минутной проверки плюс время retry и доставки уведомления.

Седьмой monitor представляет общую VDS. На неё устанавливается официальный Linux
Server Monitoring Agent HetrixTools. Он передаёт штатные resource metrics и статусы
обязательных процессов; в dashboard настраиваются простые независимые предупреждения
по disk, RAM, swap и load. Сам heartbeat monitor предупреждает об отсутствии agent
data; отдельный дублирующий `Agent data warning` не включается. Nginx, SSH и Fail2ban
включаются в process-based service monitoring. Agent не исправляет состояние сервера,
не перезапускает сервисы и не меняет тариф.

ShlokaHub использует существующие `/health/live` и `/health/ready`; readiness
подтверждает доступ к Neon и является основным production contract. Sadhana получает
аналогичные публичные health endpoints: liveness не обращается к базе, readiness
выполняет короткий `SELECT 1`. Каждый backend получает отдельный внешний monitor,
поэтому его alert и история не смешиваются с VDS или другим backend.

Email и Telegram входят в общую HetrixTools Contact List. Существующие уведомления
VDSina сохраняются как отдельный слой для оплаты, срока услуги и провайдерского
трафика.

## User Stories

1. Как владелец приложений, я хочу получать понятное уведомление при проблеме production, чтобы не обнаруживать отказ случайно от пользователей.
2. Как владелец приложений, я хочу использовать готовый monitoring service, чтобы не поддерживать собственный сборщик метрик и dashboard.
3. Как владелец приложений, я хочу получать alert по email, чтобы иметь независимую историю инцидентов.
4. Как владелец приложений, я хочу получать тот же alert в Telegram, чтобы быстро увидеть проблему с телефона.
5. Как оператор, я хочу использовать одну Contact List для всех production monitor, чтобы изменения получателей применялись последовательно.
6. Как оператор, я хочу проверять Sadhana landing снаружи по его каноническому HTTPS-адресу, чтобы подтвердить DNS, TLS, routing и содержимое сайта.
7. Как оператор, я хочу проверять Sadhana application frontend снаружи по его каноническому HTTPS-адресу, чтобы видеть недоступность пользовательского SPA.
8. Как оператор, я хочу проверять ShlokaHub landing снаружи по его каноническому HTTPS-адресу, чтобы подтвердить доступность landing независимо от application frontend.
9. Как оператор, я хочу проверять ShlokaHub application frontend снаружи по его каноническому HTTPS-адресу, чтобы видеть недоступность пользовательского SPA.
10. Как оператор, я хочу проверять не только HTTP status, но и стабильный marker исходного HTML каждого сайта, чтобы ошибочная страница с кодом `200` не считалась исправным production.
11. Как оператор, я хочу проверять валидность, hostname и срок TLS-сертификата, чтобы сертификат не истёк незаметно.
12. Как пользователь Sadhana, я хочу, чтобы недоступность API обнаруживалась даже при исправно загружающемся frontend, чтобы владелец узнал о фактической поломке пользовательского сценария.
13. Как пользователь ShlokaHub, я хочу, чтобы недоступность API обнаруживалась даже при исправно загружающемся frontend, чтобы владелец узнал о фактической поломке пользовательского сценария.
14. Как оператор, я хочу проверять readiness Sadhana через публичный production domain, чтобы одним запросом подтвердить DNS, TLS, Railway routing, Fastify и Neon.
15. Как оператор, я хочу проверять readiness ShlokaHub через публичный production domain, чтобы одним запросом подтвердить DNS, TLS, Railway routing, Nest API и Neon.
16. Как оператор, я хочу иметь отдельный monitor для каждого backend, чтобы alert и uptime history однозначно называли неисправный проект.
17. Как оператор, я хочу различать liveness и readiness каждого backend, чтобы deployment gate не объявлял готовым процесс без работающей базы данных.
18. Как владелец Sadhana, я хочу единый безопасный health response без диагностических деталей, чтобы monitoring не раскрывал connection strings или внутренние ошибки.
19. Как оператор, я хочу проверять сайты и backend раз в 10 минут, чтобы использовать самый редкий поддерживаемый HetrixTools uptime interval.
20. Как оператор, я хочу получать outage alert после штатных retry внутри ближайшего 10-minute cycle, чтобы не усложнять MVP отдельной задержкой и отсеивать единичный краткий сбой.
21. Как оператор, я хочу подтверждать внешний outage большинством monitoring locations, чтобы проблема одной точки HetrixTools не объявляла production недоступным.
22. Как оператор, я хочу видеть использование root filesystem, чтобы журналы или release artifacts не остановили все сайты на общей VDS.
23. Как оператор, я хочу видеть RAM вместе со swap, чтобы отличать краткий memory spike от устойчивого memory pressure.
24. Как оператор, я хочу видеть 1-, 5- и 15-minute load average, чтобы устойчивую перегрузку отличать от короткого всплеска.
25. Как оператор, я хочу получать предупреждение при неработающих Nginx, SSH или Fail2ban, чтобы отказ обязательного host service был виден без ручного входа на VDS.
26. Как оператор, я хочу, чтобы отдельный heartbeat monitor предупреждал, если Server Agent перестал передавать данные, чтобы падение VDS или агента не выглядело как отсутствие проблем.
27. Как оператор, я хочу видеть resource history в HetrixTools dashboard, чтобы сопоставить инцидент с ростом RAM, swap, load или disk.
28. Как оператор, я хочу, чтобы agent только наблюдал и сообщал, чтобы monitoring не перезапускал сервисы и не скрывал первопричину.
29. Как владелец приложений, я хочу держать Server ID и monitor reports приватными, чтобы host metadata не публиковались без отдельного решения.
30. Как оператор, я хочу проверить доставку тестового alert до приёмки, чтобы monitoring не считался готовым только по зелёному dashboard.
31. Как оператор, я хочу получить recovery notification после восстановления, чтобы инцидент имел явное окончание.
32. Как оператор, я хочу временно подавлять alerts во время согласованного maintenance window, чтобы плановые работы не создавали ложный инцидент.
33. Как владелец приложений, я хочу сохранить финансовые уведомления VDSina, чтобы технический monitoring не заменял контроль оплаты и срока услуги.
34. Как владелец приложений, я хочу повышать тариф VDS только по измеримым порогам из baseline, чтобы monitoring не провоцировал преждевременные расходы.
35. Как оператор бесплатного HetrixTools account, я хочу помнить об обязательном входе не реже одного раза в 90 дней, чтобы сервис не отключил monitor как неактивные.
36. Как разработчик, я хочу иметь воспроизводимый runbook настройки и проверки monitoring, чтобы восстановить его после замены VDS или внешнего сервиса.

## Implementation Decisions

- Внешний monitoring service — HetrixTools. Используется Uptime Monitoring Free plan,
  пока его фактические условия позволяют иметь как минимум семь требуемых monitor и
  Contact List с email и Telegram.
- Создаются семь независимых monitor: четыре Website Uptime Monitor для статических
  сайтов, два Website Uptime Monitor для backend readiness и один Server Agent
  Monitor для общей VDS. Monitor не объединяются, так как текущий лимит это позволяет.
- Все шесть внешних HTTP checks имеют `Checkup Frequency = 10 minutes`. Более частый
  интервал не включается без отдельного решения.
- Все шесть HTTP monitor используют несколько доступных географически раздельных
  locations. `Number of Triggering Locations` остаётся в штатном автоматическом режиме
  большинства `50% + 1`; отдельная тонкая настройка locations для MVP не требуется.
- `Fails Before Alert = 3` означает три быстрых retry внутри текущего checkup cycle,
  а не три 10-минутных цикла. Дополнительный `Alert After` не задаётся, повторные
  outage alerts отключены; после восстановления ожидается обычное recovery notification.
- Ожидаемое время alert при устойчивом внешнем отказе — до следующего 10-minute
  checkup плюс время retry и доставки уведомления. Это не real-time paging.
- Четыре frontend monitor используют `GET`, `HTTP 200`, `Max Redirects = 0` и точные
  публичные targets/markers, присутствующие в исходном HTML до выполнения JavaScript:
  - `https://sadhana-tracker.com/` — `<title>Sadhana Tracker</title>`;
  - `https://app.sadhana-tracker.com/` — `<title>Sadhana</title>`;
  - `https://shlokahub.com/` — `<title>Slokahub</title>`;
  - `https://app.shlokahub.com/` — `<title>Sanskrit Shloka Learning</title>`.
- Два backend monitor используют `GET`, `HTTP 200`, `Max Redirects = 0` и marker
  `"status":"ok"`:
  - `https://api.sadhana-tracker.com/health/ready`;
  - `https://api.shlokahub.com/health/ready`.
  Redirect, HTML error page, timeout, `5xx` или неверное тело считаются fail.
- Для всех HTTPS monitor включаются SSL validity/authenticity и hostname checks, а
  также expiration notification за 15 дней. Monitoring generated Railway hostnames
  не дублируется при исправных custom domains.
- На VDS устанавливается официальный Linux Server Monitoring Agent v2 HetrixTools по
  актуальной официальной инструкции. Перед установкой фиксируются источник, версия,
  создаваемые user/service/files и uninstall procedure; секретный Server ID не
  попадает в repository, ticket, screenshot или shell transcript.
- Штатный interval сбора agent metrics сохраняется. Он не переводится в почасовой
  режим: локальное sampling является частью принятого HetrixTools решения и нужно для
  осмысленных averages и resource history.
- Server Agent Monitor и его отчёт остаются private. Владелец принимает передачу
  HetrixTools технических host metadata и resource metrics, описанных официальным
  agent contract; application secrets, environment files и содержимое журналов не
  добавляются как custom variables.
- Создаётся отдельный Server Agent heartbeat monitor с `Timeout = 600 seconds` и
  `Grace = 60 seconds`. Это единственный alert об отсутствии agent data; отдельный
  `Agent data warning` не включается, чтобы не получать дубликаты. Доступность VDS
  снаружи независимо подтверждают четыре frontend monitor.
- В Server Agent `CheckServices` включается process-based monitoring для `nginx`,
  `sshd` и `fail2ban`. Перед сохранением имена сверяются с реально запущенными
  процессами. Состояние systemd units отдельно проверяется operational smoke-check,
  потому что HetrixTools не является проверкой `systemctl is-active/is-enabled`.
- Resource warnings являются независимыми ранними MVP-сигналами: root disk usage от
  70%; RAM usage от 80% в среднем за 15 минут; swap usage от 25% в среднем за 15 минут
  для существующего swap размером 1 ГБ; 15-minute load average выше `0.7`.
- Эти процентные warnings намеренно не воспроизводят составное baseline-условие
  `MemAvailable < 200 MiB` **и** `swap > 256 MiB` в трёх последовательных проверках.
  Любой warning означает только начало ручной диагностики по действующему runbook,
  где проверяются абсолютные значения, их сочетание и длительность.
- Уведомления о resource pressure используют доступное averaging window, чтобы не
  реагировать на единичный sample. Повторные уведомления по продолжающейся проблеме
  ограничиваются интервалом не чаще одного раза в час.
- HetrixTools Server Agent штатно не считается источником отдельного kernel OOM-event
  alert. После RAM/swap/service alert оператор проверяет journal на OOM. Добавление
  собственного OOM watcher не входит в эту простую конфигурацию и требует отдельного
  решения, если такой сигнал станет обязательным.
- Ни HetrixTools, ни health endpoints не выполняют auto-remediation: не очищают диск,
  не перезапускают services, не делают reboot и не повышают тариф.
- ShlokaHub сохраняет существующий health contract: liveness возвращает `200` без
  обращения к БД, readiness выполняет короткую database readiness query и возвращает
  `200` с `{"status":"ok"}` либо `503` с безопасным unavailable response.
- В отдельном repository Sadhana (`sadhana`) реализуется такой же внешний contract:
  `/health/live` не обращается к БД;
  `/health/ready` выполняет короткий `SELECT 1`; успех возвращает `200` и
  `{"status":"ok"}`, ошибка или timeout возвращает `503` и
  `{"status":"unavailable"}` без внутренних деталей.
- Railway healthcheck Sadhana после deployment использует `/health/ready`. Внешний
  HetrixTools monitor обращается к custom production domain.
- Общая Contact List включает email и Telegram для uptime failure/recovery и для
  resource/service warnings. Recovery notification требуется для uptime outage;
  для resource warning достаточно прекращения повторных warnings после нормализации.
  Перед приёмкой оба канала проверяются контролируемым test incident без остановки
  production.
- Все reports остаются private. Public status page и публикация host metadata не
  включаются.
- Для Free plan создаётся внешний календарный reminder входить в HetrixTools account
  не реже одного раза в 90 дней; переход на paid plan является допустимой альтернативой
  этой activity requirement, но не входит в реализацию.
- Существующие уведомления VDSina по балансу, ошибке автоматической оплаты, сроку и
  удалению услуги, отключению автопродления и превышению трафика сохраняются.
  HetrixTools не считается источником расчётного месячного трафика VDSina.
- Новая DB migration не требуется ни для одного backend.
- Новая ADR не требуется: решение добавляет обратимый operational monitoring поверх
  существующих границ VDS, Railway и Neon и не меняет доменную архитектуру.
- При декомпозиции кодовый ticket для health endpoints явно указывает repository
  Sadhana. Настройка HetrixTools, Railway dashboard и VDS выполняется отдельными
  operational tickets со статусом `ready-for-human`, если у агента нет подтверждённого
  доступа к соответствующей системе.

## Testing Decisions

- Новые automated tests для настройки monitoring не добавляются: это внешняя
  operational configuration, а не новая логика текущего repository.
- Приёмка ограничивается коротким ручным checklist: семь production monitor находятся
  в passing state; шесть HTTP monitor имеют правильные target, marker, интервал 10 минут,
  SSL checks, private report и Contact List; Server Agent передаёт свежие disk/RAM/swap/
  load и process data.
- Email и Telegram проверяются встроенной test notification Contact List. Synthetic
  outage, остановка production endpoints, временные monitor и искусственная resource
  pressure для приёмки не создаются.
- Для health endpoints достаточно обычной проверки `GET /health/live` и
  `GET /health/ready` во время deployment/smoke-check соответствующего backend.
  Существующие automated tests ShlokaHub не меняются в рамках этой спецификации.
- Dashboard-only действия подтверждаются безопасным checklist с публичными targets,
  markers и настройками, но без Server ID, monitor IDs, generated Railway hostnames
  или других приватных runtime values.

## Out of Scope

- Почасовой режим HetrixTools и попытка искусственно замедлить Server Agent до одного запуска в час.
- Проверки чаще одного раза в 10 минут, отдельная задержка alert, real-time paging и SLA с минутным временем обнаружения.
- Собственный repository-owned VDS checker, systemd monitoring timer, Cronitor telemetry и Cronitor account.
- Отдельный kernel OOM-event watcher, custom telemetry scripts и чтение journal внешним сервисом.
- Prometheus, Grafana, Netdata, time-series database, APM, distributed tracing и log aggregation.
- Автоматический restart сервисов, очистка диска, kill процессов, reboot VDS или upgrade тарифа по alert.
- Перенос backend с Railway, перенос Neon, изменение database topology или разделение environment.
- Отдельный VDS, high availability, failover, load balancer или несколько Railway replicas.
- Полный synthetic пользовательский сценарий с регистрацией, login и изменением данных.
- Хранение пользовательских credentials или auth tokens в external monitoring service.
- Monitoring внутренних Railway-generated domains при исправных custom production domains.
- Автоматизация VDSina billing, provider traffic accounting или изменение тарифного плана.
- Публикация monitor reports, IP VDS, Server ID, Railway targets, Neon identifiers или diagnostic logs.

## Further Notes

- Интервал 10 минут означает осознанное время обнаружения устойчивого HTTP outage до
  следующего checkup плюс штатные быстрые retry и доставка notification. Отдельной
  30-минутной задержки нет; краткий сбой отсеивается только retry и большинством
  locations.
- HetrixTools uptime monitor поддерживает checkup frequencies 1, 3, 5 и 10 минут;
  10 минут — самый редкий доступный вариант. Alert delay не уменьшает число запросов,
  а только откладывает notification.
- Server Agent локально снимает samples чаще, чем раз в минуту, и передаёт агрегированные
  resource data сервису. Это принятый компромисс ради готовых графиков и warnings;
  увеличение collection interval выше официально рекомендуемого значения запрещено.
- Бесплатный HetrixTools account требует входа в dashboard минимум один раз за 90 дней.
  Потеря monitor из-за account inactivity является operational risk и закрывается
  календарным reminder либо будущим переходом на paid plan.
- Agent передаёт больше host metadata, чем прежняя идея с минимальным Cronitor ping.
  Поэтому reports private, custom log/config collection не включается, а Server ID
  рассматривается как secret.
- HetrixTools даёт отдельные графики и warnings по ресурсам, но не заменяет ручную
  диагностику. При disk/RAM/swap/load/service alert оператор сверяет абсолютные
  значения и journal с `docs/operations/vds-security-resource-baseline.md`.
- Первым шагом масштабирования остаётся upgrade существующей VDS до 2 ГБ RAM / 50 ГБ
  диска только по действующим измеримым признакам: disk минимум 80% или free меньше
  1,5 ГБ после безопасной очистки, любой подтверждённый OOM, swap устойчиво больше
  512 МиБ либо load15 выше `1.0` вместе с latency/timeout.
- Источники по выбранному operational contract:
  [HetrixTools monitor API and frequency](https://docs.hetrixtools.com/api-add-website-ping-service-smtp-uptime-monitor/),
  [HetrixTools Server Monitoring](https://docs.hetrixtools.com/what-is-server-monitoring/),
  [resource warnings](https://docs.hetrixtools.com/set-resource-usage-warnings/),
  [agent collection interval](https://docs.hetrixtools.com/how-to-increase-linux-server-monitoring-agent-metrics-collection-intervals/),
  [service and agent warnings](https://docs.hetrixtools.com/v0-9-73-new-server-monitor-alerts/),
  [custom variables](https://docs.hetrixtools.com/server-agent-custom-variables/),
  [HetrixTools pricing](https://hetrixtools.com/pricing/uptime-monitor/).
