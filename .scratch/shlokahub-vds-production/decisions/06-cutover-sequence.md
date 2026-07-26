# Выбрать последовательность DNS, TLS, Railway CORS и первого выпуска

Type: grilling
Status: resolved
Blocked by: 02 - Проверить DNS, TLS и Railway custom domain; 04 - Выбрать точную схему общего VDS и границу Sadhana; 05 - Выбрать точные release pipelines для landing и application

## Question

В какой точной последовательности настроить VDS virtual hosts, Cloudflare records,
Let's Encrypt certificates, Railway `api.shlokahub.com`, frontend
`VITE_API_BASE_URL`, Railway `FRONTEND_ORIGIN`, первый deploy, login/CORS smoke-check,
а затем простую landing-заглушку, чтобы каждое состояние можно было проверить до
перехода к следующему?

## Answer

Принята последовательность с намеренно ранним переключением единственного
production CORS origin:

1. В момент реализации удалить `netlify.toml` и убрать упоминания Netlify из
   актуальных operational/planning-документов. До начала реализации эти файлы
   сохраняются без изменений.
2. В Railway сразу установить точный
   `FRONTEND_ORIGIN=https://app.shlokahub.com`, применить staged change, дождаться
   успешного backend deployment и повторно проверить readiness. Production не
   разрешает `localhost`: локальная разработка продолжает использовать собственную
   конфигурацию `http://localhost:5173`.
3. Подготовить VDS по решению
   [«Выбрать точную схему общего VDS и границу Sadhana»](04-server-layout-security.md):
   пользователи, SSH, каталоги, Nginx, UFW, Fail2ban, swap, лимиты журналов и
   security updates.
4. В Railway добавить `api.shlokahub.com`, создать в Cloudflare выданные Railway
   `CNAME` и `TXT` в режиме `DNS only`, дождаться подтверждения домена и TLS, затем
   получить `200` от `https://api.shlokahub.com/health/ready`.
5. Создать четыре `A`-записи статических имён на VDS, дождаться правильного DNS,
   выпустить две согласованные пары сертификатов, включить HTTPS и `www` redirects,
   затем проверить `nginx -t` и `certbot renew --dry-run`.
6. Задать GitHub Secrets/Variables, включая
   `VITE_API_BASE_URL=https://api.shlokahub.com`, и добавить согласованные release
   workflows.
7. Первым выпустить application workflow в
   `/var/www/shlokahub-app/html/`. После автоматических smoke-checks вручную
   проверить CORS preflight, вход существующего пользователя, защищённую страницу и
   вложенный SPA route.
8. После успешного application выпуска создать в отдельном landing repository
   минимальную статическую заглушку с простым текстом и выпустить её в
   `/var/www/shlokahub-landing/html/`, затем проверить канонический URL и оба
   redirect.

Application и landing выпускаются именно в таком порядке.
