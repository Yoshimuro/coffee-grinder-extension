# Research — BJ-1

Выполнен в рамках воркфлоу изучения кодбейса (2026-08-02, читатель read:extension, sonnet). Ключевые факты:

- `src/core/` (types.ts, convert.ts, dataset.ts) — чистый TS без DOM/`chrome.*`, осознанная граница переиспользуемости (README:293-294). Единственный потребитель `chrome.*` — `src/ui/prefs.ts` (с guard `typeof chrome !== 'undefined'`).
- `src/core/dataset.ts` импортирует `src/generated/dataset.json` (закоммичен; генерируется `scripts/build-dataset.mjs` из `data/grinders/*.json`; CI сверяет `npm run check:data`).
- Тесты: `tests/unit/{convert,dataset,sheet-links}.test.ts` — тесты ядра/скриптов; `tests/unit/prefs.test.ts` — тест расширения; `tests/e2e/*` — Playwright с фиксированным extension id из ключа манифеста (`src/manifest.json:12`, `tests/e2e/fixtures.ts:10-32`).
- e2e и `scripts/screenshot.mjs` читают `src/generated/dataset.json` напрямую с диска (`fixtures.ts:87-95`) — пути придётся обновить.
- `vite.config.ts`: `root: src/ui`, вход `popup.html`, плагин копирует `src/manifest.json` в `dist/` as-is.
- Скрипты инжеста (`scrape-sheets`, `pdf-table-to-csv`, `twc-table-to-csv`, `beeancoffee-harvest`, `import-csv`, `build-dataset`, `lib/sheet-links`) — датасет-конвейер → в core. `screenshot.mjs` — специфичен для расширения → в apps/extension.
- `data/raw/` частично закоммичен вопреки `.gitignore` — переносится как есть, не чистим (вне скоупа).
- `.github/workflows/ci.yml` гоняет verify-цепочку — пути обновить.
