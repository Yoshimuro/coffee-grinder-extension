# Требования — BJ-2: каркас apps/journal

## Контекст
Спека `docs/brew-journal-design.md` §5-6. Исполняется после BJ-1 (workspaces уже существуют). Research-база: `docs/tasks/_research/component-report.md` (§1-2 — архитектура и инвентарь экранов прототипа).

## В скоупе
- `apps/journal`: Vite + React 18 + TypeScript strict; vitest.
- Dexie v1: таблицы `grinders`, `beans`, `devices`, `entries`, `settings` (спека §6); версионирование заложено (schema v1 — первый контракт).
- `ui/tokens.css`: палитра/типографика/сетка **байт-в-байт** из handoff README §Токены (значения ниже в plan.md, S-2).
- JetBrains Mono бандлится локально (@fontsource/jetbrains-mono или файлы в repo) — ни одного сетевого запроса.
- Нав-стек в zustand-сторе: `screen + stack`, `go/back/setTab` (семантика прототипа: component-report §1.3); нижние табы ГЛАВНЫЙ/ПОЛКА/ЖУРНАЛ/ЕЩЁ видны только на корневых экранах.
- Заглушки всех 17 экранов (component-report §2, таблица) — микро-лейбл с названием + кнопка «←» на вложенных; Home — только вариант C.
- Safe area (env(safe-area-inset-*)), dark-only, `font-variant-numeric: tabular-nums` на цифрах, тач-таргеты ≥48px, radius 0.
- Первый запуск: `settings` инициализируются (lang: ru), сидится одна своя кофемолка (см. D-2 в decisions.md).

## Вне скоупа
- Порт data.js и доменной логики (BJ-3), контент экранов (BJ-4/5), Capacitor (BJ-6).

## Критерии приёмки
- AC-1: `npm run -w @coffee/journal typecheck` и unit-тесты зелёные; корневой `npm run verify` расширения не сломан.
- AC-2: dev-сборка рендерит Home (вариант C, пустой журнал) с нижней навигацией; все 17 экранов достижимы и «назад» возвращает по стеку.
- AC-3: Dexie открывается с v1; повторный запуск не пересоздаёт данные; сид-guard работает.
- AC-4: значения tokens.css совпадают с README §Токены дословно.
- AC-5: production-сборка не содержит внешних URL (грепом по dist: никаких http(s)-ссылок на шрифты/CDN).
