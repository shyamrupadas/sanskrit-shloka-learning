# Перевести заучивание, повторение и обучение санскриту на общий компонентный язык

Status: ready-for-agent

## Родитель

`.scratch/frontend-design-system-sync/PRD.md`

## Что сделать

Перевести экраны заучивания, повторения и статического обучения санскриту на общую Pencil-синхронизированную дизайн-систему, сохранив существующие учебные сценарии. После среза learn/review flows должны ощущаться частью того же продукта, использовать общий header/layout/component language и проверяться через пользовательские route-level сценарии.

## Критерии приемки

- [ ] Экран заучивания шлоки и подтверждение используют Pencil-синхронизированные layout, typography, buttons, page header и смысловые project components.
- [ ] Все состояния повторения используют общий визуальный язык и не выглядят отдельным прототипом.
- [ ] Экран `Обучение санскриту` использует общий компонентный язык приложения для советов, строк и раскрываемых элементов.
- [ ] Длинный текст шлок, подсказки и советы не ломают mobile layout.
- [ ] Route-level tests покрывают доступные действия и русские UI-строки learn/review/sanskrit-learning flows без проверки приватной композиции components.
- [ ] Playwright или существующий full-app seam проверяет ключевые экраны на mobile-first размерах, включая `390x844` и `360x800`.
- [ ] Existing routes, route params, query keys, localStorage keys, API calls and generated API artifacts не меняются.
- [ ] Backend, схема базы данных и данные не меняются; новые DB migrations не требуются.
- [ ] Обязательные frontend-проверки проходят.

## Pencil references

- Экран: `Заучивание — шлока` (`QPXXW`)
- Экран: `Заучивание — подтверждение` (`IQcqK`)
- Экран: `Повторение — текст скрыт` (`M6fBeF`)
- Экран: `Повторение — первая подсказка` (`Zt9yX`)
- Экран: `Повторение — вторая подсказка` (`dtDuy`)
- Экран: `Повторение — полный текст` (`s0VvGA`)
- Экран: `Повторение — результат` (`E41yd`)
- Экран: `Обучение санскриту` (`aj0kd`)
- Компонент: `Product / Word Row` (`L7MCU`)
- Компонент: `Product / Tip Accordion Item / Collapsed` (`epjBK`)
- Компонент: `Product / Tip Accordion Item / Expanded` (`rgPsh`)
- Компонент: `Product / Layout / Back Header` (`haku8`)

## Заблокировано

- `.scratch/frontend-design-system-sync/issues/06-project-components-bottom-navigation.md`
