# План — BJ-4

Исполняется воркфлоу: фаза Components (1 агент) → фаза Screens (4 параллельных агента-группы, непересекающиеся файлы) → фаза Integration (1 агент + смоук) → пиксельное ревью (опус с чтением скриншотов).

## Шаги

- S-1 (Components, opus). `ui/components/`: ScreenHeader, Stepper (лонг-тап автоповтор не нужен; зажимы параметрами), InverseButton, Tag (+интенсивность ●●○), HairlineRow/Section, EmptyState, Chip. Всё на токенах BJ-2, ≥48px, storybook не заводим — мини-превью страница `/spec` дополнится примерами. Тесты на Stepper-зажимы.
- S-2 (G1 полка, sonnet). shelf/bean/beanAdd + `platform/photos.ts` (интерфейс + web-фолбэк: file input → canvas downscale WebP 2048/q0.85 + thumb 256 → Dexie beans.photos[]). Репозитории db/repo/beans.ts (CRUD, списание — общая функция с G2 через domain).
- S-3 (G2 заваривание, opus). brew/timer/rateLater. Поля/шаги/зажимы — component-report §10.11 дословно; stagesFor/timer/makeEntry из BJ-3; grindHint из domain/convert; инлайн «+ ЗЕРНО»/«+ ДЕВАЙС» через nav-стек с возвратом.
- S-4 (G3 оценка/журнал, opus). diag (шкалы, мини-колесо на arcPath+wheel data, теги, голос-интерфейс `platform/speech.ts` с web-фолбэком «недоступно → просто клавиатура»), log (фильтры §10.7, сравнение-режим), detail (ПОВТОРИТЬ), compare (§9, null-safe для cup).
- S-5 (G4 девайсы/настройки, sonnet). devices/device (devSvg порт §7 с толщинами по README — D-2), more (CRUD молок §10.8 с «УДАЛИТЬ? ДА/✕», перенос convTo при удалении выбранной), spec.
- S-5b (G5 конвертер, opus). conv: пикер по 134, диапазон+полоса, калибровка, ВЗЯТЬ В ЗАВАРИВАНИЕ.
- S-6 (Integration, opus). Сшивка: **home-вайринг** (карточка pending, лента 5 последних через entry-format-хелперы), nav-переходы между группами (bean→brew, brew→timer→rateLater→diag→home, detail→brew ПОВТОРИТЬ, log→compare, conv→brew), удаление заглушек BJ-2, Playwright-смоук полного цикла (AC-2), фикс до зелёного.
- S-7 (Пиксельное ревью). Скриншоты 7 экранов приложения (Playwright, 393×852) против offline.html; исправление грубых расхождений; протокол в review_notes.md.

## Проверка целиком
`npm run -w @coffee/journal test && build` + journal e2e смоук + корневой verify + пиксельный протокол.
