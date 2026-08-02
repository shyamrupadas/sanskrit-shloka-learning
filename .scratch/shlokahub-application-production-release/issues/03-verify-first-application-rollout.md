# 03 — Провести и принять первый production rollout application

**What to build:** владелец приложения получает подтверждённый первый production-выпуск: автоматический pipeline успешно доставил application, а ручной пользовательский и операционный smoke-check доказал работоспособность CORS, аутентификации, защищённого маршрута, SPA routing и общего VDS.

**Blocked by:** 02 — Автоматизировать проверяемый production-выпуск application

**Status:** awaiting-human-review
Accepted: 2026-08-02

- [x] Для проверенного commit в `main` application production workflow завершился успешно, включая post-deploy проверки канонического application URL, прямого `/login` и API readiness.
- [x] В production вручную подтверждён CORS preflight между `https://app.shlokahub.com` и `https://api.shlokahub.com`.
- [x] Существующий пользователь успешно вошёл в application и открыл защищённую страницу с production-данными, подтвердив auth, CORS, API routing и чтение данных.
- [x] Прямое открытие вложенного application route в браузере загружает SPA и корректно передаёт управление client router.
- [x] После выпуска проверены диск, доступная память, swap и отсутствие нового OOM на общем VDS.
- [x] Результаты первого rollout зафиксированы без access token, паролей, private key, deployment host, host-key строки и других Secrets.
- [x] При неуспешной проверке landing release остаётся заблокированным, а исправление application выпускается новым проверяемым push в `main`, при необходимости через `git revert`.
- [x] После успешных автоматических и ручных проверок application явно отмечено, что спецификация `shlokahub-landing-production-release` может переходить к реализации.

## Итог первого rollout

- `2026-08-02` — application production workflow и публичные post-deploy проверки: PASS.
- `2026-08-02` — CORS preflight, вход существующего пользователя, защищённая страница и SPA routing: PASS.
- `2026-08-02` — диск, доступная память, swap и отсутствие нового OOM на общем VDS: PASS.
- Спецификация `shlokahub-landing-production-release` может переходить к реализации.
