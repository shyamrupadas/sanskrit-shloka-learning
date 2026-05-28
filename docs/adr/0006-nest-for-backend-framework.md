# Использовать Nest как бэкенд-фреймворк

Для `apps/api` используем Nest. Бэкенд MVP включает несколько связанных модулей: authentication/accounts, authorization/roles, shloka catalog, user shloka progress, repetition history, repetition algorithm, streak calculation, settings/preferences и admin shloka management; Nest дает стандартную модульную структуру, dependency injection, guards, pipes и testing patterns для такой формы приложения.

**Рассмотренные варианты**

- Использовать Nest и принять его модульную архитектуру как стандарт для `apps/api`.
- Использовать Fastify напрямую и самостоятельно задавать модульные границы, DI-подход и testing conventions.

**Последствия**

Nest добавляет больше framework-структуры, чем минимальный Fastify, но снижает количество архитектурных решений, которые нужно принимать вручную на старте. Это особенно полезно для AI-first разработки: структура модулей, providers, controllers, guards и tests является узнаваемой и хорошо документируемой. Fastify может использоваться под капотом Nest позже, если это понадобится, но публичной архитектурной формой `apps/api` остается Nest.
