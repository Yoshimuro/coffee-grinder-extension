/**
 * Строки интерфейса — порт `STR`/`stageName`/`modeName` (`data.js:158-195`).
 *
 * Обе таблицы по 145 ключей и полностью параллельны. Параллельность держит
 * компилятор: `EN` объявлен как `Record<StrKey, string>`, где `StrKey` выведен
 * из `RU`, — забытый перевод не соберётся, лишний ключ упрётся в проверку
 * лишних свойств.
 *
 * Переводы перенесены дословно, включая строчный регистр там, где он строчный,
 * и `·` как разделитель. Правка формулировок — отдельная продуктовая задача.
 */

import type { BrewMode, Lang, StageKey } from '../db/schema.js';
import { TRAITS } from './traits.js';

const RU = {
  appName: 'brew journal',
  nav_home: 'ГЛАВНЫЙ',
  nav_shelf: 'ПОЛКА',
  nav_log: 'ЖУРНАЛ',
  nav_more: 'ЕЩЁ',
  back: 'НАЗАД',

  home_brew: 'ЗАВАРИТЬ',
  home_convert: 'КОНВЕРТЕР',
  home_last: 'ПРОШЛЫЙ РАЗ',
  home_shelf: 'НА ПОЛКЕ',
  home_pending: 'ОЦЕНКА ЖДЁТ',
  home_pending_sub: 'кофе остыл — можно оценивать',
  home_rate: 'ОЦЕНИТЬ',
  home_empty: 'Журнал пуст. Заварить первую чашку',
  days: 'дн',
  grams: 'г',
  pcs: 'шт',

  phase_degas: 'дегазация',
  phase_peak: 'пик',
  phase_fade: 'спад',

  conv_title: 'КОНВЕРТЕР ПОМОЛА',
  conv_from: 'ОТКУДА',
  conv_to: 'КУДА',
  conv_range: 'ДИАПАЗОН',
  conv_center: 'центр',
  conv_resolves: 'разрешение',
  conv_permark: 'мкм/шаг',
  conv_calibrate: 'ОТКАЛИБРОВАТЬ',
  conv_calibrated: 'калибровано',
  conv_from_log: 'из журнала',
  conv_cal_q: 'Какая настройка реально дала хороший результат?',
  conv_cal_hint: 'сдвиг применится ко всем будущим пересчётам',
  conv_cal_apply: 'ПРИМЕНИТЬ',
  conv_cal_reset: 'СБРОС',
  conv_use: 'ВЗЯТЬ В ЗАВАРИВАНИЕ',

  shelf_title: 'ПОЛКА',
  shelf_add: 'ДОБАВИТЬ ПАЧКУ',
  shelf_add_photo: 'СНЯТЬ ПАЧКУ',
  shelf_add_manual: 'ВПИСАТЬ РУКАМИ',
  shelf_left: 'остаток',
  shelf_age: 'возраст',
  bean_photos: 'ФОТО ПАЧКИ',
  bean_photos_hint: 'первый снимок — лицо пачки. порядок задаёшь сам',
  bean_roast: 'ДАТА ОБЖАРКИ',
  bean_weight: 'ВЕС',
  bean_name: 'НАЗВАНИЕ',
  bean_optional: 'необязательно',
  bean_form: 'ФОРМА',
  form_beans: 'ЗЕРНО',
  form_ground: 'МОЛОТЫЙ',
  form_drip: 'ДРИП-ПАКЕТ',
  bean_brews: 'ЗАВАРИВАНИЯ',
  bean_add_photo: 'ЕЩЁ ФОТО',
  bean_dose_fixed: 'доза задана производителем',
  bean_save: 'СОХРАНИТЬ',

  dev_title: 'ДЕВАЙСЫ',
  dev_new: 'НОВЫЙ ДЕВАЙС',
  dev_edit: 'КОНСТРУКТОР',
  dev_name: 'ИМЯ',
  dev_hint: 'чертёж перестраивается из признаков',
  dev_save: 'СОХРАНИТЬ',

  brew_title: 'ЗАВАРИВАНИЕ',
  brew_bean: 'КОФЕ',
  brew_device: 'ТИП ЗАВАРИВАНИЯ',
  brew_grind: 'ПОМОЛ',
  brew_dose: 'ВЕС',
  brew_water: 'ВОДА',
  brew_temp: 'ТЕМПЕРАТУРА',
  brew_ratio: 'соотношение',
  brew_start: 'СТАРТ',
  brew_suggest: 'старт из конвертера',
  brew_pours: 'ПРОЛИВЫ',
  brew_no_grind: 'помол задан производителем',
  brew_drip_note: 'пакет = упаковка и воронка. девайс не выбирается',
  brew_valve: 'КЛАПАН',
  brew_valve_hint: 'момент открытия — переменная рецепта',

  t_bloom: 'СМАЧИВАНИЕ',
  t_pour: 'ПРОЛИВ',
  t_drain: 'ДРЕНАЖ',
  t_steep: 'НАСТАИВАНИЕ',
  t_stir: 'РАЗМЕШАТЬ',
  t_press: 'ПРОДАВИТЬ',
  t_pause: 'ПАУЗА',
  brew_manual: 'ЗАПИСАТЬ БЕЗ ТАЙМЕРА',
  brew_manual_hint: 'рецепт уже пролит — вписать как есть',
  t_valve: 'ОТКРЫТЬ КЛАПАН',
  t_next: 'ДАЛЬШЕ',
  t_done: 'ГОТОВО',
  t_finish: 'ЗАВЕРШИТЬ',
  t_awake: 'экран не гаснет',
  t_target: 'цель',
  t_water_total: 'воды всего',
  t_of: 'из',

  rate_later_t: 'ОЦЕНКА ПОЗЖЕ',
  rate_later_s:
    'кофе раскрывается, когда остывает. заваривание сохранено — вернись к нему с домашнего экрана',
  rate_ok: 'ПОНЯТНО',

  diag_title: 'ДИАГНОСТИКА',
  diag_sub: 'что подкрутить в следующий раз',
  diag_acid: 'КИСЛОТНОСТЬ',
  diag_bitter: 'ГОРЕЧЬ',
  diag_body: 'ТЕЛО',
  diag_balance: 'СЛАДОСТЬ',
  diag_advice: 'НА СЛЕДУЮЩИЙ РАЗ',
  diag_save: 'СОХРАНИТЬ',
  diag_to_wheel: 'НА ЧТО ПОХОЖЕ → КОЛЕСО',
  diag_skip: 'без дескрипторов',

  wheel_title: 'КОЛЕСО ВКУСОВ',
  wheel_root: 'ВСЁ',
  wheel_up: 'ВВЕРХ',
  wheel_picked: 'ВЫБРАНО',
  wheel_intensity: 'интенсивность',
  wheel_done: 'ГОТОВО',
  wheel_hint: 'тап — внутрь. центр — наверх. остановиться можно на любом уровне',
  wheel_mem: 'уже выбирал',
  wheel_prev: 'В ПРОШЛЫЙ РАЗ ОБ ЭТОМ ЗЕРНЕ',
  wheel_empty: 'пока ничего',

  log_title: 'ЖУРНАЛ',
  log_all: 'ВСЁ',
  log_compare: 'СРАВНИТЬ',
  log_pick2: 'выбери два заваривания',
  log_diff: 'подсвечены отличия',
  log_pending: 'ждёт оценки',
  log_param: 'ПАРАМЕТР',
  log_note: 'ЗАМЕТКА',
  log_desc: 'ДЕСКРИПТОРЫ',
  log_stages: 'СТАДИИ',
  log_repeat: 'ПОВТОРИТЬ',

  set_title: 'НАСТРОЙКИ',
  set_grinders: 'МОИ КОФЕМОЛКИ',
  set_devices: 'МОИ ДЕВАЙСЫ',
  set_export: 'ЭКСПОРТ БАЗЫ В ФАЙЛ',
  set_import: 'ИМПОРТ',
  set_lang: 'ЯЗЫК',
  set_spec: 'СПЕЦИФИКАЦИЯ',
  set_qr: 'QR РЕЦЕПТА',
  set_export_done: 'база записана в файл brew-journal.json',
  set_offline: 'локально · офлайн · без аккаунта',

  note_label: 'ЗАМЕТКА',
  note_mic: 'ГОЛОСОМ',
  note_mic_hint: 'распознанные дескрипторы предложатся тегами',
  note_ph: 'что заметил…',

  spec_title: 'СПЕЦИФИКАЦИЯ',
  spec_palette: 'ПАЛИТРА',
  spec_type: 'ТИПОГРАФИКА',
  spec_comp: 'КОМПОНЕНТЫ',
  spec_grid: 'СЕТКА',
} as const;

