/**
 * Dexie schema — version 1.
 *
 * This file is a contract (see `docs/tasks/BJ-2/contracts.md`). The table
 * names, primary keys and indexes below are the first shipped shape of the
 * database; they are never edited in place. Every later change lands as a new
 * `version(N).stores({...}).upgrade(...)` block appended underneath, so an
 * install that already holds a user's brews can migrate forward.
 *
 * The record types mirror `docs/brew-journal-design.md` §6.
 */

import Dexie, { type Table } from 'dexie';

import type { WheelEdit } from '../data/wheel-edits.js';

/* ── Кофемолки ───────────────────────────────────────────────────────────── */

/** What one unit on a grinder's dial is called. Mirrors `GrinderScale` in @coffee/core. */
export type GrinderUnit = 'click' | 'number' | 'mark';

export interface GrinderScale {
  min: number;
  max: number;
  step: number;
  unit: GrinderUnit;
  /** Presentation only, for grinders dialled as "rotations + clicks". */
  clicksPerRotation?: number;
}

/**
 * A grinder the user owns. Stored flattened as a linear calibration rather than
 * as the core `Calibration` union: the converter needs `micronsPerStep` for the
 * "µm/шаг" tech line and calibration offsets are expressed in steps of the
 * user's own grinder, neither of which an anchors curve can answer directly.
 */
export interface GrinderRecord {
  /** Local id. For a grinder taken from the catalogue this equals `datasetId`. */
  id: string;
  /** Shown in pickers and on the converter. */
  name: string;
  /** Entry in the @coffee/core catalogue this was derived from, if any. */
  datasetId?: string;
  micronsPerStep: number;
  zeroOffsetMicrons: number;
  scale: GrinderScale;
}

/* ── Полка ───────────────────────────────────────────────────────────────── */

/** Форма кофе. Determines which fields a brew setup shows. */
export type BeanForm = 'beans' | 'ground' | 'drip';

/**
 * One bag photo. An array, not a count (D-3 of the design doc: README wins over
 * the prototype). The first entry is the face of the bag; order is the user's.
 * Only paths live in the database — never base64.
 */
export interface PhotoRef {
  /** File in `Directory.Data`. */
  path: string;
  /** 256px thumbnail, also on disk. */
  thumb: string;
}

export interface BeanRecord {
  id: string;
  form: BeanForm;
  name?: string;
  roaster?: string;
  /** Roast date, ISO `YYYY-MM-DD`. Drives the freshness phase. */
  roast: string;
  photos: PhotoRef[];
  /** Граммы — for `beans` and `ground`. */
  weight?: number;
  left?: number;
  /** Штуки — for `drip`. */
  count?: number;
  leftCount?: number;
  /** Grams per drip bag; set by the producer, so the brew setup locks it. */
  dose?: number;
}

/* ── Девайсы ─────────────────────────────────────────────────────────────── */

/* Keys below are the `TRAITS` option sets of the prototype's data.js; the
   generative device drawing reads exactly these. */
export type DeviceFlow = 'perc' | 'imm' | 'hybrid';
export type DeviceBottom = 'cone' | 'flat' | 'basket' | 'cyl';
export type DeviceWall = 'ribs' | 'spiral' | 'petal' | 'smooth';
export type DeviceFilter = 'pcone' | 'wave' | 'pflat' | 'metal' | 'cloth' | 'built';
export type DeviceMaterial = 'ceramic' | 'glass' | 'plastic' | 'metal';
export type DeviceVolume = 's' | 'm' | 'l';

export interface DeviceRecord {
  id: string;
  name: string;
  flow: DeviceFlow;
  bottom: DeviceBottom;
  wall: DeviceWall;
  filter: DeviceFilter;
  material: DeviceMaterial;
  vol: DeviceVolume;
}

/* ── Журнал ──────────────────────────────────────────────────────────────── */

/**
 * `mode` is deliberately not `DeviceFlow`: `drip` and `cup` are brews with no
 * device at all, and collapsing the two enum spaces would lose that (design
 * doc §5).
 */
export type BrewMode = 'perc' | 'imm' | 'hybrid' | 'drip' | 'cup';

export type StageKey =
  | 'bloom'
  | 'pour'
  | 'drain'
  | 'steep'
  | 'stir'
  | 'press'
  /** Отметка нулевой длительности. */
  | 'valve'
  /** Written by the timer when the user pauses; «стекание» is one of these. */
  | 'pause';

/** Actual, not planned: `[key, duration in seconds, water in grams]`. */
export type Stage = [key: StageKey, sec: number, water: number];

export type Intensity = 1 | 2 | 3;

/** `[descriptorId, intensity]` — one picked leaf of the flavour wheel. */
export type Descriptor = [id: string, intensity: Intensity];

/** Four 0..10 scales. `balance` is «СЛАДОСТЬ» in the UI. */
export interface Diagnostics {
  acid: number;
  bitter: number;
  body: number;
  balance: number;
}

/** `pending` = brewed but not yet rated; the home screen surfaces those. */
export type EntryStatus = 'pending' | 'done';

export interface EntryRecord {
  id: string;
  /** ISO `YYYY-MM-DD`; indexed, so the log sorts and filters on it. */
  date: string;
  /** `HH:MM`. */
  time: string;
  /** Bean id, or null for a `cup` entry (tasted elsewhere). */
  bean: string | null;
  /** Device id, or null for `drip`/`cup`. */
  device: string | null;
  /** Denormalised device name so an entry survives deleting the device. */
  devName: string;
  mode: BrewMode;
  /** Setting on the user's own grinder; null when the producer set it. */
  grind: number | null;
  dose: number;
  water: number;
  temp: number;
  /** Total seconds. */
  total: number;
  stages: Stage[];
  pours?: number;
  /** Second at which the hybrid valve was opened. */
  valveAt?: number;
  status: EntryStatus;
  diag: Diagnostics;
  desc: Descriptor[];
  note: string;
  /** Only for `cup` entries, which have no bag behind them. */
  title?: string;
}

