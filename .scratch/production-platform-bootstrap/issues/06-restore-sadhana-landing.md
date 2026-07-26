# 06 — Восстановить Sadhana landing на новом VDS

**What to build:** существующий Sadhana landing release pipeline безопасно доставляет прежний статический сайт на новый VDS, сохраняя действующий release-контракт и используя проверенный SSH host key.

**Blocked by:** 04 — Закрепить security- и resource-baseline VDS

**Status:** ready-for-agent

- [ ] Connection values landing repository указывают на нового automation-пользователя и новый VDS; private key меняется только при фактической необходимости ротации.
- [ ] Workflow использует заранее проверенный `SSH_KNOWN_HOSTS`, `StrictHostKeyChecking=yes` и не выполняет runtime `ssh-keyscan`.
- [ ] Существующие branch trigger, install/build, `rsync --delete`, deploy destination и отсутствие ручного dispatch сохранены.
- [ ] Первый workflow на новом VDS завершился успешно; артефакт, ownership и HTTP-ответ landing virtual host проверены до DNS cutover.
- [ ] Отчёт о переносе не раскрывает IP, private key, host-key строку или Secret values.
