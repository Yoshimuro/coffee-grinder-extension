/**
 * Девайсы — строки и черновик конструктора (`devLine` `DC:1130`,
 * `newDev`/`draftNote` `DC:1274`/`DC:1277`).
 *
 * Чистые функции: экран только раскладывает результат. Заметка о влиянии
 * признаков — не украшение, а единственное место, где приложение объясняет,
 * зачем эти чипы вообще нажимают.
 */

import { STR } from '../../../data/strings.js';
import { TRAITS, type TraitKey } from '../../../data/traits.js';
import type {
  DeviceMaterial,
  DeviceRecord,
  DeviceWall,
  Lang,
} from '../../../db/schema.js';
import type { StrKey } from '../../../data/strings.js';
import type { DeviceTraits } from './dev-geometry.js';

const SEP = ' · ';

/** Подпись опции признака на языке интерфейса. */
export function traitLabel(key: TraitKey, option: string, lang: Lang): string {
  const opts = TRAITS[key].opts as Record<string, readonly [string, string]>;
  return opts[option]?.[lang === 'ru' ? 0 : 1] ?? option;
}

/** Заголовок группы признаков: «Поток», «Дно», … */
export function groupLabel(key: TraitKey, lang: Lang): string {
  return TRAITS[key][lang];
}

/**
 * Тех-строка девайса: `поток · дно · стенка · фильтр · материал` (`devLine`,
 * `DC:1130`). Объём в неё не входит — он виден по размеру чертежа.
 */
export function devLine(device: DeviceTraits, lang: Lang): string {
  return (['flow', 'bottom', 'wall', 'filter', 'material'] as const)
    .map((key) => traitLabel(key, device[key], lang))
    .join(SEP);
}

/* ── Заметка о влиянии признаков ─────────────────────────────────────────── */

const MATERIAL_NOTE: Record<DeviceMaterial, StrKey> = {
  ceramic: 'dev_mat_ceramic',
  glass: 'dev_mat_glass',
  plastic: 'dev_mat_plastic',
  metal: 'dev_mat_metal',
};

const WALL_NOTE: Record<DeviceWall, StrKey> = {
  petal: 'dev_wall_petal',
  ribs: 'dev_wall_ribs',
  spiral: 'dev_wall_spiral',
  smooth: 'dev_wall_smooth',
};

/**
 * Что выбранные стенка и материал делают с завариванием (`draftNote`,
 * `DC:1277`). Стенка идёт первой — она влияет на поток, то есть на время, а
 * материал только на тепло.
 */
export function draftNote(device: DeviceTraits, lang: Lang): string {
  const t = STR[lang];
  return [t[WALL_NOTE[device.wall]], t[MATERIAL_NOTE[device.material]]].join(SEP);
}

/* ── Черновик ────────────────────────────────────────────────────────────── */

/**
 * Новый девайс (`newDev`, `DC:1274`). Дефолт — конус с лепестками и бумажным
 * фильтром: это V60, самая частая воронка, и с неё правок нужно меньше всего.
 */
export const NEW_DEVICE: Readonly<Omit<DeviceRecord, 'id'>> = Object.freeze({
  name: '',
  flow: 'perc',
  bottom: 'cone',
  wall: 'petal',
  filter: 'pcone',
  material: 'plastic',
  vol: 'm',
});

/** Имя девайса, если его не вписали (`saveDev`, `DC:1280`). */
export function deviceName(name: string, lang: Lang): string {
  return name.trim() || STR[lang].dev_untitled;
}