/* ── Настройки ───────────────────────────────────────────────────────────── */

export type Lang = 'ru' | 'en';

/**
 * Что выбрал пользователь. `system` — следовать системной настройке; хранится
 * именно как выбор, а не как результат, иначе смена темы в ОС переставала бы
 * до приложения доезжать.
 */
export type ThemePref = 'dark' | 'light' | 'system';

/**
 * Что реально применено: `system` до DOM и до нативной оболочки не доезжает,
 * его разрешает `resolveTheme()` в `ui/theme.ts`. Отдельный тип нужен, чтобы
 * «неразрешённое» значение нельзя было передать туда, где ждут цвет.
 */
export type Theme = 'dark' | 'light';

/** Grind offset in steps of the user's own grinder, plus where it came from. */
export interface Calibration {
  offset: number;
  /** Id of the log entry the offset was learnt from, if any. */
  src: string | null;
}

/**
 * The settings table is a key/value store, so this map is what gives it types.
 * Adding a setting means adding a key here — no schema migration needed.
 */
export interface SettingsValues {
  lang: Lang;
  /**
   * Тема оформления (BJ-9). Умолчание `dark`: до BJ-9 темы не было вовсе, и
   * установка, обновившаяся на новую версию, обязана выглядеть как вчера.
   *
   * Источник правды — эта строка. Её зеркало в `localStorage` (см.
   * `ui/theme.ts`) и её отражение в нативной оболочке (`platform/shell-theme`)
   * — производные: они нужны там, где до IndexedDB ещё не дошли руки, то есть
   * до первого кадра.
   */
  theme: ThemePref;
  /** First-run guard. Set last, inside the seed transaction. */
  seeded: boolean;
  calib: Calibration;
  /** Grinder ids last used on the converter. */
  convFrom: string | null;
  convTo: string | null;
  /**
   * Настройка «ОТКУДА» на конвертере (D-9). Хранится, потому что её показывает
   * не только конвертер: подсказка под помолом в сетапе заваривания обязана
   * говорить то же самое, что экран конвертера, а без сохранённого значения она
   * считала полосу по своей же кофемолке и расходилась с ним.
   *
   * Ключ, а не таблица: `settings` — key/value, и новая строка в ней схему
   * (версии, таблицы, индексы) не трогает.
   */
  convVal: number;
  /** Recently used grinder ids, most recent first. */
  recents: string[];
  /**
   * Id уже показанных подсказок первого входа (BJ-10).
   *
   * Ключ, а не таблица: `settings` — key/value, и новая строка в ней не трогает
   * ни версию схемы, ни индексы. Реестр id — `data/hints.ts`, он append-only:
   * переименованный id вернул бы подсказку всем, кто её уже закрыл.
   */
  hints: string[];
  /**
   * Показывать ли подсказки вообще. `false` ставит кнопка «СКРЫТЬ ПОДСКАЗКИ» на
   * самой подсказке — на случай, когда человек всё знает или мы показали то,
   * что уже показывали.
   */
  hintsOn: boolean;
  /**
   * Правки колеса вкусов — пользовательский оверлей поверх встроенной базы
   * (`data/wheel-edits.ts`). Порядок значим, применяются по очереди.
   *
   * Ключ, а не таблица: список маленький (десятки правок), читается и пишется
   * целиком, а главное — как строка настроек он попадает в экспорт/импорт
   * (`transfer.ts`) без единой правки формата архива.
   */
  wheelEdits: WheelEdit[];
}

export type SettingKey = keyof SettingsValues;

export interface SettingRecord {
  key: SettingKey;
  value: SettingsValues[SettingKey];
}

/* ── База ────────────────────────────────────────────────────────────────── */

export const DB_NAME = 'brew-journal';

export class BrewJournalDB extends Dexie {
  /* Assigned in the constructor rather than declared with `!`: under
     `useDefineForClassFields` (implied by ES2022) a bare field declaration
     would emit `undefined` over the table objects Dexie installs in `super`. */
  readonly grinders: Table<GrinderRecord, string>;
  readonly beans: Table<BeanRecord, string>;
  readonly devices: Table<DeviceRecord, string>;
  readonly entries: Table<EntryRecord, string>;
  readonly settings: Table<SettingRecord, SettingKey>;

  constructor(name: string = DB_NAME) {
    super(name);

    // ── Schema v1 — contract. Append new versions below, never edit this one.
    this.version(1).stores({
      grinders: 'id',
      beans: 'id, form',
      devices: 'id',
      entries: 'id, date, status, bean, mode',
      settings: 'key',
    });

    this.grinders = this.table('grinders');
    this.beans = this.table('beans');
    this.devices = this.table('devices');
    this.entries = this.table('entries');
    this.settings = this.table('settings');
  }
}

/** The instance the app uses. Tests build their own with a throwaway name. */
export const db = new BrewJournalDB();

/* ── Типизированный доступ к настройкам ──────────────────────────────────── */

export async function getSetting<K extends SettingKey>(
  key: K,
  database: BrewJournalDB = db,
): Promise<SettingsValues[K] | undefined> {
  const row = await database.settings.get(key);
  // The table is one row type with a union `value`; the key narrows it, which
  // only an assertion can express.
  return row === undefined ? undefined : (row.value as SettingsValues[K]);
}

export async function putSetting<K extends SettingKey>(
  key: K,
  value: SettingsValues[K],
  database: BrewJournalDB = db,
): Promise<void> {
  await database.settings.put({ key, value });
}
