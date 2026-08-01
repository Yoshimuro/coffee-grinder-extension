# План — BJ-1

## Шаги

- S-1. Корень: `package.json` → `"workspaces": ["packages/*", "apps/*"]`, private; корневые скрипты (`verify`, `check:data`, `typecheck`, `test`, `build`, `test:e2e`) проксируют в workspaces (`npm run -w`). `package-lock.json` пересобирается.
- S-2. `packages/core`: `package.json` (name `@coffee/core`, exports src/index.ts), перенос `src/core/*.ts` → `packages/core/src/`, `src/generated/` → `packages/core/src/generated/`, `data/` → `packages/core/data/`, датасет-скрипты → `packages/core/scripts/`, тесты convert/dataset/sheet-links → `packages/core/tests/`, свой `tsconfig.json` + vitest-конфиг (или корневой с projects). Индекс `src/index.ts` реэкспортирует публичное API (types, convert, dataset).
- S-3. `apps/extension`: перенос `src/ui/*` → `apps/extension/src/`, `src/manifest.json` → `apps/extension/src/manifest.json`, `tests/e2e/` + `tests/unit/prefs.test.ts` + `scripts/screenshot.mjs` → внутрь пакета; `vite.config.ts`/`playwright.config.ts`/`tsconfig.json` — пакетные; импорты `../core/*` → `@coffee/core`; пути к `dataset.json` в fixtures/screenshot → через `require.resolve('@coffee/core/...')` или относительный путь пакета.
- S-4. CI `.github/workflows/ci.yml` и корневой `README.md`: обновить пути/команды.
- S-5. `npm install` (линк workspaces), затем полный `npm run verify` — до зелёного.

## Проверка целиком
`npm run verify` в корне: check:data → typecheck (оба пакета) → vitest (core + extension) → build расширения → e2e Playwright. Плюс `git status` — ни одного забытого файла на старых путях.
