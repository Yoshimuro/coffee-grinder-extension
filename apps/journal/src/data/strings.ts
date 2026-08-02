/**
 * Строки интерфейса — порт `STR`/`stageName`/`modeName` (`data.js:158-195`).
 *
 * Обе таблицы одинаковой длины (146 ключей из прототипа плюс добавленные в
 * BJ-4 — они помечены блоками по группам) и полностью параллельны. Точное
 * число зафиксировано тестом `strings.test.ts`. Параллельность держит
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
  home_empty: 'Журнал пуст. Заварите первую чашку',
  days: 'дн',
  grams: 'г',
  pcs: 'шт',

  phase_degas: 'дегазация',
  phase_peak: 'пик',
  phase_fade: 'спад',

  conv_title: 'КОНВЕРТЕР ПОМОЛА',
  conv_from: 'ОТКУДА',
  conv_to: 'КУДА',
  conv_range: 'диапазон',
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
  /** Единственная кнопка полки (BJ-8): камера сама не открывается. */
  shelf_add_bean: 'ДОБАВИТЬ КОФЕ',
  /** Подпись слота добавления фото в форме — не кнопка полки. */
  shelf_add_photo: 'СНЯТЬ ПАЧКУ',
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
  wheel_tap_tag: 'тап по тегу',
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
  /* Три чипа в одну строку с лейблом при 393 px помещаются впритык, поэтому
     подписи короткие: «ТЁМНАЯ · СВЕТЛАЯ · СИСТЕМА» уже не влезало бы. */
  set_theme: 'ТЕМА',
  theme_dark: 'ТЁМН',
  theme_light: 'СВЕТЛ',
  theme_system: 'АВТО',
  set_spec: 'СПЕЦИФИКАЦИЯ',
  /* Имя файла — из контракта №2 (BJ-6), а не из прототипа: там выгрузка была
     JSON'ом без фото и без обработчика. */
  set_export_done: 'база записана в brew-journal-export.zip',
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

  /* ── Добавлено в BJ-4 ──────────────────────────────────────────────────────
     Прототип держал эти куски текста прямо в методах (`entryTitle`, `entrySub`,
     `entryMark`) — здесь они обязаны жить в таблице, иначе английская версия
     экранов журнала останется русской. */
  entry_cup: 'Чашка',
  entry_cup_sub: 'дегустация · без рецепта',
  entry_grind: 'помол',
  /** Префикс оценки: «С 6» / «S 6». Буква от «сладость» / «sweetness». */
  entry_mark: 'С',
  /** Прочерк на месте удалённой пачки или девайса. */
  entry_none: '—',
  deg: '°',

  /* Подписи для скринридера: сами кнопки несут только знак («−», «+», «×»). */
  a11y_less: 'меньше',
  a11y_more: 'больше',
  a11y_remove: 'убрать',

  /* ── Добавлено в BJ-4 G5 (конвертер) ───────────────────────────────────────
     Прототип держал эти куски прямо в шаблоне и в геттерах (`dbCountLine`,
     `toHint`, `calSuggestLine`, `calibLine`), причём часть — тернарником по
     языку. Здесь они обязаны быть ключами: иначе английский конвертер снова
     наполовину русский. */
  /** Счётчик в шапке: «134 кофемолки · база». */
  conv_db: 'кофемолки · база',
  /** Плейсхолдер поиска. Имена брендов — одни и те же в обоих языках. */
  conv_search: 'EK43, Comandante, Ode…',
  conv_recent: 'НЕДАВНИЕ',
  conv_none: 'ничего не найдено',
  /** Подпись у «КУДА»: список берётся из настроек, чужих молок там нет. */
  conv_to_hint: 'своя · из настроек',
  /** Источник калибровки, когда настройку ввели руками. */
  conv_manual: 'вручную',
  /** Шкала журнала в подсказке калибровки. */
  conv_cal_balance: 'баланс',
  conv_cal_at: 'при',
  conv_warn_clamped: 'за пределами шкалы',
  conv_warn_estimated: 'калибровка оценочная — диапазон шире',

  /* Названия делений шкалы. Прототип знал только «кликов» (`DC:979`), но в
     каталоге ядра три вида шкал, и номерная молка кликов не щёлкает. */
  unit_click: 'кликов',
  unit_number: 'делений',
  unit_mark: 'меток',
  /** Микрон. Символ, не перевод, — но в JSX хардкодов не держим. */
  um: 'µm',

  /* ── Добавлено в BJ-4 G3 (журнал, деталь, сравнение, диагностика) ──────────
     Прототип держал эти подписи прямо в `render()` тернарниками `ru ? … : …`
     (`DC:1165`, `DC:1174-1188`, `DC:1305-1311`, `DC:1333-1338`) — то есть
     английский журнал наполовину оставался русским. */

  /** Подпись в сетке параметров и строка сравнения. */
  log_time: 'ВРЕМЯ',
  log_mode: 'РЕЖИМ',
  /** Строка сравнения: пачка. Отдельно от `form_beans` — там форма кофе. */
  log_bean: 'ЗЕРНО',
  /** Строка сравнения: девайс. Отдельно от `brew_device` — там тип заваривания. */
  log_device: 'ДЕВАЙС',
  /** Подпись температуры в сетке параметров. Символ, не перевод. */
  temp_short: 'T°',

  /* Фильтры журнала. Не `modeName`: чип называет отбор («ЧАШКИ» — множество
     дегустаций), а не режим одной записи, и обязан влезать в ленту. */
  log_f_perc: 'ПРОЛИВ',
  log_f_imm: 'ИММЕРСИЯ',
  log_f_hybrid: 'ГИБРИД',
  log_f_drip: 'ДРИП',
  log_f_cup: 'ЧАШКИ',

  /** Указатели колонок сравнения. Латиница в обоих языках. */
  cmp_a: 'A',
  cmp_b: 'B',

  /* Диагностика дегустации «вне журнала» (`openTaste`). */
  diag_taste: 'дегустация',
  diag_taste_sub: 'что в чашке — по ощущению',
  diag_wheel_sub: 'колесо вкусов',
  taste_name: 'ЧТО ЗА КОФЕ',
  taste_name_ph: 'кофейня, зерно — как запомнишь',

  /* ── Добавлено в BJ-4 G2 (сетап, таймер, «оценка позже») ───────────────────
     Прототип держал этот текст тернарниками `ru ? … : …` прямо в геттерах
     (`hyChips` `DC:1286`, `grindHint` `DC:1294`, `tWaterLine`/`tNextLine`/
     `tBtnLabel` `DC:1201-1204`, `rlNowLabel` `DC:1304`) — английский таймер и
     английский сетап оставались наполовину русскими. */

  /** Режимы гибрида: клапан закрыт до конца, открыт всегда, открывается по времени. */
  brew_hy_imm: 'ИММЕРСИЯ',
  brew_hy_perc: 'ПРОЛИВ',
  brew_hy_mid: 'СЕРЕДИНА',
  /** Начало подсказки под помолом: «конвертер: 3.2 — 6.0 · центр 4.6». */
  brew_conv: 'конвертер',
  /** D-3: расчёт переживает невыбранный девайс, но сетап об этом не молчит. */
  brew_no_device: 'девайс не выбран · считаем проливом',
  brew_add_bean: '+ ЗЕРНО',
  brew_add_device: '+ ДЕВАЙС',
  /** Секунда. Момент открытия клапана — единственное поле сетапа в секундах. */
  unit_sec: 'с',

  /** Строка воды в паузе: вода не льётся, идёт стекание. */
  t_draining: 'даём стечь',
  /** Начало строки «дальше: ПРОЛИВ · 70 г». */
  t_next_line: 'дальше',
  t_last_stage: 'последняя стадия',
  /** Номер стадии в паузе: счёт стадий стоит. */
  t_paused_num: '· · ·',

  rate_now: 'ОЦЕНИТЬ СЕЙЧАС',
  rate_later_btn: 'ПОЗЖЕ',

  /* ── Добавлено в BJ-4 S-6 (интеграция: полка, девайсы, настройки, дом) ─────
     Группы G1 и G4 не сдали работу, их экраны собраны здесь. Строки те же, что
     держал прототип: часть — тернарниками `ru ? … : …` в `renderVals`
     (`DC:1213-1214`, `DC:1252`, `DC:1259`, `DC:1263-1266`, `DC:1340-1343`),
     часть — прямо в шаблоне. */

  /** Дата ждущей записи, когда она сегодняшняя (`pendingWhen`, `DC:1225`). */
  home_today: 'сегодня',
  /** Вход в дегустацию «вне журнала» (`tasteLabel`, `DC:1301`). */
  home_taste: 'ОЦЕНИТЬ ЧАШКУ',

  /** Счётчик полки: «3 · пачки» (`shelfCount`, `DC:1252`). */
  shelf_packs: 'пачки',
  /** Подпись пустого слота фото на карточке полки. */
  shelf_ph: 'фото пачки',

  /* Подписи слотов на карточке пачки (`beanSlots`, `DC:1259`). Первый снимок —
     лицо, остальные — шов с датой обжарки. */
  bean_ph_face: 'лицо пачки',
  bean_ph_seam: 'шов · дата обжарки',
  /** Слот на экране добавления (`addSlotPh`, `DC:1263`). */
  bean_ph_new: 'снимок зерна',
  bean_photo_hint: 'хватит одного снимка — лицо пачки',
  /** Количество у дрипа: считаем пакеты, а не граммы (`addAmtLabel`, `DC:1266`). */
  bean_count: 'ШТУК В КОРОБКЕ',
  /** Имя пачки, если его не вписали (`addSave`, `DC:1271`). */
  bean_untitled: 'Без названия',

  /* Заметка конструктора девайса — что признак делает с завариванием
     (`matNote`/`wallNote`, `DC:1213-1214`). Ключа `wall.flat` в TRAITS нет:
     в прототипе это мёртвая ветка, сюда не перенесена. */
  dev_mat_ceramic: 'керамика держит тепло — прогревать дольше',
  dev_mat_glass: 'стекло — быстрый прогрев, быстрое остывание',
  dev_mat_plastic: 'пластик почти не крадёт тепло',
  dev_mat_metal: 'металл — мгновенный прогрев, следи за температурой',
  dev_wall_petal: 'лепестки уменьшают контакт бумаги — поток быстрее',
  dev_wall_ribs: 'рёбра держат бумагу от стенки',
  dev_wall_spiral: 'спираль ведёт поток к центру',
  dev_wall_smooth: 'гладкая стенка — медленнее дренаж',
  /** Имя девайса, если его не вписали (`saveDev`, `DC:1280`). */
  dev_untitled: 'Свой девайс',

  /* CRUD кофемолок в настройках (`DC:1340-1343`). */
  set_g_add: '+ КОФЕМОЛКА',
  set_g_step: 'ШАГ, µm',
  set_del_q: 'УДАЛИТЬ?',
  set_del_yes: 'ДА',
  /** Версия в подвале. Не перевод — номер, но в JSX хардкодов не держим. */
  set_ver: 'v0.2',

  /* ── Добавлено в BJ-6 (обмен базой и QR) ───────────────────────────────────
     Экспорт и импорт до этой задачи были строками без обработчиков (D-7), а QR
     на детали не было вовсе (D-12): обе площадки ждали настоящих файлов и
     настоящего кодировщика. Дождались. */

  /** Подпись под «ЭКСПОРТ БАЗЫ В ФАЙЛ»: что именно уедет. */
  set_export_hint: 'записи, полка, снимки — одним zip',
  /** Подпись под «ИМПОРТ»: чем это кончится. Предупреждение, а не реклама. */
  set_import_hint: 'zip из экспорта · база заменится целиком',
  /** Импорт прошёл. */
  set_import_done: 'база восстановлена из файла',
  /** Версия формата чужая — импорт не начинался. */
  set_import_bad: 'файл не от этой версии — ничего не изменилось',
  /** Файл не разбирается: не архив, нет data.json, битый JSON. */
  set_import_broken: 'файл не читается — ничего не изменилось',
  /** Идёт распаковка или сборка: обе операции не мгновенные на большой полке. */
  set_busy: 'подожди…',

  /** Заголовок блока QR на детали записи. */
  qr_title: 'РЕЦЕПТ КОДОМ',
  /** Подпись под кодом: что с ним делать. */
  qr_hint: 'снять камерой другого телефона',

  /* ── Добавлено после эмуляторного QA (BJ-7) ────────────────────────────────
     Три пустых состояния делили одну строку про пустой журнал: на полке она
     звала заваривать вместо того, чтобы звать снять пачку, а на ненайденной
     записи просто врала (баг 3 прогона). Тон прежний — называем следующее
     действие и молчим об остальном. */

  /** Полка пуста: приглашение снять первую пачку. */
  shelf_empty: 'Полка пуста. Снять первую пачку',
  /** У пачки ещё нет заварок — своё состояние, не «журнал пуст». */
  bean_no_brews: 'Заварок с этой пачкой пока нет',
  /** Деталь открыли, а записи нет: удалили или база не отдала. */
  log_not_found: 'Запись не найдена',

  /* ── Добавлено в BJ-8 (календарь даты обжарки) ─────────────────────────────
     Поле даты осталось текстовым с автомаской, календарь — второй способ
     ввода. Нативный `<input type="date">` не подошёл ещё в BJ-4: WebView
     рисует его чужими цветами и шрифтом (см. `parseDate`), поэтому пикер
     свой — и подписи его живут здесь. */

  /* Подписи для скринридера: кнопки несут значок сетки и стрелки. */
  cal_open: 'календарь',
  cal_prev: 'прошлый месяц',
  cal_next: 'следующий месяц',

  /* Заголовок месяца. По ключу на месяц: имена из номера не выводятся. */
  cal_jan: 'ЯНВАРЬ',
  cal_feb: 'ФЕВРАЛЬ',
  cal_mar: 'МАРТ',
  cal_apr: 'АПРЕЛЬ',
  cal_may: 'МАЙ',
  cal_jun: 'ИЮНЬ',
  cal_jul: 'ИЮЛЬ',
  cal_aug: 'АВГУСТ',
  cal_sep: 'СЕНТЯБРЬ',
  cal_oct: 'ОКТЯБРЬ',
  cal_nov: 'НОЯБРЬ',
  cal_dec: 'ДЕКАБРЬ',

  /* Шапка сетки. Неделя с понедельника в обоих языках. */
  cal_mo: 'ПН',
  cal_tu: 'ВТ',
  cal_we: 'СР',
  cal_th: 'ЧТ',
  cal_fr: 'ПТ',
  cal_sa: 'СБ',
  cal_su: 'ВС',
} as const;

