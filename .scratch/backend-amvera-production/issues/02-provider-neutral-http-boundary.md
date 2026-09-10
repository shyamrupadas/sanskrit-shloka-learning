# 02 — Сделать HTTP boundary независимым от Railway

**What to build:** Сохранить безопасные client-IP и request-tracing guardrails при смене hosting provider: API должен учитывать адрес клиента только от доверенного непосредственного ingress proxy и выдавать безопасный request ID без Railway-specific контракта.

**Blocked by:** None — can start immediately

**Status:** awaiting-human-review

- [x] Имена и поведение HTTP guardrails не зависят от Railway, при этом безусловный `trust proxy` и доверие произвольной forwarding chain не вводятся.
- [x] Валидный forwarded client address используется для auth rate limiting только тогда, когда непосредственный socket peer входит в явно доверенный внутренний proxy range.
- [x] Forwarded headers от публичного, неизвестного или некорректного peer игнорируются, поэтому клиент не может подменой заголовка обойти rate limiting.
- [x] Валидный `X-Request-Id` продолжается, а при его отсутствии или некорректном значении API генерирует новый UUID; Railway-specific request ID больше не используется.
- [x] Access logs не раскрывают authorization data, пользовательские данные или значения недоверенных заголовков.
- [x] Backend-тесты покрывают доверенный и недоверенный proxy, продолжение валидного request ID и генерацию UUID; обязательные backend-проверки проходят.
- [x] CORS, маршруты, публичный API-контракт и остальное поведение HTTP boundary не изменены.

## Parent

`.scratch/backend-amvera-production/spec.md`
