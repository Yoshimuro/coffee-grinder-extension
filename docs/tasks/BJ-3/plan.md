# План — BJ-3

## Шаги

- S-1. `data/wheel.ts` + тесты реестров (9/27/102, freeze, уникальность id, обратные ссылки cat/sub, цвета h/c по категориям из data-js-report §2).
- S-2. `data/traits.ts`, `data/strings.ts` (typed union, 145/145), `data/freshness.ts`, `data/seeds.ts` (dev-флаг), `data/advice.ts` + тесты.
- S-3. `domain/format.ts` (fmtT fix), `domain/stages.ts` (5 веток + drip-компенсация) + табличные тесты по каждой ветке: точные ожидаемые массивы `[key, sec, water]` для репрезентативных входов (значения — из component-report §3.1-3.5).
- S-4. `domain/timer.ts`: чистый редьюсер (`start/advance/pause/tick-view`) + zustand-обёртка; тесты сценариев: perc с паузой посреди пролива; imm с маркером stir; hybrid-mid с valve; пауза на последней стадии запрещена; rec фактических длительностей; makeEntry (mode, pours, valveAt, списание пачки drip/шт vs beans/г, clamp нулём).
- S-5. `domain/calibration.ts` + `domain/convert.ts` (обёртка @coffee/core) + тесты: offset применяется к center/lo/hi и не к microns; suggestion из журнала (лучшая по balance); reset.
- S-6. Полный прогон: typecheck + vitest journal + корневой verify.

## Проверка целиком
`npm run -w @coffee/journal test` + AC-грепы (реестры, отсутствие дубля формул) + корневой `npm run verify`.
