# Автоматический production-выпуск ShlokaHub landing

Status: ready-for-agent

## Problem Statement

После выпуска application у ShlokaHub всё ещё нет канонического production landing
на `https://shlokahub.com`. Будущий landing находится в отдельном repository, а его
frontend stack намеренно ещё не выбран. При этом первый выпуск не должен зависеть от
непринятого технологического решения: достаточно минимальной статической заглушки с
детерминированным `dist/`, безопасного автоматического deploy и проверки production
адресов.

Без отдельного release contract landing может выпускаться до готовности application,
использовать непроверенный SSH host, стереть production root пустым артефактом или
оставить канонические и `www`-адреса непроверенными. Rollout также нельзя считать
завершённым без фиксации безопасных эксплуатационных данных и наблюдения за
ограниченными ресурсами общего VDS.

## Solution

В отдельном ShlokaHub landing repository создаётся минимальная статическая заглушка и
один последовательный workflow `verify/build → deploy → smoke`. Любой push в `main`
должен детерминированно предоставить `dist/index.html`: через выбранный позднее
stack-specific adapter либо как committed static artifact для первого выпуска.
После artifact guard workflow с проверенным SSH host key выполняет `rsync --delete`
в выделенный landing root.

Landing выпускается только после успешной автоматической и ручной приёмки
application. Workflow проверяет канонический landing URL и API readiness, а оператор
проверяет `www` redirects и ресурсы VDS. После четырёх первых deploy фиксируются
безопасные эксплуатационные идентификаторы и начинается ограниченный период
наблюдения за ресурсами; тариф повышается только по измеренным порогам.

## User Stories

1. Как посетитель, я хочу открыть `https://shlokahub.com`, чтобы увидеть доступный production landing ShlokaHub.
2. Как посетитель, я хочу увидеть простую понятную статическую заглушку до создания полноценного marketing-сайта, чтобы канонический домен не оставался пустым.
3. Как владелец приложения, я хочу выпустить landing только после успешной приёмки application, чтобы публичная точка входа не объявляла незавершённый rollout.
4. Как разработчик landing, я хочу хранить landing в отдельном repository, чтобы его release lifecycle не зависел от monorepo application.
5. Как разработчик landing, я хочу отложить выбор frontend stack, чтобы первый production выпуск не фиксировал необоснованное технологическое решение.
6. Как разработчик landing, я хочу иметь единый контракт `dist/index.html`, чтобы deploy workflow не зависел от внутреннего устройства будущего stack.
7. Как разработчик landing, я хочу иметь возможность выпустить committed статический `dist/index.html`, чтобы первая заглушка не требовала package manager и build toolchain.
8. Как разработчик landing, я хочу после выбора stack использовать pinned runtime, lockfile, frozen install и штатную build-команду, чтобы будущие сборки оставались воспроизводимыми.
9. Как владелец приложения, я хочу автоматически выпускать landing после каждого push в `main`, чтобы production соответствовал основной ветке без ручного запуска workflow.
10. Как разработчик landing, я хочу проверять наличие `dist/index.html` до SSH, чтобы пустой артефакт не очистил работающий landing.
11. Как владелец приложения, я хочу хранить deployment host/user отдельно от SSH Secrets, чтобы публичные connection values и чувствительные key material имели правильные области хранения.
12. Как разработчик landing, я хочу использовать заранее проверенную `known_hosts` строку, чтобы workflow не доверял runtime `ssh-keyscan`.
13. Как владелец приложения, я хочу, чтобы landing workflow имел только read-доступ к содержимому repository, чтобы GitHub token не получал лишних разрешений.
14. Как владелец приложения, я хочу запретить отмену начавшегося deploy новым push, чтобы неатомарный `rsync` не смешивал два releases.
15. Как разработчик landing, я хочу синхронизировать только готовый `dist/` в отдельный landing root, чтобы VDS не содержал исходники и build toolchain.
16. Как владелец приложения, я хочу удалять устаревшие landing-файлы при deploy, чтобы production root соответствовал текущему artifact.
17. Как посетитель, я хочу, чтобы канонический landing URL отвечал по HTTPS после deploy, чтобы основная публичная ссылка работала безопасно.
18. Как владелец приложения, я хочу проверять API readiness вместе с landing release, чтобы завершение rollout подтверждало доступность не только статической страницы, но и production backend.
19. Как посетитель, я хочу, чтобы `www.shlokahub.com` перенаправлял на канонический landing с сохранением path и query, чтобы старые или альтернативные ссылки не теряли контекст.
20. Как пользователь application, я хочу, чтобы `www.app.shlokahub.com` перенаправлял на канонический application с сохранением path и query, чтобы весь ShlokaHub URL contract был проверен к завершению rollout.
21. Как разработчик landing, я хочу получать красный workflow при ошибке production smoke-check, чтобы неуспешный выпуск был виден сразу.
22. Как владелец приложения, я хочу исправлять неуспешный landing release через `git revert` и новый push, чтобы использовать тот же простой rollback contract, что и application.
23. Как оператор, я хочу повторно проверить память, swap, диск и OOM после landing deploy, чтобы подтвердить, что четвёртый сайт помещается на VDS.
24. Как оператор, я хочу зафиксировать фактические targets и identifiers вне repository без Secrets, чтобы дальнейшее обслуживание не зависело от памяти участников.
25. Как оператор, я хочу снять показатели ресурсов после каждого из четырёх первых deploy, чтобы иметь baseline общего VDS.
26. Как оператор, я хочу проверять показатели ежедневно первую неделю и затем еженедельно, чтобы вовремя заметить исчерпание диска или памяти.
27. Как владелец приложения, я хочу повышать тариф до 2 ГБ RAM и 50 ГБ диска только при достижении согласованных порогов, чтобы масштабирование было основано на данных.
28. Как владелец приложения, я хочу не создавать отдельный VDS без измеренной необходимости, чтобы MVP-инфраструктура оставалась простой.
29. Как владелец приложения, я хочу считать rollout завершённым только после проверки application, landing, API, redirects и host resources, чтобы итоговая приёмка охватывала весь production-контракт.

