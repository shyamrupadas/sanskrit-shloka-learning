# Проверить возможности Railway для автодеплоя backend из monorepo

Type: research
Status: resolved
Blocked by: None - can start immediately

## Question

Какие актуальные возможности Railway Hobby, GitHub integration, Railpack и config-as-code позволяют надежно деплоить только backend из pnpm monorepo при backend-related изменениях в `main`, ждать минимальный CI gate и не активировать версию при failed build, pre-deploy migration или readiness? Какие ограничения и dashboard-настройки нельзя выразить в `railway.json`?

## Answer

Для текущего shared pnpm-monorepo подходит автоматический deploy из корня репозитория: Railpack, точечные `buildCommand` и `watchPatterns` из `railway.json`, GitHub Actions на backend-related push в `main` и Dashboard-флаг `Wait for CI`. Build, pre-deploy migration и readiness образуют последовательные барьеры активации; Railway не откатывает уже применённую миграцию Neon. Root Directory, GitHub source/branch/autodeploy/Wait for CI, secrets, domains и cost controls остаются настройками Dashboard/API.

Подробности и первичные источники: [Railway: автодеплой backend из pnpm-monorepo](../research/01-railway-monorepo-autodeploy.md).
