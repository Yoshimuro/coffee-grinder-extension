/**
 * Признаки девайсов и встроенный каталог — порт `TRAITS`/`KNOWN_DEVICES`
 * (`data.js:102-114`, data-js-report §5).
 *
 * Ключи `opts` — контракт: они хранятся в `DeviceRecord` и по ним строится
 * генеративный чертёж девайса, поэтому переименование запрещено. Связь с
 * Dexie-схемой держится типами: `satisfies TraitRegistry` не пройдёт, если
 * набор опций разойдётся с `DeviceFlow`/`DeviceBottom`/… из `db/schema.ts`.
 */

import type {
  DeviceBottom,
  DeviceFilter,
  DeviceFlow,
  DeviceMaterial,
  DeviceRecord,
  DeviceVolume,
  DeviceWall,
} from '../db/schema.js';

/** Подпись `[ru, en]` — позиционный кортеж, ru первым. */
export type Label = readonly [ru: string, en: string];

export interface TraitGroup<K extends string> {
  readonly ru: string;
  readonly en: string;
  readonly opts: Readonly<Record<K, Label>>;
}

export interface TraitRegistry {
  readonly flow: TraitGroup<DeviceFlow>;
  readonly bottom: TraitGroup<DeviceBottom>;
  readonly wall: TraitGroup<DeviceWall>;
  readonly filter: TraitGroup<DeviceFilter>;
  readonly material: TraitGroup<DeviceMaterial>;
  readonly vol: TraitGroup<DeviceVolume>;
}

export const TRAITS = {
  flow: {
    ru: 'поток',
    en: 'flow',
    opts: {
      perc: ['пролив', 'percolation'],
      imm: ['иммерсия', 'immersion'],
      hybrid: ['гибрид · клапан', 'hybrid · valve'],
    },
  },
  bottom: {
    ru: 'дно',
    en: 'bottom',
    opts: {
      cone: ['конус', 'cone'],
      flat: ['плоское', 'flat'],
      basket: ['корзина', 'basket'],
      cyl: ['цилиндр', 'cylinder'],
    },
  },
  wall: {
    ru: 'стенка',
    en: 'wall',
    opts: {
      ribs: ['прямые рёбра', 'straight ribs'],
      spiral: ['спираль', 'spiral'],
      petal: ['лепестки', 'petals'],
      smooth: ['гладкая', 'smooth'],
    },
  },
  filter: {
    ru: 'фильтр',
    en: 'filter',
    opts: {
      pcone: ['бумага · конус', 'paper cone'],
      wave: ['волновой', 'wave'],
      pflat: ['бумага · диск', 'paper disc'],
      metal: ['металл', 'metal'],
      cloth: ['ткань', 'cloth'],
      built: ['встроенный', 'built-in'],
    },
  },
  material: {
    ru: 'материал',
    en: 'material',
    opts: {
      ceramic: ['керамика', 'ceramic'],
      glass: ['стекло', 'glass'],
      plastic: ['пластик', 'plastic'],
      metal: ['металл', 'metal'],
    },
  },
  vol: {
    ru: 'объём',
    en: 'volume',
    opts: {
      s: ['01 · до 300 мл', '01 · to 300 ml'],
      m: ['02 · до 500 мл', '02 · to 500 ml'],
      l: ['03 · до 700 мл', '03 · to 700 ml'],
    },
  },
} as const satisfies TraitRegistry;

/** `'flow' | 'bottom' | 'wall' | 'filter' | 'material' | 'vol'`. */
export type TraitKey = keyof typeof TRAITS;

/** Порядок групп в конструкторе девайса — тот же, что в объекте. */
export const TRAIT_KEYS = Object.keys(TRAITS) as readonly TraitKey[];

/**
 * Встроенный каталог девайсов (`data.js:110-114`). В прототипе он лежит рядом
 * с `seedDevices()`, который всегда возвращает пустой массив: свои девайсы
 * пользователь заводит сам, а эти три — заготовки конструктора (Q-2 спеки §9,
 * поэтому здесь только данные, без автоматической записи в базу).
 */
export const KNOWN_DEVICES: readonly DeviceRecord[] = [
  {
    id: 'v60',
    name: 'Hario V60-02',
    flow: 'perc',
    bottom: 'cone',
    wall: 'spiral',
    filter: 'pcone',
    material: 'plastic',
    vol: 'm',
  },
  {
    id: 'switch',
    name: 'Hario Switch',
    flow: 'hybrid',
    bottom: 'cone',
    wall: 'spiral',
    filter: 'pcone',
    material: 'glass',
    vol: 'm',
  },
  {
    id: 'aero',
    name: 'AeroPress',
    flow: 'imm',
    bottom: 'cyl',
    wall: 'smooth',
    filter: 'pflat',
    material: 'plastic',
    vol: 's',
  },
];