/** Ключ строки. 145 значений, выведены из русской таблицы. */
export type StrKey = keyof typeof RU;

const EN: Readonly<Record<StrKey, string>> = {
  appName: 'brew journal',
  nav_home: 'HOME',
  nav_shelf: 'SHELF',
  nav_log: 'LOG',
  nav_more: 'MORE',
  back: 'BACK',

  home_brew: 'LOG BREW',
  home_convert: 'CONVERTER',
  home_last: 'LAST BREW',
  home_shelf: 'ON SHELF',
  home_pending: 'RATING DUE',
  home_pending_sub: 'coffee has cooled — rate it now',
  home_rate: 'RATE',
  home_empty: 'Log is empty. Brew the first cup',
  days: 'd',
  grams: 'g',
  pcs: 'pcs',

  phase_degas: 'degassing',
  phase_peak: 'peak',
  phase_fade: 'fading',

  conv_title: 'GRIND CONVERTER',
  conv_from: 'FROM',
  conv_to: 'TO',
  conv_range: 'RANGE',
  conv_center: 'center',
  conv_resolves: 'resolves',
  conv_permark: 'µm/step',
  conv_calibrate: 'CALIBRATE',
  conv_calibrated: 'calibrated',
  conv_from_log: 'from log',
  conv_cal_q: 'Which setting actually brewed well?',
  conv_cal_hint: 'offset applies to all future conversions',
  conv_cal_apply: 'APPLY',
  conv_cal_reset: 'RESET',
  conv_use: 'USE IN BREW',

  shelf_title: 'SHELF',
  shelf_add: 'ADD BAG',
  shelf_add_photo: 'SHOOT THE BAG',
  shelf_add_manual: 'TYPE IT IN',
  shelf_left: 'left',
  shelf_age: 'age',
  bean_photos: 'BAG PHOTOS',
  bean_photos_hint: 'first shot is the face. you set the order',
  bean_roast: 'ROAST DATE',
  bean_weight: 'WEIGHT',
  bean_name: 'NAME',
  bean_optional: 'optional',
  bean_form: 'FORM',
  form_beans: 'BEANS',
  form_ground: 'GROUND',
  form_drip: 'DRIP BAG',
  bean_brews: 'BREWS',
  bean_add_photo: 'ADD PHOTO',
  bean_dose_fixed: 'dose set by the producer',
  bean_save: 'SAVE',

  dev_title: 'BREWERS',
  dev_new: 'NEW BREWER',
  dev_edit: 'CONSTRUCTOR',
  dev_name: 'NAME',
  dev_hint: 'the drawing rebuilds from traits',
  dev_save: 'SAVE',

  brew_title: 'BREW',
  brew_bean: 'COFFEE',
  brew_device: 'BREW TYPE',
  brew_grind: 'GRIND',
  brew_dose: 'WEIGHT',
  brew_water: 'WATER',
  brew_temp: 'TEMPERATURE',
  brew_ratio: 'ratio',
  brew_start: 'START',
  brew_suggest: 'start from converter',
  brew_pours: 'POURS',
  brew_no_grind: 'grind set by the producer',
  brew_drip_note: 'the bag is both pack and dripper. no device to pick',
  brew_valve: 'VALVE',
  brew_valve_hint: 'open moment is a recipe variable',

  t_bloom: 'BLOOM',
  t_pour: 'POUR',
  t_drain: 'DRAWDOWN',
  t_steep: 'STEEP',
  t_stir: 'STIR',
  t_press: 'PRESS',
  t_pause: 'PAUSE',
  brew_manual: 'LOG WITHOUT TIMER',
  brew_manual_hint: 'already brewed — log it as is',
  t_valve: 'OPEN VALVE',
  t_next: 'NEXT',
  t_done: 'DONE',
  t_finish: 'FINISH',
  t_awake: 'screen stays on',
  t_target: 'target',
  t_water_total: 'water total',
  t_of: 'of',

  rate_later_t: 'RATE LATER',
  rate_later_s:
    'coffee opens up as it cools. the brew is saved — come back from the home screen',
  rate_ok: 'OK',

  diag_title: 'DIAGNOSTICS',
  diag_sub: 'what to adjust next time',
  diag_acid: 'ACIDITY',
  diag_bitter: 'BITTERNESS',
  diag_body: 'BODY',
  diag_balance: 'SWEETNESS',
  diag_advice: 'NEXT TIME',
  diag_save: 'SAVE',
  diag_to_wheel: 'WHAT IT TASTES LIKE → WHEEL',
  diag_skip: 'no descriptors',

  wheel_title: 'FLAVOR WHEEL',
  wheel_root: 'ALL',
  wheel_up: 'UP',
  wheel_picked: 'PICKED',
  wheel_intensity: 'intensity',
  wheel_done: 'DONE',
  wheel_hint: 'tap to go deeper. center goes up. any level is a valid stop',
  wheel_mem: 'picked before',
  wheel_prev: 'LAST TIME ABOUT THIS COFFEE',
  wheel_empty: 'nothing yet',

  log_title: 'LOG',
  log_all: 'ALL',
  log_compare: 'COMPARE',
  log_pick2: 'pick two brews',
  log_diff: 'differences highlighted',
  log_pending: 'rating due',
  log_param: 'PARAMETER',
  log_note: 'NOTE',
  log_desc: 'DESCRIPTORS',
  log_stages: 'STAGES',
  log_repeat: 'REPEAT',

  set_title: 'SETTINGS',
  set_grinders: 'MY GRINDERS',
  set_devices: 'MY BREWERS',
  set_export: 'EXPORT BASE TO FILE',
  set_import: 'IMPORT',
  set_lang: 'LANGUAGE',
  set_spec: 'SPEC',
  set_qr: 'RECIPE QR',
  set_export_done: 'base written to brew-journal.json',
  set_offline: 'local · offline · no account',

  note_label: 'NOTE',
  note_mic: 'VOICE',
  note_mic_hint: 'recognized descriptors will be offered as tags',
  note_ph: 'what you noticed…',

  spec_title: 'SPEC',
  spec_palette: 'PALETTE',
  spec_type: 'TYPE',
  spec_comp: 'COMPONENTS',
  spec_grid: 'GRID',
};

