# Dev notes — BJ-1 (монорепо-рефакторинг)

Дата: 2026-08-02. Статус: **зелёно**, `npm run verify` в корне проходит целиком (exit 0).

## Что куда переехало

Все переносы сделаны через `git mv` — rename-detection сработала (AC-4), контент файлов ядра при переносе не менялся (D-3).

### `packages/core` (`@coffee/core`)

- `src/core/{types,convert,dataset}.ts` → `packages/core/src/`
- `src/generated/dataset.json` → `packages/core/src/generated/dataset.json`
- `data/` целиком (`dataset.meta.json`, `methods.json`, `grinders/*.json`, `raw/`) → `packages/core/data/`
- `scripts/{build-dataset,import-csv,scrape-sheets,pdf-table-to-csv,twc-table-to-csv,beeancoffee-harvest}.mjs` → `packages/core/scripts/`
- `scripts/lib/sheet-links.mjs` → `packages/core/scripts/lib/`
- `tests/unit/{convert,dataset,sheet-links}.test.ts` → `packages/core/tests/unit/`
- Новое: `packages/core/src/index.ts` (публичный API), `package.json`, `tsconfig.json`, `vitest.config.ts`

### `apps/extension` (`@coffee/extension`)

- `src/ui/{popup.ts,popup.html,popup.css,prefs.ts,grinder-picker.ts}` → `apps/extension/src/`
- `src/manifest.json` → `apps/extension/src/manifest.json`
- `tests/unit/prefs.test.ts` → `apps/extension/tests/unit/`
- `tests/e2e/` → `apps/extension/tests/e2e/`
- `scripts/screenshot.mjs` → `apps/extension/scripts/`
- `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts` → `apps/extension/`
- Новое: `package.json`, `tsconfig.json`
- Сборка теперь пишет в `apps/extension/dist/` (старый корневой `dist/` и `test-results/` удалены как артефакты)

### `apps/journal` (`@coffee/journal`)

- Только заглушка: `package.json` (private, без скриптов) и `src/README.md` с одной строкой «Заполняется в BJ-2». Никакого каркаса — это BJ-2.

### Корень

- `tsconfig.json` → `tsconfig.base.json` (общая база, без `include`; каждый пакет наследуется от неё)
- `package.json` переписан: `private`, `workspaces: ["packages/*", "apps/*"]`, имя `coffee-monorepo`

## Решения по конфигам

- **Публичный API ядра.** `packages/core/package.json` → `"exports": { ".": "./src/index.ts", "./generated/dataset.json": "./src/generated/dataset.json" }`. Пакет отдаёт TS-исходники: оба потребителя (Vite через симлинк воркспейса и `tsc`) их понимают, отдельный build-шаг для ядра не нужен. Второй сабпас нужен, чтобы e2e и screenshot доставали датасет по имени пакета, а не относительным путём через границу пакета (AC-3).
- **`@coffee/core` в `dependencies`, а не `devDependencies` расширения** — это рантайм-зависимость бандла.
- **tsconfig.** База (`tsconfig.base.json`) держит общие опции; `types` вынесен в пакеты — только расширение знает про `chrome`. У ядра `"lib": ["ES2022"]` без DOM: попытка тронуть `document` в ядре становится ошибкой компиляции, а не замечанием ревью (усиление границы из README:293-294). `types: ["node", "vitest/globals"]` у ядра — из-за node-скриптов инжеста в том же проекте.
- **vitest** — отдельный конфиг в каждом пакете (не `projects` в корне): у каждого пакета свой рабочий каталог, а `include: tests/unit/**` остаётся прежним, так что относительные импорты в тестах не поехали.
- **Корневые скрипты.** `typecheck`/`test` — через `npm run … --workspaces --if-present` (journal без скриптов молча пропускается). Остальное адресно: `check:data`/`build:data`/`import:csv` → `-w @coffee/core`, `build`/`dev`/`test:e2e`/`screenshot` → `-w @coffee/extension`. `verify` — прежняя цепочка `check:data → typecheck → test → build → test:e2e`.
- **`build` расширения** — теперь `tsc --noEmit && vite build` без `build:data`; генерация датасета — дело ядра. Прежняя семантика «`npm run build` самодостаточен» сохранена на уровне корня: корневой `build` = `build:data` + сборка расширения.
- **`.gitignore`.** `data/raw/` → `packages/core/data/raw/`: паттерн со слешем внутри якорится к каталогу с `.gitignore`, после переезда он перестал бы работать и `git status` завалило бы нескачанным сырьём. Остальные паттерны (`dist/`, `test-results/`, `playwright-report/`) слеша внутри не имеют и матчатся на любой глубине — правки не потребовали. Содержимое `data/raw/` не чистилось (D-4).
- **CI.** `npx vite build` → `npm run build` (корневой прокси); артефакты — `apps/extension/dist/` и `apps/extension/playwright-report/`. `npm ci` в корне ставит все воркспейсы, бинарники хойстятся в корневой `node_modules/.bin`, так что `npx playwright install` работает без изменений.

## Файлы с правленными импортами/путями

