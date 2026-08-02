/**
 * Девайсы — доступ к таблице `devices`.
 *
 * Каталог `KNOWN_DEVICES` (data/traits.ts) в базу не пишется: это заготовки
 * конструктора, а не чужое имущество на полке пользователя (D-3 BJ-4).
 */

import { useLiveQuery } from 'dexie-react-hooks';

import type { BrewJournalDB, DeviceRecord } from '../schema.js';
import { db } from '../schema.js';

/** Идентификатор нового девайса. Формат прототипа (`DC:1280`). */
export function newDeviceId(now: Date = new Date()): string {
  return `d${now.getTime()}`;
}

export async function listDevices(database: BrewJournalDB = db): Promise<DeviceRecord[]> {
  return database.devices.toArray();
}

export async function getDevice(
  id: string | null | undefined,
  database: BrewJournalDB = db,
): Promise<DeviceRecord | undefined> {
  if (!id) return undefined;
  return database.devices.get(id);
}

export async function putDevice(
  device: DeviceRecord,
  database: BrewJournalDB = db,
): Promise<string> {
  return database.devices.put(device);
}

/**
 * Удаляет девайс. Записи журнала не трогает — они держат имя в `devName`
 * именно затем, чтобы пережить это.
 */
export async function deleteDevice(id: string, database: BrewJournalDB = db): Promise<void> {
  await database.devices.delete(id);
}

export function useDevices(): DeviceRecord[] | undefined {
  return useLiveQuery(() => listDevices(), []);
}

export function useDevice(id: string | null | undefined): DeviceRecord | undefined {
  return useLiveQuery(() => getDevice(id), [id]);
}
