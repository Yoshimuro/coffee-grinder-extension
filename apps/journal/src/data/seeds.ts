/**
 * Демо-данные прототипа (`data.js:115-142`) — только для разработки.
 *
 * Первый запуск продакшена сеет одну кофемолку и больше ничего (`db/seed.ts`,
 * BJ-2 D-2): пустые экраны приглашают заварить первую чашку, а не притворяются
 * историей. Эти же три пачки и шесть записей нужны, чтобы гонять экраны с
 * непустой базой, поэтому они спрятаны за `import.meta.env.DEV` —
 * {@link demoSeeds} в проде вернёт `null`, и сборщик выкинет данные из бандла.
 *
 * Формы прототипа приведены к Dexie-схеме v1: `photos` — массив (BJ-2 D-3), а
 * не счётчик; `stirAt` записи `j6` отброшен (в схеме такого поля нет — момент
 * размешивания живёт внутри `stages`); `pending`-записи получают нулевую
 * диагностику, пустые дескрипторы и пустую заметку, потому что схема требует
 * эти поля всегда.
 */

import type { BeanRecord, DeviceRecord, Diagnostics, EntryRecord } from '../db/schema.js';

/** Диагностика ещё не выставленной оценки. */
export const EMPTY_DIAG: Diagnostics = { acid: 0, bitter: 0, body: 0, balance: 0 };

export interface DemoSeeds {
  beans: BeanRecord[];
  devices: DeviceRecord[];
  entries: EntryRecord[];
}

/** Собран ли бандл в режиме разработки. */
export function isDevBuild(): boolean {
  return import.meta.env.DEV === true;
}

/**
 * Полка прототипа: три формы кофе, по одной на каждую ветку сетапа заваривания.
 */
export function demoShelf(): BeanRecord[] {
  return [
    {
      id: 'java',
      form: 'beans',
      name: 'Ява Золотая',
      roaster: 'Сварщица Екатерина',
      roast: '2026-07-27',
      photos: [],
      weight: 250,
      left: 187,
    },
    {
      id: 'drip1',
      form: 'drip',
      name: 'Дрип · Колумбия Уила',
      roaster: 'Сварщица Екатерина',
      roast: '2026-07-10',
      photos: [],
      count: 5,
      leftCount: 3,
      dose: 12,
    },
    {
      id: 'kenya',
      form: 'ground',
      name: 'Кения Ньери · молотый',
      roaster: 'привезли из отпуска',
      roast: '2026-07-18',
      photos: [],
      weight: 100,
      left: 64,
    },
  ];
}

/**
 * `seedDevices()` прототипа возвращает пустой массив — у демо-пользователя нет
 * своих девайсов, каталог-заготовка лежит в `KNOWN_DEVICES` (`data.js:115`).
 */
export function demoDevices(): DeviceRecord[] {
  return [];
}

/** Шесть записей журнала: одна ждёт оценки, пять оценены. */
export function demoJournal(): EntryRecord[] {
  return [
    {
      id: 'j1',
      date: '2026-08-01',
      time: '09:12',
      bean: 'java',
      device: null,
      devName: 'V60',
      mode: 'perc',
      grind: 4.4,
      dose: 15,
      water: 250,
      temp: 94,
      total: 168,
      stages: [
        ['bloom', 45, 50],
        ['pour', 40, 100],
        ['pour', 38, 100],
        ['drain', 45, 0],
      ],
      status: 'pending',
      diag: { ...EMPTY_DIAG },
      desc: [],
      note: '',
    },
    {
      id: 'j2',
      date: '2026-07-31',
      time: '08:47',
      bean: 'java',
      device: null,
      devName: 'Switch',
      mode: 'hybrid',
      grind: 4.8,
      dose: 15,
      water: 240,
      temp: 92,
      total: 190,
      valveAt: 80,
      stages: [
        ['steep', 80, 240],
        ['valve', 0, 0],
        ['drain', 110, 0],
      ],
      status: 'done',
      diag: { acid: 5, bitter: 4, body: 6, balance: 6 },
      desc: [
        ['cocoad', 2],
        ['hazelnut', 2],
      ],
      note: 'ровнее, чем пролив, но скучнее',
    },
    {
      id: 'j3',
      date: '2026-07-30',
      time: '09:05',
      bean: 'java',
      device: null,
      devName: 'V60',
      mode: 'perc',
      grind: 4.6,
      dose: 15,
      water: 250,
      temp: 94,
      total: 170,
      stages: [
        ['bloom', 45, 50],
        ['pour', 40, 100],
        ['pour', 40, 100],
        ['drain', 45, 0],
      ],
      status: 'done',
      diag: { acid: 6, bitter: 3, body: 5, balance: 7 },
      desc: [
        ['blueberry', 2],
        ['blackcurrant', 1],
        ['honey', 2],
      ],
      note: 'слаще на остывании, держать 94°',
    },
    {
      id: 'j4',
      date: '2026-07-29',
      time: '08:58',
      bean: 'java',
      device: null,
      devName: 'V60',
      mode: 'perc',
      grind: 5.0,
      dose: 15,
      water: 250,
      temp: 92,
      total: 155,
      stages: [
        ['bloom', 45, 50],
        ['pour', 35, 100],
        ['pour', 35, 100],
        ['drain', 40, 0],
      ],
      status: 'done',
      diag: { acid: 3, bitter: 6, body: 4, balance: 4 },
      desc: [
        ['walnut', 1],
        ['cocoad', 2],
      ],
      note: 'плоско. крупновато',
    },
    {
      id: 'j5',
      date: '2026-07-28',
      time: '16:20',
      bean: 'drip1',
      device: null,
      devName: '',
      mode: 'drip',
      grind: null,
      dose: 12,
      water: 180,
      temp: 90,
      total: 150,
      pours: 3,
      stages: [],
      status: 'done',
      diag: { acid: 5, bitter: 4, body: 4, balance: 6 },
      desc: [['caramel', 2]],
      note: 'в поезде. лучше, чем ожидал',
    },
    {
      id: 'j6',
      date: '2026-07-26',
      time: '10:30',
      bean: 'kenya',
      device: null,
      devName: 'AeroPress',
      mode: 'imm',
      grind: null,
      dose: 14,
      water: 210,
      temp: 88,
      total: 120,
      stages: [
        ['steep', 90, 210],
        ['stir', 0, 0],
        ['press', 30, 0],
      ],
      status: 'done',
      diag: { acid: 7, bitter: 3, body: 4, balance: 5 },
      desc: [
        ['grapefruit', 2],
        ['blackcurrant', 2],
      ],
      note: 'ярко. можно чуть мельче',
    },
  ];
}

/** Демо-набор целиком — или `null`, если сборка не dev. */
export function demoSeeds(): DemoSeeds | null {
  if (!isDevBuild()) return null;
  return { beans: demoShelf(), devices: demoDevices(), entries: demoJournal() };
}
