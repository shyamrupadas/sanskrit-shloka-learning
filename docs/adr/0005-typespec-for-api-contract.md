# Использовать TypeSpec как источник API-контракта

Для API-контракта между `apps/web` и `apps/api` используем TypeSpec в `packages/api-contract`. Файлы `.tsp` являются source of truth для публичного HTTP/API-контракта; из них генерируются OpenAPI и TypeScript-артефакты, которые потребляют фронтенд и бэкенд.

Сгенерированные артефакты контракта коммитятся в репозиторий: OpenAPI spec, frontend API client и backend server contract artifacts. Они нужны для самодостаточного локального запуска, статического анализа типов, review изменений контракта и AI-first разработки. Эти файлы нельзя редактировать вручную; CI должен проверять, что они актуальны после генерации из TypeSpec.

**Рассмотренные варианты**

- Описывать API-контракт Zod/schema-first в TypeScript и выводить типы из Zod-схем.
- Использовать TypeSpec-first и генерировать OpenAPI и TypeScript-артефакты из отдельного контрактного языка.
- Использовать tRPC и сильнее связать фронтенд и бэкенд через TypeScript runtime.
- Генерировать TypeScript-артефакты только во время локального build/CI и не коммитить их.

**Последствия**

TypeSpec-first добавляет начальную стоимость настройки генерации и проверки контракта, но делает API-контракт явной архитектурной границей monorepo. Zod не является source of truth для API-контракта, но может использоваться локально для frontend-форм, backend env validation и внутренних runtime-проверок, если это не дублирует публичный API-контракт.

Коммит generated-кода увеличивает размер diff-ов и требует дисциплины, но делает репозиторий более самодостаточным: после checkout IDE, typecheck и AI-инструменты видят контрактные типы без предварительного generation step. Для предотвращения расхождения source и generated artifacts нужна отдельная проверка актуальности в CI.

**Backend artifacts**

Для `apps/api` генерируем backend contract artifacts в форме TypeScript-типов операций и handler interfaces. Nest controllers, guards, pipes, modules и providers остаются ручным кодом `apps/api`; generated-код не создает Nest controllers, server stubs или application services.

Toolchain строится вокруг TypeSpec как source of truth: TypeSpec генерирует OpenAPI, затем repo-owned generator в `packages/api-contract` генерирует TypeScript-типы схем, request/response types и handler interfaces для backend-операций. Не используем third-party OpenAPI server stub generator как owner backend HTTP-слоя. Backend artifacts лежат в `packages/api-contract/generated/backend/` и коммитятся вместе с OpenAPI и frontend API client. Все файлы в generated-директориях считаются generated-only и не редактируются вручную.

Интеграция с Nest идет через тонкий boundary: controller или рядом стоящий handler/provider в `apps/api` должен типизироваться через generated operation interfaces. Внутренние сервисы `apps/api` используют собственные доменные модели и маппят их в контрактные response-типы на HTTP-границе. Это сохраняет Nest-модульность и одновременно заставляет typecheck ловить расхождение реализации с публичным API-контрактом.

В MVP generated backend artifacts не выполняют runtime validation request/response. Входящие запросы могут дополнительно проверяться ручными Nest pipes там, где это нужно для пользовательских ошибок или защиты инвариантов, но эти проверки не становятся source of truth для публичного API-контракта. Если позже понадобится runtime validation по OpenAPI, ее можно добавить как отдельный слой на HTTP boundary без перехода на generated server stubs.

CI должен запускать генерацию контракта и падать при незакоммиченном diff в generated artifacts, а также запускать typecheck для `apps/api`. Так проверяется, что TypeSpec, OpenAPI, frontend client и backend handler interfaces синхронизированы, а backend implementation по-прежнему соответствует типизированному контракту.
