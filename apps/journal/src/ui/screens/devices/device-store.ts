/**
 * Черновик девайса в конструкторе.
 *
 * В стор, а не в состояние экрана, потому что конструктор открывают из трёх
 * мест — список девайсов, настройки и «+ ДЕВАЙС» на сетапе заваривания, — и
 * каждое задаёт разное: правку существующего или новый черновик.
 *
 * `editing` держит id правящегося девайса и отличает правку от создания: у
 * нового девайса id появляется только в момент сохранения, и по нему же сетап
 * понимает, какой девайс выбрать при возврате (`saveDev`, `DC:1280`).
 */

import { create } from 'zustand';

import type { DeviceRecord } from '../../../db/schema.js';
import { NEW_DEVICE } from './dev-view.js';

/** Черновик — девайс без id: у нового его ещё нет. */
export type DeviceDraft = Omit<DeviceRecord, 'id'>;

export interface DeviceDraftState {
  draft: DeviceDraft;
  /** Id правящегося девайса. `null` — черновик новый. */
  editing: string | null;

  /** Новый девайс с дефолтами. */
  startNew: () => void;
  /** Правка существующего: черновик — его копия. */
  startEdit: (device: DeviceRecord) => void;
  /**
   * Заготовка (D-3): признаки заполняются готовым набором, но девайс остаётся
   * новым. Имя тоже приезжает — «AeroPress» набирать незачем, а переписать
   * можно; id заготовки в базу не уходит.
   */
  applyPreset: (preset: DeviceRecord) => void;
  /** Патч одного признака или имени. */
  patch: (patch: Partial<DeviceDraft>) => void;
}

/** Отбрасывает id: черновик — это девайс без него. */
function toDraft({ id: _id, ...traits }: DeviceRecord): DeviceDraft {
  return traits;
}

export const useDeviceDraft = create<DeviceDraftState>((set) => ({
  draft: { ...NEW_DEVICE },
  editing: null,

  startNew: () => set({ draft: { ...NEW_DEVICE }, editing: null }),
  // Копия, а не ссылка: правка не должна менять запись в базе до сохранения.
  startEdit: (device) => set({ draft: toDraft(device), editing: device.id }),
  applyPreset: (preset) => set({ draft: toDraft(preset), editing: null }),
  patch: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
}));
