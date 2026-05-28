# Использовать TanStack Router для фронтенд-роутинга

Для `apps/web` используем TanStack Router. Фронтенд MVP является TypeScript-first React SPA/PWA, уже использует TanStack Query и содержит несколько route-level сценариев: dashboard, библиотека шлок, страница шлоки по коду, потоки заучивания и повторения, settings, auth-экраны и защищенный admin route.

**Рассмотренные варианты**

- Использовать React Router как более массовый и привычный роутер.
- Использовать TanStack Router ради typed routes, typed search params и более строгой интеграции с TypeScript.

**Последствия**

TanStack Router добавляет чуть больше начальной настройки, чем React Router, но лучше соответствует TypeScript-first и contract-first направлению проекта. Связка TanStack Router + TanStack Query должна использоваться прагматично: роутер отвечает за маршруты, параметры и route-level loading boundaries, а не заменяет API-клиент или доменные сервисы фронтенда.