## Implementation Decisions

- Эта спецификация реализуется после `shlokahub-application-production-release`; landing deploy запрещён до успешных автоматических и ручных application checks.
- Landing живёт в отдельном repository и выпускается из ветки `main`.
- Первый landing — минимальная статическая заглушка с простым текстом. Конкретный frontend framework или generator не фиксируется.
- Единственный обязательный build interface — готовый `dist/index.html`. Для первого выпуска допустим committed static artifact без install/build.
- После появления stack workflow обязан использовать закреплённые runtime/package-manager версии, repository lockfile, frozen/immutable install и штатную production build-команду. Эти команды не выбираются данной спецификацией.
- Workflow запускается на любой push в `main` без path filters и без ручного `workflow_dispatch`.
- Workflow состоит из одного последовательного job: checkout, опциональный stack-specific install/build, artifact guard, SSH/rsync deploy и smoke.
- GitHub token получает только `contents: read`.
- Landing имеет отдельную concurrency group с `cancel-in-progress: false`; следующий deploy ждёт завершения текущего.
- Deployment host и пользователь `deploy` хранятся как Repository Variables; общий private key и проверенная `known_hosts` строка — как Secrets.
- SSH использует batch/key-only режим и строгую host-key verification. Runtime `ssh-keyscan` запрещён.
- Artifact guard подтверждает `dist/index.html` до SSH и до операции, способной удалить production-файлы.
- Содержимое `dist/` синхронизируется прямым `rsync --delete` в выделенный ShlokaHub landing root. Node.js, package manager и build tools на VDS не нужны.
- После deploy workflow автоматически проверяет `https://shlokahub.com/` и `https://api.shlokahub.com/health/ready` с fail-on-error и ограниченными retries.
- Первый выпуск дополнительно принимается ручной проверкой канонического landing и постоянных redirects с обоих `www`-имён с сохранением path/query.
- Ошибка smoke-check делает workflow неуспешным, но не откатывает файлы автоматически. Исправление или rollback выполняется через новый commit, обычно `git revert`, и push в `main`.
- После landing deploy повторно проверяются ресурсы VDS. Фактические эксплуатационные targets/identifiers фиксируются вне repository без key material и Secret values.
- После каждого из четырёх первых deploy снимаются диск, `MemAvailable`, swap, OOM, load, traffic и размеры журналов; первая неделя наблюдается ежедневно, затем еженедельно.
- Первый шаг масштабирования — upgrade существующего VDS до 2 ГБ RAM / 50 ГБ диска только по согласованным измеримым признакам. Отдельный VDS заранее не создаётся.
- Изменения application, backend, API contract, DNS/TLS topology, схемы БД и новые DB migrations не требуются.

