/**
 * Платформенный слой: всё, что в вебе умеет одно, а на телефоне — другое.
 * Экраны импортируют отсюда интерфейсы, а не реализации.
 *
 * Правило одно: `*.capacitor.ts` не экспортируется отсюда никогда. Их
 * подтягивает `bind()` через `import()` и только на нативной платформе — иначе
 * плагины уехали бы в браузерный бандл (`native.ts`).
 */

export * from './awake.js';
export * from './files.js';
export * from './native.js';
export * from './notify.js';
export * from './photos.js';
export * from './speech.js';
