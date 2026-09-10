# 06 — Завершить coexistence и удалить Railway

**What to build:** После подтверждённой работы канонического домена завершить временное сосуществование площадок, чтобы production backend обслуживался только Amvera и repository больше не содержал устаревший Railway deployment contract.

**Blocked by:** 05 — Переключить api.shlokahub.com на Amvera

**Status:** ready-for-human

- [ ] Railway service удалён только после принятого canonical-domain smoke-check, и больше не создаёт расходов или параллельного production deployment.
- [ ] Railway-specific deployment configuration и устаревшие operational instructions удалены из repository без несвязанных инфраструктурных рефакторингов.
- [ ] Актуальная документация описывает Amvera как временный production runtime, `amvera-api` как release pointer, startup migrations как однорепличное ограничение и порядок обычного выпуска backend.
- [ ] Документация фиксирует, что при будущем переходе на VDS служебная ветка удаляется, image становится immutable по SHA/digest, а migrations выносятся в отдельный release step до масштабирования.
- [ ] После удаления Railway канонические health endpoints и пользовательский smoke-check через `https://api.shlokahub.com` остаются успешными.
- [ ] Временная схема не расширена registry, Amvera CLI, дополнительными probes, мониторингом, автоматическим rollback или иной инфраструктурой вне текущего переезда.

## Parent

`.scratch/backend-amvera-production/spec.md`
