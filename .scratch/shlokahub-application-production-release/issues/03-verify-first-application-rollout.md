# 03 — Провести и принять первый production rollout application

**What to build:** владелец приложения получает подтверждённый первый production-выпуск: автоматический pipeline успешно доставил application, а ручной пользовательский и операционный smoke-check доказал работоспособность CORS, аутентификации, защищённого маршрута, SPA routing и общего VDS.

**Blocked by:** 02 — Автоматизировать проверяемый production-выпуск application

**Status:** ready-for-agent

- [ ] Для проверенного commit в `main` application production workflow завершился успешно, включая post-deploy проверки канонического application URL, прямого `/login` и API readiness.
- [ ] В production вручную подтверждён CORS preflight между `https://app.shlokahub.com` и `https://api.shlokahub.com`.
- [ ] Существующий пользователь успешно вошёл в application и открыл защищённую страницу с production-данными, подтвердив auth, CORS, API routing и чтение данных.
- [ ] Прямое открытие вложенного application route в браузере загружает SPA и корректно передаёт управление client router.
- [ ] После выпуска проверены диск, доступная память, swap и отсутствие нового OOM на общем VDS.
- [ ] Результаты первого rollout зафиксированы без access token, паролей, private key, deployment host, host-key строки и других Secrets.
- [ ] При неуспешной проверке landing release остаётся заблокированным, а исправление application выпускается новым проверяемым push в `main`, при необходимости через `git revert`.
- [ ] После успешных автоматических и ручных проверок application явно отмечено, что спецификация `shlokahub-landing-production-release` может переходить к реализации.
