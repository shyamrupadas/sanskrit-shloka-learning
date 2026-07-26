# 03 — Провести и принять первый production rollout landing

**What to build:** владелец приложения получает подтверждённый первый production-выпуск landing: автоматический pipeline успешно доставил готовый артефакт, ручная проверка доказала полный публичный URL-контракт ShlokaHub, а состояние общего VDS после четвёртого первого deploy зафиксировано безопасно.

**Blocked by:** 02 — Автоматизировать проверяемый production-выпуск landing

**Status:** ready-for-agent

- [ ] Для проверенного commit в `main` landing production workflow завершился успешно, включая post-deploy проверки канонического landing URL и API readiness.
- [ ] `https://shlokahub.com/` вручную проверен по HTTPS без оценки или изменения содержимого landing в рамках этого тикета.
- [ ] Постоянный redirect с `www.shlokahub.com` ведёт на канонический landing и сохраняет тестовые path и query.
- [ ] Постоянный redirect с `www.app.shlokahub.com` ведёт на канонический application и сохраняет тестовые path и query.
- [ ] После landing deploy проверены диск, `MemAvailable`, swap, OOM, load, traffic и размеры журналов общего VDS; измерение снабжено timestamp и пригодно для сравнения с предыдущими deploy.
- [ ] Результаты rollout зафиксированы без private key, host IP, host-key строки, Secret values, access tokens, пользовательских данных или иных чувствительных production-значений.
- [ ] При неуспешной автоматической или ручной проверке rollout не принимается, причина диагностируется, а исправление выпускается новым проверяемым push в `main`, при необходимости через `git revert`.
