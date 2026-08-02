/**
 * Журнальная группа BJ-4: диагностика, лента, деталь записи, сравнение.
 *
 * Наружу отсюда смотрит один контракт — {@link useRate}: набор оценки, который
 * переиспользует колесо вкусов (BJ-5). Остальное внутреннее; повтор заваривания
 * идёт мимо этой папки, прямо в `brewing/brew-store.ts` (`fromEntry`).
 */

export * from './compare-rows.js';
export * from './diag-scales.js';
export * from './format.js';
export * from './log-filters.js';
export * from './MiniWheel.js';
export * from './rate-store.js';
export * from './view-store.js';
