/**
 * Эффективное колесо вкусов для экранов.
 *
 * Единственная точка, где UI берёт колесо: экраны не импортируют `WHEEL`
 * напрямую, а спрашивают этот хук. Пока пользовательских правок нет, он отдаёт
 * базу как есть; когда оверлей поселится в настройках (ключ `wheelEdits` —
 * список {@link WheelEdit}), живым станет только этот модуль:
 *
 *   const edits = useSetting('wheelEdits');
 *   return useMemo(() => makeWheelSet(composeWheel(WHEEL, edits)), [edits]);
 *
 * Экраны уже ходят через хук и не изменятся.
 */

import { BASE_WHEEL, type WheelSet } from '../../data/wheel.js';
import type { WheelEdit } from '../../data/wheel-edits.js';

// Реэкспорт для будущего кода настроек: тип правки — часть контракта хука.
export type { WheelEdit, WheelSet };

/** Колесо с учётом пользовательских правок. Сейчас правок нет — это база. */
export function useWheel(): WheelSet {
  return BASE_WHEEL;
}
