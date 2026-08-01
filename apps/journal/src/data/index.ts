/**
 * Реестры — порт `data.js`. Экраны импортируют отсюда, а не из файлов, чтобы
 * раскладка внутри `data/` осталась свободной.
 *
 * `seeds.ts` намеренно не реэкспортируется: демо-данные тянут за собой
 * dev-флаг и нужны считаным местам — их импортируют явно.
 */

export * from './advice.js';
export * from './freshness.js';
export * from './strings.js';
export * from './traits.js';
export * from './wheel.js';