1. `apps/extension/src/popup.ts` — `../core/{convert,dataset,types}.js` → один импорт из `@coffee/core`.
2. `apps/extension/src/grinder-picker.ts` — то же.
3. `packages/core/src/dataset.ts` — `'../generated/dataset.json'` → `'./generated/dataset.json'` (файл `dataset.ts` поднялся на уровень выше относительно `generated/`; без этой правки `tsc` не резолвил JSON).
4. `packages/core/tests/unit/convert.test.ts` — `../../src/core/*` → `../../src/*`.
5. `packages/core/tests/unit/dataset.test.ts` — `../../src/core/*` → `../../src/*`.
6. `apps/extension/tests/unit/prefs.test.ts` — `../../src/ui/prefs.js` → `../../src/prefs.js`.
7. `apps/extension/tests/e2e/fixtures.ts` — датасет читается по `createRequire(import.meta.url).resolve('@coffee/core/generated/dataset.json')` вместо `join(EXTENSION_PATH, '..', 'src/generated/dataset.json')`. `EXTENSION_PATH` (`../../dist`) не менялся — теперь это `apps/extension/dist`.
8. `apps/extension/scripts/screenshot.mjs` — `ROOT` разделён на `PKG` (пакет) и `REPO` (корень репо): `dist` берётся из пакета, вывод PNG остаётся в корневом `docs/screens/`; датасет — через `createRequire`.
9. `apps/extension/vite.config.ts` — `root: src/ui` → `root: src`.
10. `apps/extension/vitest.config.ts` — комментарий про `root: src/ui` приведён в соответствие.
11. `packages/core/tests/unit/sheet-links.test.ts` — импорт не менялся: относительная глубина `../../scripts/lib/` сохранена переносом вместе со структурой `tests/unit/`.

Правок логики движка или UI не делалось ни одной — только пути.

## Хвост вывода `npm run verify` (последние 15 строк, дословно)

```
  ✓   6 tests/e2e/converter.spec.ts:81:1 › stepper moves by exactly one detent and clamps at the ends (2.6s)
  ✓   7 tests/e2e/converter.spec.ts:96:1 › warns when the target grinder cannot reach the grind size (2.6s)
  ✓   8 tests/e2e/converter.spec.ts:108:1 › flags estimated calibrations instead of implying precision (3.2s)
  ✓   9 tests/e2e/converter.spec.ts:117:1 › shows a wider band for a less certain pairing (3.3s)
  ✓  10 tests/e2e/converter.spec.ts:139:1 › remembers the last grinders and setting across popup opens (3.0s)
  ✓  11 tests/e2e/converter.spec.ts:156:1 › shows collapsed brands before anything is typed (3.0s)
  ✓  12 tests/e2e/converter.spec.ts:172:1 › typing replaces the groups with a flat result list (2.4s)
  ✓  13 tests/e2e/converter.spec.ts:186:1 › offers recently used grinders on the next open (2.9s)
  ✓  14 tests/e2e/converter.spec.ts:198:1 › hides recents while a query is active (2.4s)
  ✓  15 tests/e2e/converter.spec.ts:206:1 › selects with the keyboard alone (2.4s)
  ✓  16 tests/e2e/converter.spec.ts:215:1 › Escape closes the panel and returns focus to the button (2.2s)
  ✓  17 tests/e2e/converter.spec.ts:225:1 › arrow keys expand a brand group (2.1s)
  ✓  18 tests/e2e/converter.spec.ts:233:1 › shows at most three recents (5.1s)

  18 passed (52.1s)
```

Промежуточные шаги той же прогонки: `check:data` — «Dataset up to date — 134 grinders, 8 methods»; `typecheck` — чисто в обоих пакетах; `vitest` — 60 тестов в core + 5 в extension; `vite build` — `popup.html 2.11 kB / popup.css 6.21 kB / popup.js 97.75 kB` в `apps/extension/dist/` рядом с `manifest.json` (структурно тот же набор из четырёх файлов, что и раньше — AC-2).

## Отклонения от плана

- **Тесты ядра положены в `packages/core/tests/unit/`, а не в `packages/core/tests/`** (план S-2 говорил «tests/»). Сохранение подкаталога `unit/` оставляет неизменными и относительный импорт `../../scripts/lib/sheet-links.mjs`, и паттерн `include` в vitest-конфиге; плоская раскладка потребовала бы править и то и другое без выигрыша. Симметрично сделано в расширении.
- **Корневой `tsconfig.json` переименован в `tsconfig.base.json`.** План говорил про «наследование от корневого», имя не фиксировал; отдельное имя убирает соблазн запустить `tsc` в корне (у базы нет `include`).
- **Root `package.json` переименован** в `coffee-monorepo` — прежнее имя `coffee-grinder-extension` уехало в `@coffee/extension`.
- **Корневой `dist/` и `test-results/` удалены** (не переносились): это gitignored-артефакты, новые лежат внутри `apps/extension/`.
- **`build:data` вынут из скрипта сборки расширения** (обоснование выше, в разделе про конфиги); на уровне корневого `npm run build` поведение прежнее.

## Замечание для ревью (не отклонение, но факт)

Во время работы над задачей параллельный процесс сделал коммит `34cd672 docs: research annexes …`, который захватил в себя уже подготовленные `git mv`-переносы (в диффе коммита они видны как renames — история сохранена). Сам dev-агент git-write-команд, кроме `git mv`, не выполнял. Итог: часть BJ-1 (переносы) уже в истории внутри docs-коммита, остальное (конфиги пакетов, правки импортов, CI, README, `.gitignore`) — в рабочем дереве незакоммиченным.
