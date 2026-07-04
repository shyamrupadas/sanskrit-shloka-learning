# Frontend ED Small

Перед любой frontend-задачей прочитай
`docs/architecture/frontend.md`: миграция ED small еще не завершена, поэтому
legacy-код не является образцом для нового кода.

Не расширяй legacy-структуру и не выполняй сопутствующий архитектурный
рефакторинг вне текущей задачи. Для архитектурного аудита или переноса используй
project skill `$frontend-architecture`.

Обязательные проверки после frontend-изменений:

```bash
pnpm lint
pnpm --filter @sanskrit-shloka-learning/web typecheck
pnpm --filter @sanskrit-shloka-learning/web test:unit
```
