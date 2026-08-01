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
    ru: 'Поток',
    en: 'Flow',
    opts: {
      perc: ['Пролив', 'Percolation'],
      imm: ['Иммерсия', 'Immersion'],
      hybrid: ['Гибрид · клапан', 'Hybrid · valve'],
    },
  },
  bottom: {
    ru: 'Дно',
    en: 'Bottom',
    opts: {
      cone: ['Конус', 'Cone'],
      flat: ['Плоское', 'Flat'],
      basket: ['Корзина', 'Basket'],
      cyl: ['Цилиндр', 'Cylinder'],
    },
  },
  wall: {
    ru: 'Стенка',
    en: 'Wall',
    opts: {
      ribs: ['Прямые рёбра', 'Straight ribs'],
      spiral: ['Спираль', 'Spiral'],
      petal: ['Лепестки', 'Petals'],
      smooth: ['Гладкая', 'Smooth'],
    },
  },
  filter: {
    ru: 'Фильтр',
    en: 'Filter',
    opts: {
      pcone: ['Бумага · конус', 'Paper cone'],
      wave: ['Волновой', 'Wave'],
      pflat: ['Бумага · диск', 'Paper disc'],
      metal: ['Металл', 'Metal'],
      cloth: ['Ткань', 'Cloth'],
      built: ['Встроенный', 'Built-in'],
    },
  },
  material: {
    ru: 'Материал',
    en: 'Material',
    opts: {
      ceramic: ['Керамика', 'Ceramic'],
      glass: ['Стекло', 'Glass'],
      plastic: ['Пластик', 'Plastic'],
      metal: ['Металл', 'Metal'],
    },
  },
  vol: {
    ru: 'Объём',
    en: 'Volume',
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
