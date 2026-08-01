# План — BJ-2

## Шаги

- S-1. Пакет: `apps/journal/package.json` (@coffee/journal, deps: react, react-dom, dexie, dexie-react-hooks, zustand, @fontsource/jetbrains-mono; dev: vite, @vitejs/plugin-react, typescript, vitest, fake-indexeddb). `tsconfig.json` strict, `vite.config.ts`, `index.html` (viewport-fit=cover, lang=ru).
- S-2. `src/ui/tokens.css` — из handoff README §Токены: фон `#0C0C0C`, плоскость `#141413`, хайрлайны `#191917/#1E1E1C/#232321/#2A2A28`, faint `#575752`, dim `#8C8C87`, вторичный `#B9B9B4`, текст `#EDEDEB`; инверсная кнопка (фон `#EDEDEB`, текст `#0C0C0C`); шкала: микро-лейбл 10px/ls 2px/caps/dim, техстрока 9–9.5px/faint, body 12–13px, степпер 19–21px, результат 46px/300, elapsed 74px/300, стадия 29px/700/ls 4px; сетка 4px, поля 20px, таргеты ≥48px, radius 0; tabular-nums; safe-area паддинги. CSS-переменные + утилити-классы.
- S-3. `src/db/schema.ts`: Dexie `BrewJournalDB`, version(1).stores: `grinders: id`, `beans: id, form`, `devices: id`, `entries: id, date, status, bean, mode`, `settings: key`. Типы записей — из спеки §6. `src/db/seed.ts`: first-run guard (`settings.seeded`), lang ru, одна своя кофемолка (D-2).
- S-4. `src/app/nav.ts`: zustand-стор `{screen, stack, go, back, setTab}`; типизированный union из 17 имён экранов; back() на пустом стеке = home.
- S-5. `src/ui/screens/*` — 17 заглушек (по одной на экран из component-report §2) + `src/ui/App.tsx` (switch по screen, нижние табы на `home|shelf|log|more`). Кнопка «←» на вложенных.
- S-6. Тесты: nav-стор (go/back/setTab), схема Dexie открывается на fake-indexeddb, сид идемпотентен. Прогон typecheck+vitest+build, фикс до зелёного.

## Проверка целиком
`npm install && npm run -w @coffee/journal typecheck && npm run -w @coffee/journal test && npm run -w @coffee/journal build`; grep dist на внешние URL; корневой `npm run verify` (расширение) остаётся зелёным.
