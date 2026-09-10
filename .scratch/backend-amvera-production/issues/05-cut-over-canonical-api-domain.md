# 05 — Переключить api.shlokahub.com на Amvera

**What to build:** Перевести канонический API origin на уже проверенный deployment Amvera и подтвердить работу production frontend через HTTPS, сохраняя Railway до завершения проверки.

**Blocked by:** 04 — Развернуть и проверить API на бесплатном домене Amvera

**Status:** ready-for-human

- [ ] В Amvera добавлен custom domain `api.shlokahub.com`, а конфликтующие Railway DNS records заменены точными `A` и `TXT`, выданными Amvera.
- [ ] DNS-настройки позволяют Amvera подтвердить владение доменом и выпустить TLS certificate без traffic splitting, canary или специального zero-downtime механизма.
- [ ] После готовности TLS `/health/live` и `/health/ready` успешно отвечают через `https://api.shlokahub.com`.
- [ ] Production frontend сохраняет прежний API origin и без отдельного frontend release позволяет войти существующей учётной записью и открыть одну защищённую страницу.
- [ ] В build/runtime logs после cutover нет startup errors или явной утечки secrets; итоговый отчёт не содержит credentials, внутренних идентификаторов или пользовательских данных.
- [ ] Railway service и его конфигурация остаются нетронутыми до принятия результатов канонического smoke-check.

## Parent

`.scratch/backend-amvera-production/spec.md`
