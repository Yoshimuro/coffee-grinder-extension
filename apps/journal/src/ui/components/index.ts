/**
 * Общие компоненты BJ-4. Экраны импортируют отсюда: раскладка внутри папки
 * должна остаться свободной, а список того, что вообще есть, — коротким.
 *
 * `ScreenShell` сюда не входит: это каркас BJ-2 со своей шапкой, и после BJ-4
 * на нём остался один экран — колесо вкусов, заглушка до BJ-5. Все заполненные
 * экраны строят тело сами и берут шапку из `ScreenHeader`.
 *
 * `StubLinks` удалён в BJ-4 (S-6) вместе с последней заглушкой, которая его
 * показывала: ссылки-времянки нужны были, пока экраны были пустыми.
 */

export * from './Chip.js';
export * from './DatePicker.js';
export * from './EmptyState.js';
export * from './Hairline.js';
export * from './InverseButton.js';
export * from './ScreenHeader.js';
export * from './Stepper.js';
export * from './Tag.js';
