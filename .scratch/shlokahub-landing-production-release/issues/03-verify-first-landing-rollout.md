# 03 — Провести и принять первый production rollout landing

**What to build:** владелец приложения получает подтверждённый первый production-выпуск landing: автоматический pipeline успешно доставил готовый артефакт, ручная проверка доказала полный публичный URL-контракт ShlokaHub, а состояние общего VDS после четвёртого первого deploy зафиксировано безопасно.

**Blocked by:** 02 — Автоматизировать проверяемый production-выпуск landing

**Status:** awaiting-human-review
Accepted: 2026-08-06

- [x] Для проверенного commit в `master` landing production workflow завершился успешно, включая post-deploy проверки канонического landing URL и API readiness.
- [x] `https://shlokahub.com/` вручную проверен по HTTPS без оценки или изменения содержимого landing в рамках этого тикета.
- [x] Постоянный redirect с `www.shlokahub.com` ведёт на канонический landing и сохраняет тестовые path и query.
- [x] `www.app.shlokahub.com` исключён из актуального production URL-контракта и не требует проверки в рамках rollout.
- [x] После landing deploy проверены диск, `MemAvailable`, swap, OOM, load, traffic и размеры журналов общего VDS; измерение снабжено timestamp и пригодно для сравнения с предыдущими deploy.
- [x] Результаты rollout зафиксированы без private key, host IP, host-key строки, Secret values, access tokens, пользовательских данных или иных чувствительных production-значений.
- [x] При неуспешной автоматической или ручной проверке rollout не принимается, причина диагностируется, а исправление выпускается новым проверяемым push в `master`, при необходимости через `git revert`.