/** Ключ строки. Значения выведены из русской таблицы; счёт держит тест. */
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
  conv_range: 'range',
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
  shelf_add_bean: 'ADD COFFEE',
  shelf_add_photo: 'SHOOT THE BAG',
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
  wheel_tap_tag: 'tap the tag',
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
  set_theme: 'THEME',
  theme_dark: 'DARK',
  theme_light: 'LIGHT',
  theme_system: 'AUTO',
  set_spec: 'SPEC',
  set_export_done: 'base written to brew-journal-export.zip',
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

  entry_cup: 'Cup',
  entry_cup_sub: 'tasting · no recipe',
  entry_grind: 'grind',
  entry_mark: 'S',
  entry_none: '—',
  deg: '°',

  a11y_less: 'less',
  a11y_more: 'more',
  a11y_remove: 'remove',

  conv_db: 'grinders · base',
  conv_search: 'EK43, Comandante, Ode…',
  conv_recent: 'RECENT',
  conv_none: 'no grinders match',
  conv_to_hint: 'yours · from settings',
  conv_manual: 'manual',
  conv_cal_balance: 'balance',
  conv_cal_at: 'at',
  conv_warn_clamped: 'outside the dial',
  conv_warn_estimated: 'calibration is estimated — wider band',

  unit_click: 'clicks',
  unit_number: 'numbers',
  unit_mark: 'marks',
  um: 'µm',

  log_time: 'TIME',
  log_mode: 'MODE',
  log_bean: 'COFFEE',
  log_device: 'BREWER',
  temp_short: 'T°',

  log_f_perc: 'PERC',
  log_f_imm: 'IMM',
  log_f_hybrid: 'HYBRID',
  log_f_drip: 'DRIP',
  log_f_cup: 'CUPS',

  cmp_a: 'A',
  cmp_b: 'B',

  diag_taste: 'tasting',
  diag_taste_sub: 'what is in the cup — by feel',
  diag_wheel_sub: 'flavor wheel',
  taste_name: 'WHAT COFFEE',
  taste_name_ph: 'café, coffee — as you will recall it',

  brew_hy_imm: 'IMMERSION',
  brew_hy_perc: 'PERC',
  brew_hy_mid: 'MID',
  brew_conv: 'converter',
  brew_no_device: 'no brewer picked · counted as percolation',
  brew_add_bean: '+ COFFEE',
  brew_add_device: '+ BREWER',
  unit_sec: 's',

  t_draining: 'letting it drain',
  t_next_line: 'next',
  t_last_stage: 'last stage',
  t_paused_num: '· · ·',

  rate_now: 'RATE NOW',
  rate_later_btn: 'LATER',

  home_today: 'today',
  home_taste: 'RATE A CUP',

  shelf_packs: 'packs',
  shelf_ph: 'pack photo',

  bean_ph_face: 'front of bag',
  bean_ph_seam: 'seam · roast date',
  bean_ph_new: 'shoot the bag — or drop a file',
  bean_photo_hint: 'one shot is enough — the front of the bag',
  bean_count: 'BAGS IN BOX',
  bean_untitled: 'Untitled',

  dev_mat_ceramic: 'ceramic holds heat — preheat longer',
  dev_mat_glass: 'glass — fast preheat, fast cooling',
  dev_mat_plastic: 'plastic steals almost no heat',
  dev_mat_metal: 'metal — instant heat, watch the temp',
  dev_wall_petal: 'petals reduce paper contact — faster flow',
  dev_wall_ribs: 'ribs keep paper off the wall',
  dev_wall_spiral: 'spiral guides flow to the center',
  dev_wall_smooth: 'smooth wall — slower drawdown',
  dev_untitled: 'Custom brewer',

  set_g_add: '+ GRINDER',
  set_g_step: 'STEP, µm',
  set_del_q: 'DELETE?',
  set_del_yes: 'YES',
  set_ver: 'v0.2',

  set_export_hint: 'entries, shelf, photos — one zip',
  set_import_hint: 'zip from export · replaces the whole base',
  set_import_done: 'base restored from file',
  set_import_bad: 'file is from another version — nothing changed',
  set_import_broken: 'file cannot be read — nothing changed',
  set_busy: 'wait…',

  qr_title: 'RECIPE AS CODE',
  qr_hint: 'shoot it with another phone',

  shelf_empty: 'Shelf is empty. Shoot the first bag',
  bean_no_brews: 'No brews with this bag yet',
  log_not_found: 'Entry not found',

  cal_open: 'calendar',
  cal_prev: 'previous month',
  cal_next: 'next month',

  cal_jan: 'JANUARY',
  cal_feb: 'FEBRUARY',
  cal_mar: 'MARCH',
  cal_apr: 'APRIL',
  cal_may: 'MAY',
  cal_jun: 'JUNE',
  cal_jul: 'JULY',
  cal_aug: 'AUGUST',
  cal_sep: 'SEPTEMBER',
  cal_oct: 'OCTOBER',
  cal_nov: 'NOVEMBER',
  cal_dec: 'DECEMBER',

  cal_mo: 'MO',
  cal_tu: 'TU',
  cal_we: 'WE',
  cal_th: 'TH',
  cal_fr: 'FR',
  cal_sa: 'SA',
  cal_su: 'SU',
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
