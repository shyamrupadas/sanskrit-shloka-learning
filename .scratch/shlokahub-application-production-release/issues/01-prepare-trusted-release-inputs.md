# 01 — Подготовить доверенный контур выпуска application

**What to build:** владелец приложения получает готовый и проверенный контур production-выпуска: общая платформа принята, repository configuration указывает на канонические production endpoints, а automation может доставлять application только в предназначенный статический root по доверенному SSH-соединению.

**Blocked by:** None — can start immediately

**Status:** awaiting-human-review
Accepted: 2026-08-02

- [x] Спецификация `production-platform-bootstrap` принята человеком; её application document root, DNS, TLS, Railway custom domain, production CORS и automation account подтверждены как готовые.
- [x] Repository Variables содержат deployment host, пользователя `deploy` и публичный `VITE_API_BASE_URL` со значением ровно `https://api.shlokahub.com` без завершающего slash.
- [x] Repository Secrets содержат согласованный private SSH key и полную `known_hosts` строку, полученную и сверенную в рамках доверенного bootstrap платформы.
- [x] Automation-пользователь входит только по ключу, не имеет `sudo` и может изменять предназначенный ShlokaHub application root, не получая административного доступа к Nginx, TLS или другим сайтам.
- [x] Значения private key, host-key строки, deployment host и иные чувствительные production-данные не записаны в repository, тикет или отчёт о проверке.

## Внешнее предусловие

Локальный граф допускает ссылки только на тикеты из этого каталога. Внешним
блокером была спецификация `production-platform-bootstrap`; она принята человеком
2026-08-02, а готовность платформы подтверждена её итоговой проверкой.

## Операторский гайд

Настройка и безопасная проверка внешних production-значений выполняются владельцем
по [runbook доверенных входов](../../../docs/operations/shlokahub-application-release-inputs.md).
Гайд не содержит фактических host, ключей, `known_hosts` или значений Secrets.