## Testing Decisions

- Главный тестовый шов — публичный production-контракт: `https://shlokahub.com/`, API readiness и оба `www` redirect. Хороший тест проверяет наблюдаемые HTTPS status/Location и сохранение path/query, не внутреннюю структуру landing repository или workflow.
- Artifact guard тестирует единственный стабильный build interface `dist/index.html`. Внутренние файлы будущего stack не входят в контракт спецификации.
- Автоматический smoke-check запускается после фактического `rsync`, чтобы красный workflow отражал состояние production, а не только локального artifact.
- API readiness остаётся частью landing smoke-check как сквозная проверка завершённого ShlokaHub rollout.
- Ручная проверка redirects использует URL с path и query, чтобы подтвердить не только canonical hostname, но и сохранение полного request target.
- Prior art для deployment — application workflow из предыдущей спецификации: тот же минимальный permission set, verified host key, последовательная concurrency, artifact guard, прямой `rsync --delete` и fail-on-error smoke.
- Если первый landing является чистым committed HTML, новые unit tests не требуются: внешний production smoke является более высоким и полезным seam. После выбора frontend stack его собственные lint/test gates добавляются отдельным решением, если этого потребует реальная логика.
- Host resource checks являются эксплуатационными acceptance checks, а не unit tests. Они сравниваются с baseline и порогами общей платформы.
- Проверки и отчёты не выводят private key, host IP, Secret values, пользовательские данные или access tokens.

## Out of Scope

- Выбор и внедрение полноценного frontend stack для landing.
- Полноценный marketing-дизайн, интерактивные блоки, формы, аналитика, CMS, SEO effort и Pencil UI contract.
- Изменение ShlokaHub application или его release workflow.
- Bootstrap VDS, перенос Sadhana, создание DNS-записей, выпуск сертификатов и Railway custom domain.
- Cloudflare proxy/CDN/WAF, автоматическое управление DNS и Cloudflare API token.
- Атомарные release-каталоги, автоматический rollback и хранение releases на VDS.
- Ручной workflow dispatch, GitHub Environment approval и отдельный promotion pipeline.
- Постоянный uptime monitoring, paging, APM и полноценная observability-платформа.
- Немедленный upgrade тарифа или отдельный VDS без измеренных признаков нехватки ресурсов.
- Разделение общего automation user и SSH-ключа между repositories.
- Изменения backend/Neon и новые DB migrations.

## Further Notes

- Источник решений — шаги 8–9 итогового production-плана карты `shlokahub-vds-production`.
- Поскольку stack намеренно не выбран, `dist/index.html` является границей между landing implementation и deployment. Эта граница позволяет выпустить минимальную заглушку без преждевременного архитектурного решения.
- Landing завершает последовательность: platform bootstrap → application production release → landing production release.
- Спецификация готова к декомпозиции через `to-tickets`: dependency, artifact contract, workflow, smoke-check, rollback и post-rollout наблюдение определены.
