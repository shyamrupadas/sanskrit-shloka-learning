# 01 — Подготовить доверенный контур выпуска application

**What to build:** владелец приложения получает готовый и проверенный контур production-выпуска: общая платформа принята, repository configuration указывает на канонические production endpoints, а automation может доставлять application только в предназначенный статический root по доверенному SSH-соединению.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] Спецификация `production-platform-bootstrap` принята человеком; её application document root, DNS, TLS, Railway custom domain, production CORS и automation account подтверждены как готовые.
- [ ] Repository Variables содержат deployment host, пользователя `deploy` и публичный `VITE_API_BASE_URL` со значением ровно `https://api.shlokahub.com` без завершающего slash.
- [ ] Repository Secrets содержат согласованный private SSH key и полную `known_hosts` строку, полученную и сверенную в рамках доверенного bootstrap платформы.
- [ ] Automation-пользователь входит только по ключу, не имеет `sudo` и может изменять предназначенный ShlokaHub application root, не получая административного доступа к Nginx, TLS или другим сайтам.
- [ ] Значения private key, host-key строки, deployment host и иные чувствительные production-данные не записаны в repository, тикет или отчёт о проверке.

## Внешнее предусловие

Локальный граф допускает ссылки только на тикеты из этого каталога. Фактическим внешним блокером этого тикета остаётся принятая спецификация `production-platform-bootstrap`; первый критерий приёмки не позволяет завершить тикет до снятия этого блокера.