/** Таблицы строк по языкам. Заморожены — правка в рантайме исключена. */
export const STR: Readonly<Record<Lang, Readonly<Record<StrKey, string>>>> = Object.freeze({
  ru: Object.freeze(RU),
  en: Object.freeze(EN),
});

/** Строка по ключу. Тонкая обёртка, чтобы экраны не тянули `STR` целиком. */
export function t(key: StrKey, lang: Lang): string {
  return STR[lang][key];
}

/**
 * Имя стадии. В прототипе ключ склеивался на лету с фолбэком на сырой `k`
 * (`data.js:194`); здесь `t_${StageKey}` — доказуемо существующий ключ, поэтому
 * фолбэк не нужен.
 */
export function stageName(k: StageKey, lang: Lang): string {
  return STR[lang][`t_${k}`];
}

/**
 * Имя режима заваривания (`data.js:195`). Два разных пространства enum'ов:
 * `perc|imm|hybrid` берутся из `TRAITS.flow`, а `drip`/`cup` живут отдельно —
 * сводить их в один тип нельзя (data-js-report §11).
 */
export function modeName(m: BrewMode, lang: Lang): string {
  if (m === 'cup') return lang === 'ru' ? 'Дегустация' : 'Tasting';
  if (m === 'drip') return STR[lang].form_drip;
  return TRAITS.flow.opts[m][lang === 'ru' ? 0 : 1];
}
