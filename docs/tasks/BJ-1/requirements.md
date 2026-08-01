# Требования — BJ-1: монорепо-рефакторинг

## Контекст
Спека: `docs/brew-journal-design.md` §3, D-2. Приложению Brew Journal нужен движок конвертации и датасет расширения как единый источник правды. Сейчас всё лежит плоско в одном пакете.

## В скоупе
- npm workspaces: `packages/core`, `apps/extension`, `apps/journal` (placeholder).
- Перенос: `src/core/*` + `src/generated/` + `data/` + датасет-скрипты → `packages/core`; `src/ui/*` + manifest + e2e + screenshot → `apps/extension`.
- Импорты расширения через `@coffee/core`.
- CI-workflow и корневые npm-скрипты обновлены.

## Вне скоупа
- Любые изменения поведения/логики движка и расширения.
- Наполнение `apps/journal` (это BJ-2).

## Критерии приёмки
- AC-1: `npm run verify` в корне зелёный (check:data → typecheck → vitest → build → e2e) после переноса.
- AC-2: `dist/` расширения собирается и структурно эквивалентен прежнему (manifest, popup, бандл).
- AC-3: `@coffee/core` импортируем из обоих apps; ни одного `../../packages` реликтового относительного импорта через границы пакетов.
- AC-4: история git сохранена через rename-detection (перенос, не пересоздание).
