# 02 — Добавить исполняемый `$pen-ui-contract` workflow

**What to build:** Добавить project skill, который по канонической pen.dev policy безопасно маршрутизирует read-only анализ, live-изменение дизайна и последующую frontend-реализацию, чтобы агент не импровизировал tool choice, не записывал канонический `.pen` без приемки и всегда проверял видимый результат.

**Blocked by:** 01 — Перевести UI-контракт на pen.dev workflow

**Status:** awaiting-human-review

- [x] Project skill имеет узкий trigger для чтения/изменения канонического `.pen`, подготовки актуальных pen.dev references, создания или изменения видимого frontend UI и visual contract review.
- [x] Skill отделяет каноническую policy от исполняемой процедуры: читает актуальные project rules по режиму и не дублирует vendor schema или полные описания Pencil tools.
- [x] Read-only режим использует глобальный `pen interactive`, никогда не запускает CLI agent mode и возвращает понятный blocker при отсутствии CLI или неготовой авторизации вместо raw fallback.
- [x] Skill содержит безопасный launcher, который передает канонический дизайн только как input, создает уникальный временный output, поддерживает интерактивную PTY-сессию и очищает временные данные после выхода.
- [x] Даже вызов `save()` внутри read-only launcher может записать только временный output; канонический `.pen` никогда не используется как output.
- [x] Design edit режим использует только MCP-сервер `pencil` с открытым Pen Desktop, сначала получает editor state вместе со schema и подтверждает правильный активный документ.
- [x] Закрытый Desktop, неверный активный файл или недоступный MCP останавливают design edit с понятным blocker; CLI и обычные file tools не используются как fallback для записи.
- [x] Перед изменением агент изучает релевантные screens, variables, reusable-компоненты и patterns, переиспользует существующую дизайн-систему и не применяет внешние style presets без явного поручения.
- [x] Новые visual tokens, reusable-компоненты и patterns допускаются только при недостаточности существующих и явно показываются владельцу во время visual review.
- [x] После законченной design-итерации агент проверяет релевантный layout и screenshot, не сохраняет canvas, кратко сообщает о готовности и ждет подтверждения владельца.
- [x] После явного подтверждения, что дизайн принят и сохранен, skill продолжает кодовую часть первоначального scope в том же thread; design-only поручение не расширяется до изменения кода.
- [x] Перед каждой видимой frontend-правкой skill читает релевантные узлы утвержденного дизайна через headless CLI, даже если spec/ticket уже содержит имена и `nodeId`.
- [x] Отсутствующий или противоречивый design contract останавливает кодовую фазу с UI Contract Collision; agent не создает новый exception без явного решения владельца.
- [x] После реализации видимого UI skill запускает обязательные project checks и сопоставляет pen.dev screenshot/export со screenshot работающего приложения через Playwright MCP в релевантном viewport и состоянии.
- [x] Visual review проверяет наблюдаемую композицию, размеры, spacing, typography, colors и states без обязательного pixel-perfect diff.
- [x] Если screenshot приложения получить нельзя, skill возвращает visual verification gate; явная ручная приемка владельца закрывает его только для текущей задачи и отражается в финальном отчете.
- [x] Компактный repository trigger направляет все релевантные задачи к `$pen-ui-contract` и не перечисляет сценарии, в которых skill не используется.
- [x] Launcher проверен как внешний процесс с изолированным fake `pen`: наблюдаемые arguments и cleanup подтверждают read-only safety без реального login, сети или изменения канонического дизайна.
- [x] Skill проходит стандартную структурную валидацию, repository links разрешаются, targeted validation не требует нового общего test framework и не добавляет product tests.
- [x] Реализация не изменяет product design, frontend behavior, API, БД или Git index.

## Parent

`.scratch/pen-ui-contract/spec.md`
