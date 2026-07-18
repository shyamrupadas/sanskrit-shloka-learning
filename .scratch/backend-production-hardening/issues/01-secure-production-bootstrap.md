# Сделать production bootstrap fail-fast и безопасным

Status: ready-for-human
Accepted: 2026-07-16

## Родитель

`.scratch/backend-production-hardening/spec.md` — пользовательские истории 9–11, 20–22, 34 и 37.

## Что сделать

Провести один полный срез через production bootstrap API: приложение должно собрать и проверить конфигурацию до открытия HTTP-порта, запуститься на Railway-compatible host/port и сразу применять согласованные HTTP guardrails.

Production использует только environment платформы, один точный frontend origin, базовые security headers и локальный rate limit для публичных auth endpoints. Development продолжает поддерживать локальный dotenv. HTTP-запросы получают безопасный request ID и структурированный access log без секретов.

Срез не добавляет runtime-валидацию DTO, не меняет Bearer-сессию и не вводит глобальный rate limit на продуктовые endpoints.

## Критерии приемки

- [x] Существует одна небольшая типизированная граница конфигурации, которая до запуска сервера проверяет environment mode, port, frontend origin, pooled database URL и direct migration URL в production.
- [x] Production не читает dotenv-файлы и завершается с понятной безопасной ошибкой при отсутствующем или некорректном обязательном значении.
- [x] Development и test сохраняют поддержку локального dotenv и удобные локальные defaults, не попадающие в production-конфигурацию.
- [x] API слушает `0.0.0.0` и значение `PORT`; невалидный порт не превращается в позднюю ошибку `listen`.
- [x] CORS разрешает только настроенный production origin, необходимые методы и заголовки `Content-Type`/`Authorization`; wildcard и reflection произвольного origin отсутствуют.
- [x] CORS credentials выключены для текущей Bearer-аутентификации; запрос без `Origin` не блокируется как browser CORS-запрос.
- [x] API возвращает базовые Helmet security headers без изменения существующего JSON API-контракта.
- [x] Login и register защищены умеренным in-memory rate limit и возвращают `429` после превышения; остальные endpoints не получают неожиданно строгий auth-лимит.
- [x] Proxy trust ограничен ожидаемым Railway proxy path; произвольный клиентский `X-Forwarded-For` не позволяет тривиально обходить rate limit.
- [x] Каждый HTTP-запрос получает или продолжает безопасный request ID; access log содержит метод, route, status и duration.
- [x] Authorization header, session token, пароль, request body и персональные данные не попадают в access log или startup error.
- [x] Автоматические тесты проверяют env parsing, production fail-fast, development dotenv policy, CORS allowlist, security headers и auth throttling через наиболее высокую существующую HTTP/bootstrap границу без нового тяжелого harness.
- [x] Существующие API tests, typecheck и production build проходят; frontend, API product contract и схема БД не меняются.

## Заблокировано

Нет - можно начинать сразу

## Результат

- Production bootstrap валидирует конфигурацию до создания Nest-приложения и слушает Railway-compatible `0.0.0.0:$PORT`.
- HTTP-граница применяет точный CORS allowlist, Helmet headers, локальный auth rate limit, безопасный request ID и структурированный access log.
- API integration tests проверяют production fail-fast, dotenv policy, CORS, headers, auth throttling и защиту от spoofed forwarded addresses.
