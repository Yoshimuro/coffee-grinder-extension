/**
 * Слой доступа к базе. Экраны импортируют отсюда и никогда не трогают
 * `db.<table>` напрямую — так вся работа с Dexie остаётся в одном месте, а
 * подмена базы в тестах сводится к последнему аргументу функции.
 */

export * from './beans.js';
export * from './devices.js';
export * from './entries.js';
export * from './grinders.js';
export * from './settings.js';
