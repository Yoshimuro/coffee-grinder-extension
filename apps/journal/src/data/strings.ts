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
 * Служебный текст пишется строчными буквами и без точки в конце.
 * Названия моделей в примерах сохраняют фирменное написание; пользовательские
 * имена и заметки не проходят через преобразование регистра.
 */

import type { BrewMode, Lang, StageKey } from '../db/schema.js';
import { TRAITS } from './traits.js';

const RU = {
  appName: 'brew journal',
  nav_home: 'главный',
  nav_shelf: 'полка',
  nav_log: 'журнал',
  nav_more: 'ещё',
  back: 'назад',

  home_brew: 'заварить кофе',
  home_first_coffee: 'добавь кофе, чтобы записать первое приготовление',
  home_convert: 'конвертация помола',
  home_last: 'прошлый раз',
  home_shelf: 'на полке',
  home_pending: 'можно оценить чашку',
  home_pending_sub: 'попробуй кофе и запиши впечатления',
  home_rate: 'оценить',
  home_empty: 'ты пока не записал ни одного приготовления. начни с первой чашки',
  log_no_matches: 'под выбранным фильтром нет записей. попробуй другой фильтр',
  days: 'дн',
  grams: 'г',
  pcs: 'шт',

  phase_degas: 'дегазация',
  phase_peak: 'пик',
  phase_fade: 'спад',

  conv_title: 'конвертер помола',
  conv_from: 'откуда',
  conv_to: 'куда',
  conv_range: 'диапазон',
  conv_center: 'центр',
  conv_resolves: 'разрешение',
  conv_permark: 'мкм/шаг',
  conv_calibrate: 'откалибровать',
  conv_calibrated: 'калибровано',
  conv_from_log: 'из журнала',
  conv_cal_q: 'на какой настройке у тебя получился удачный кофе?',
  conv_cal_hint: 'конвертер будет учитывать эту поправку в следующих расчётах',
  conv_cal_apply: 'применить',
  conv_cal_reset: 'сброс',
  conv_use: 'взять в заваривание',

  shelf_title: 'полка',
  shelf_add: 'добавить пачку',
  /** Единственная кнопка полки (BJ-8): камера сама не открывается. */
  shelf_add_bean: 'добавить кофе',
  /** Подпись слота добавления фото в форме — не кнопка полки. */
  shelf_add_photo: 'добавить фото пачки',
  shelf_left: 'остаток',
  shelf_age: 'возраст',
  bean_photos: 'фото пачки',
  bean_photos_hint: 'первое фото будет обложкой пачки на полке',
  bean_roast: 'дата обжарки',
  bean_weight: 'вес',
  bean_name: 'название',
  bean_optional: 'необязательно',
  bean_form: 'форма',
  form_beans: 'зерно',
  form_ground: 'молотый',
  form_drip: 'дрип-пакет',
  bean_brews: 'заваривания',
  bean_add_photo: 'ещё фото',
  bean_dose_fixed: 'доза задана производителем',
  bean_save: 'сохранить',

  dev_title: 'устройства',
  dev_new: 'добавить устройство',
  dev_edit: 'настройка устройства',
  dev_name: 'имя',
  dev_hint: 'рисунок меняется вместе с выбранными настройками',
  dev_save: 'сохранить',

  brew_title: 'заваривание',
  brew_bean: 'кофе',
  brew_device: 'тип заваривания',
  brew_grind: 'помол',
  brew_dose: 'вес',
  brew_water: 'вода',
  brew_temp: 'температура',
  brew_ratio: 'соотношение',
  brew_start: 'старт',
  brew_suggest: 'помол из конвертера',
  brew_pours: 'проливы',
  brew_no_grind: 'помол задан производителем',
  /* Дрип разлочен (BJ-12): у пакета нет только помола и девайса — вес задан
     пакетом, а температура, проливы и рецепт настраиваются как у воронки. */
  brew_drip_note: 'в дрип-пакете кофе уже смолот и отмерен. воду, температуру и проливы можно настроить',
  brew_valve: 'клапан',
  brew_valve_hint: 'укажи, через сколько секунд открыть клапан',

  t_bloom: 'смачивание',
  t_pour: 'пролив',
  t_drain: 'стекание',
  t_drain_wait: 'дайте воде стечь',
  t_steep: 'настаивание',
  t_stir: 'размешать',
  t_press: 'продавить',
  t_pause: 'пауза',
  brew_manual: 'записать без таймера',
  brew_manual_hint: 'для кофе, который ты уже приготовил',
  t_valve: 'открыть клапан',
  t_next: 'дальше',
  t_to_drain: 'перейти к стеканию',
  t_done: 'завершить и сохранить',
  t_finish: 'завершить',
  t_awake: 'экран не гаснет',
  t_target: 'цель',
  t_water_total: 'воды всего',
  t_of: 'из',
  /* Таймер больше не подгоняет: вместо «цель» под временем и в строке стадии
     стоит «рецепт» — то же число, но названное подсказкой (BJ-12). */
  t_recipe: 'рецепт',

  /* Редактор рецепта на сетапе (BJ-12). */
  rec_title: 'рецепт',
  rec_auto: 'вернуть исходный рецепт',
  rec_total: 'итого',
  rec_holds: 'в рецепте',

  rate_later_t: 'оценка позже',
  rate_later_s:
    'приготовление сохранено. можешь оценить чашку сейчас или вернуться к ней позже с главного экрана',
  rate_ok: 'понятно',

  diag_title: 'оценка чашки',
  diag_sub: 'расскажи, каким получился кофе',
  diag_acid: 'кислотность',
  diag_bitter: 'горечь',
  diag_body: 'тело',
  diag_balance: 'сладость',
  diag_advice: 'на следующий раз',
  diag_save: 'сохранить',
  diag_to_wheel: 'на что похоже → колесо',
  diag_skip: 'без описания вкуса',

  wheel_title: 'колесо вкусов',
  wheel_root: 'всё',
  wheel_up: 'вверх',
  wheel_picked: 'выбрано',
  wheel_intensity: 'интенсивность',
  wheel_tap_tag: 'нажми, чтобы изменить',
  wheel_done: 'готово',
  wheel_hint: 'нажми на сектор, чтобы уточнить вкус, или в центр, чтобы вернуться. можно выбрать вкус на любом уровне',
  wheel_mem: 'уже выбирал',
  wheel_prev: 'в прошлый раз об этом зерне',
  wheel_empty: 'ты пока не выбрал ни одного вкуса',

  /* Правки колеса: режим на самом колесе и их список в настройках. */
  wheel_edit: 'правка',
  wheel_rename: 'переименовать',
  wheel_add: 'добавить',
  wheel_hide_q: 'скрыть?',
  wheel_edit_hint: 'здесь можно переименовать вкусы, скрыть ненужные или добавить свои',
  wheel_edit_root: 'открой категорию, в которую хочешь добавить свой вкус',
  wheel_edit_added: 'добавлено',
  wheel_edit_renamed: 'переименовано',
  wheel_edit_hidden: 'скрыто',
  wheel_edits_reset: 'сбросить правки колеса',

  /* Четыре режима колеса (BJ-12). */
  wheel_mode_drill: 'уровни',
  wheel_mode_map: 'карта',
  wheel_mode_canvas: 'полотно',
  wheel_mode_list: 'список',
  wheel_map_hint: 'нажми на подходящий вкус. можно выбрать и целую категорию',
  wheel_map_edit_hint: 'выбери категорию, которую хочешь изменить или дополнить',
  wheel_add_inside: 'внутрь',
  wheel_zoom_out: 'мельче',
  wheel_zoom_in: 'крупнее',

  log_title: 'журнал',
  log_all: 'всё',
  log_compare: 'сравнить',
  log_pick2: 'выбери два заваривания',
  log_diff: 'подсвечены отличия',
  log_pending: 'ждёт оценки',
  log_param: 'параметр',
  log_note: 'заметка',
  log_desc: 'оттенки вкуса',
  log_stages: 'стадии',
  log_repeat: 'повторить',
  /* Правка записи «карандашиком» (BJ-12). */
  log_edit: 'правка',
  log_rerate: 'изменить оценку и вкусы',

  set_title: 'настройки',
  set_grinders: 'мои кофемолки',
  set_devices: 'мои устройства',
  set_export: 'экспорт базы в файл',
  set_storage: 'хранение данных',
  set_storage_checking: 'проверяем, защищены ли записи от автоматической очистки',
  set_storage_protected: 'браузер не будет автоматически очищать записи. если удалить данные сайта вручную, журнал тоже удалится',
  set_storage_best_effort: 'защита от очистки не включена. нажми, чтобы запросить её, и сохрани резервную копию',
  set_storage_unavailable: 'не удалось проверить защиту от очистки. сохрани резервную копию записей',
  set_import: 'импорт',
  set_lang: 'язык',
  /* Три чипа в одну строку с лейблом при 393 px помещаются впритык, поэтому
     подписи короткие: «ТЁМНАЯ · СВЕТЛАЯ · СИСТЕМА» уже не влезало бы. */
  set_theme: 'тема',
  theme_dark: 'тёмн',
  theme_light: 'светл',
  theme_system: 'авто',
  set_spec: 'спецификация',
  /* Имя файла — из контракта №2 (BJ-6), а не из прототипа: там выгрузка была
     JSON'ом без фото и без обработчика. */
  set_export_done: 'все данные сохранены в brew-journal-export.zip',
  set_offline: 'локально · офлайн · без аккаунта',

  note_label: 'заметка',
  note_mic: 'голосом',
  note_mic_hint: 'распознанные вкусы можно добавить к оценке',
  note_ph: 'что заметил…',

  spec_title: 'спецификация',
  spec_palette: 'палитра',
  spec_type: 'типографика',
  spec_comp: 'компоненты',
  spec_grid: 'сетка',

  /* ── Добавлено в BJ-4 ──────────────────────────────────────────────────────
     Прототип держал эти куски текста прямо в методах (`entryTitle`, `entrySub`,
     `entryMark`) — здесь они обязаны жить в таблице, иначе английская версия
     экранов журнала останется русской. */
  entry_cup: 'чашка',
  entry_cup_sub: 'дегустация · без рецепта',
  entry_grind: 'помол',
  /** Префикс оценки: «С 6» / «S 6». Буква от «сладость» / «sweetness». */
  entry_mark: 'с',
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
  conv_db: 'кофемолок',
  /** Плейсхолдер поиска. Имена брендов — одни и те же в обоих языках. */
  conv_search: 'EK43, Comandante, Ode…',
  conv_recent: 'недавние',
  conv_none: 'не удалось найти кофемолку. попробуй другое название',
  /** Подпись у «КУДА»: список берётся из настроек, чужих молок там нет. */
  conv_to_hint: 'твоя кофемолка из настроек',
  /** Источник калибровки, когда настройку ввели руками. */
  conv_manual: 'вручную',
  /** Шкала журнала в подсказке калибровки. */
  conv_cal_balance: 'баланс',
  conv_cal_at: 'при',
  conv_warn_clamped: 'эта настройка выходит за пределы шкалы кофемолки',
  conv_warn_estimated: 'данные о помоле приблизительные, поэтому диапазон получился шире',

  /* В русском интерфейсе все шкалы называем делениями. Типы шкал в данных
     сохраняются; отдельные формы нужны для чисел и дробного результата. */
  unit_click: 'делений',
  unit_number: 'делений',
  unit_mark: 'делений',
  unit_division_one: 'деление',
  unit_division_few: 'деления',
  /** Микрон. Символ, не перевод, — но в JSX хардкодов не держим. */
  um: 'µm',

  /* ── Добавлено в BJ-4 G3 (журнал, деталь, сравнение, диагностика) ──────────
     Прототип держал эти подписи прямо в `render()` тернарниками `ru ? … : …`
     (`DC:1165`, `DC:1174-1188`, `DC:1305-1311`, `DC:1333-1338`) — то есть
     английский журнал наполовину оставался русским. */

  /** Подпись в сетке параметров и строка сравнения. */
  log_time: 'время',
  log_mode: 'режим',
  /** Строка сравнения: пачка. Отдельно от `form_beans` — там форма кофе. */
  log_bean: 'зерно',
  /** Строка сравнения: девайс. Отдельно от `brew_device` — там тип заваривания. */
  log_device: 'устройство',
  /** Подпись температуры в сетке параметров. Символ, не перевод. */
  temp_short: 't°',

  /* Фильтры журнала. Не `modeName`: чип называет отбор («ЧАШКИ» — множество
     дегустаций), а не режим одной записи, и обязан влезать в ленту. */
  log_f_perc: 'пролив',
  log_f_imm: 'иммерсия',
  log_f_hybrid: 'гибрид',
  log_f_drip: 'дрип',
  log_f_cup: 'чашки',

  /** Указатели колонок сравнения. Латиница в обоих языках. */
  cmp_a: 'a',
  cmp_b: 'b',

  /* Диагностика дегустации «вне журнала» (`openTaste`). */
  diag_taste: 'дегустация',
  diag_taste_sub: 'оцени вкус кофе',
  diag_wheel_sub: 'колесо вкусов',
  taste_name: 'что за кофе',
  taste_name_ph: 'название кофе или кофейни',

  /* ── Добавлено в BJ-4 G2 (сетап, таймер, «оценка позже») ───────────────────
     Прототип держал этот текст тернарниками `ru ? … : …` прямо в геттерах
     (`hyChips` `DC:1286`, `grindHint` `DC:1294`, `tWaterLine`/`tNextLine`/
     `tBtnLabel` `DC:1201-1204`, `rlNowLabel` `DC:1304`) — английский таймер и
     английский сетап оставались наполовину русскими. */

  /** Режимы гибрида: клапан закрыт до конца, открыт всегда, открывается по времени. */
  brew_hy_imm: 'иммерсия',
  brew_hy_perc: 'пролив',
  brew_hy_mid: 'середина',
  /** Начало подсказки под помолом: «конвертер: 3.2 — 6.0 · центр 4.6». */
  brew_conv: 'конвертер',
  /** D-3: расчёт переживает невыбранный девайс, но сетап об этом не молчит. */
  brew_no_device: 'пока устройство не выбрано, показан рецепт для воронки',
  brew_add_bean: '+ кофе',
  brew_add_device: '+ устройство',
  /** Секунда. Момент открытия клапана — единственное поле сетапа в секундах. */
  unit_sec: 'с',

  /** Строка воды в паузе: вода не льётся, идёт стекание. */
  t_draining: 'даём стечь',
  /** Начало строки «дальше: ПРОЛИВ · 70 г». */
  t_next_line: 'дальше',
  t_last_stage: 'последняя стадия',
  /** Номер стадии в паузе: счёт стадий стоит. */
  t_paused_num: '· · ·',

  rate_now: 'оценить сейчас',
  rate_later_btn: 'позже',

  /* ── Добавлено в BJ-4 S-6 (интеграция: полка, девайсы, настройки, дом) ─────
     Группы G1 и G4 не сдали работу, их экраны собраны здесь. Строки те же, что
     держал прототип: часть — тернарниками `ru ? … : …` в `renderVals`
     (`DC:1213-1214`, `DC:1252`, `DC:1259`, `DC:1263-1266`, `DC:1340-1343`),
     часть — прямо в шаблоне. */

  /** Дата ждущей записи, когда она сегодняшняя (`pendingWhen`, `DC:1225`). */
  home_today: 'сегодня',
  /** Вход в дегустацию «вне журнала» (`tasteLabel`, `DC:1301`). */
  home_taste: 'оценить чашку',

  /** Счётчик полки: «3 · пачки» (`shelfCount`, `DC:1252`). */
  shelf_packs: 'пачек',
  /** Подпись пустого слота фото на карточке полки. */
  shelf_ph: 'фото пачки',

  /* Подписи слотов на карточке пачки (`beanSlots`, `DC:1259`). Первый снимок —
     лицо, остальные — шов с датой обжарки. */
  bean_ph_face: 'фото пачки',
  bean_ph_seam: 'дата обжарки на пачке',
  /** Слот на экране добавления (`addSlotPh`, `DC:1263`). */
  bean_ph_new: 'добавить фото пачки',
  bean_photo_hint: 'фото добавлять необязательно',
  /** Количество у дрипа: считаем пакеты, а не граммы (`addAmtLabel`, `DC:1266`). */
  bean_count: 'штук в коробке',
  /** Имя пачки, если его не вписали (`addSave`, `DC:1271`). */
  bean_untitled: 'без названия',

  /* Заметка конструктора девайса — что признак делает с завариванием
     (`matNote`/`wallNote`, `DC:1213-1214`). Ключа `wall.flat` в TRAITS нет:
     в прототипе это мёртвая ветка, сюда не перенесена. */
  dev_mat_ceramic: 'керамика хорошо держит тепло, но её нужно дольше прогревать',
  dev_mat_glass: 'стекло быстро прогревается и быстро остывает',
  dev_mat_plastic: 'пластик забирает меньше тепла у воды',
  dev_mat_metal: 'металл быстро нагревается, поэтому следи за температурой',
  dev_wall_petal: 'лепестки оставляют место между фильтром и стенкой, чтобы вода проходила быстрее',
  dev_wall_ribs: 'рёбра не дают бумажному фильтру прилипнуть к стенке',
  dev_wall_spiral: 'спираль направляет воду к центру',
  dev_wall_smooth: 'у гладкой стенки вода стекает медленнее',
  /** Имя девайса, если его не вписали (`saveDev`, `DC:1280`). */
  dev_untitled: 'моё устройство',

  /* CRUD кофемолок в настройках (`DC:1340-1343`). */
  set_g_add: '+ кофемолка',
  set_g_step: 'микрон на деление',
  set_del_q: 'удалить?',
  set_del_yes: 'да',
  /** Версия в подвале. Не перевод — номер, но в JSX хардкодов не держим. */
  set_ver: 'v0.2',

  /* ── Добавлено в BJ-6 (обмен базой и QR) ───────────────────────────────────
     Экспорт и импорт до этой задачи были строками без обработчиков (D-7), а QR
     на детали не было вовсе (D-12): обе площадки ждали настоящих файлов и
     настоящего кодировщика. Дождались. */

  /** Подпись под «ЭКСПОРТ БАЗЫ В ФАЙЛ»: что именно уедет. */
  set_export_hint: 'сохранить записи, кофе и фотографии в один архив',
  /** Подпись под «ИМПОРТ»: чем это кончится. Предупреждение, а не реклама. */
  set_import_hint: 'восстановить данные из архива. текущие данные будут заменены',
  /** Импорт прошёл. */
  set_import_done: 'данные восстановлены из архива',
  /** Версия формата чужая — импорт не начинался. */
  set_import_bad: 'этот архив создан в другой версии приложения. текущие данные остались на месте',
  /** Файл не разбирается: не архив, нет data.json, битый JSON. */
  set_import_broken: 'не удалось прочитать архив. проверь файл и попробуй снова. текущие данные остались на месте',
  /** Идёт распаковка или сборка: обе операции не мгновенные на большой полке. */
  set_busy: 'обрабатываем архив…',

  /** Заголовок блока QR на детали записи. */
  qr_title: 'поделиться рецептом',
  /** Подпись под кодом: что с ним делать. */
  qr_hint: 'отсканируй код камерой другого телефона',

  /* ── Добавлено после эмуляторного QA (BJ-7) ────────────────────────────────
     Три пустых состояния делили одну строку про пустой журнал: на полке она
     звала заваривать вместо того, чтобы звать снять пачку, а на ненайденной
     записи просто врала (баг 3 прогона). Тон прежний — называем следующее
     действие и молчим об остальном. */

  /** Пустая полка приглашает добавить кофе, а не открыть камеру. */
  shelf_empty: 'ты пока не добавил кофе. добавь первую пачку',
  /** У пачки ещё нет заварок — своё состояние, не «журнал пуст». */
  bean_no_brews: 'ты пока не записал приготовлений с этим кофе',
  /** Деталь открыли, а записи нет: удалили или база не отдала. */
  log_not_found: 'не удалось найти запись. вернись в журнал и выбери другую',

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
  cal_jan: 'январь',
  cal_feb: 'февраль',
  cal_mar: 'март',
  cal_apr: 'апрель',
  cal_may: 'май',
  cal_jun: 'июнь',
  cal_jul: 'июль',
  cal_aug: 'август',
  cal_sep: 'сентябрь',
  cal_oct: 'октябрь',
  cal_nov: 'ноябрь',
  cal_dec: 'декабрь',

  /* Шапка сетки. Неделя с понедельника в обоих языках. */
  cal_mo: 'пн',
  cal_tu: 'вт',
  cal_we: 'ср',
  cal_th: 'чт',
  cal_fr: 'пт',
  cal_sa: 'сб',
  cal_su: 'вс',

  /* ── Добавлено в BJ-10 (подсказки первого входа) ───────────────────────────
     Реестр зон — `data/hints.ts`, тексты — здесь: подсказка это интерфейс, и
     английская версия обязана быть с первого дня, а не «когда-нибудь».

     Обращаемся на «ты» и объясняем действие обычным русским языком.
     Связываем действие с результатом, не рубим текст на определения и обрывки.
     Важные последствия (например, замену данных при импорте) называем прямо.

     Второе правило: подсказка не ссылается на то, о чём человек ещё не знает.
     Полка не рассказывает про снимок пачки — про него говорит сам слот фото в
     форме, где его видно. Про фазы свежести не говорим вовсе: возраст и фаза
     подписаны на карточке, и подсказка повторяла бы экран. */

  /** Дальше по цепочке. Отдельно от `t_next`: там кнопка таймера. */
  hint_next: 'следующая подсказка',
  /** Последний шаг цепочки. */
  hint_done: 'закрыть подсказку',
  /** Выключить подсказки совсем. Вернуть — строкой в настройках. */
  hint_close: 'отключить подсказки',

  hint_home_brew: 'нажми «заварить кофе», чтобы настроить рецепт и начать приготовление',
  hint_home_conv: 'здесь можно перевести настройку помола с одной кофемолки на другую',
  hint_home_taste: 'здесь можно оценить чашку, даже если ты не записывал её приготовление',
  hint_home_pending: 'ты уже записал это приготовление, но пока не оценил чашку',

  hint_shelf_add: 'здесь можно добавить кофе на полку',
  hint_add_form: 'укажи, какой у тебя кофе, чтобы приложение показало нужные настройки приготовления',
  hint_add_photo: 'можешь добавить фото пачки или сохранить кофе без фотографии',
  hint_add_roast: 'введи дату обжарки с пачки или выбери её в календаре. точки между цифрами появятся сами',
  hint_bean_brews: 'здесь собраны все приготовления с этим кофе',

  hint_brew_fields: 'настройки зависят от выбранного кофе: то, что уже задано производителем, повторно вводить не нужно',
  hint_brew_device: 'выбери, в чём будешь готовить кофе. если ничего не выбрать, приложение составит рецепт для конической воронки',
  hint_brew_grind: 'под помолом показан диапазон из конвертера. можешь взять его за ориентир или указать свою настройку',
  hint_brew_outputs: 'нажми «старт», если собираешься готовить кофе сейчас. если уже приготовил, выбери «записать без таймера»',
  hint_rate_later: 'приготовление уже записано в журнал. оценить чашку можно сейчас или позже с главного экрана',

  hint_diag_scales: 'оцени кислотность, горечь, тело и сладость от 0 до 10, нажимая на нужные деления',
  hint_diag_wheel: 'на колесе можно выбрать оттенки вкуса и добавить их к оценке чашки',
  hint_diag_note: 'надиктуй заметку, и приложение предложит добавить распознанные вкусы к оценке',
  hint_wheel_nav: 'нажимай на секторы, чтобы уточнять вкус. чтобы вернуться на уровень выше, нажми в центр колеса',
  hint_wheel_here: 'не обязательно доходить до самого точного названия: можно выбрать вкус на любом уровне',
  hint_wheel_tag: 'нажми на выбранный вкус, чтобы изменить его интенсивность, или на крестик, чтобы убрать его',
  hint_wheel_memory: 'точки показывают вкусы, которые ты отмечал в предыдущих записях',

  hint_conv_from: 'здесь можно выбрать кофемолку из каталога. введи бренд, модель или сокращённое название, чтобы её найти',
  hint_conv_band: 'полученная настройка округлена до деления твоей кофемолки. полоса показывает возможный разброс из-за неточности исходных данных',
  hint_conv_cal: 'если ты уже подобрал удачный помол, укажи его здесь, чтобы конвертер учитывал эту настройку в следующих расчётах',
  hint_conv_use: 'нажми эту кнопку, чтобы перенести результат в рецепт. в поле помола появится середина рассчитанного диапазона',

  hint_log_filters: 'здесь можно отобрать записи по кофе и способу приготовления',
  hint_log_compare: 'выбери две записи, чтобы сравнить приготовления и увидеть, чем они отличаются',
  hint_detail_repeat: 'эта кнопка перенесёт параметры из записи в новое приготовление, чтобы ты мог повторить рецепт',
  hint_detail_stages: 'здесь записано, как прошло приготовление, включая паузы. точкой отмечены действия без отсчёта времени',
  hint_detail_qr: 'в этом коде сохранены помол, дозировка, количество воды, температура и этапы приготовления',
  hint_compare_diff: 'более ярким текстом показаны параметры, которые отличаются в этих приготовлениях',

  hint_more_grinders: 'здесь можно добавить свои кофемолки и указать для каждой название и размер деления в микронах, чтобы конвертер мог пересчитывать помол',
  hint_more_transfer: 'сохрани архив со всеми данными, чтобы перенести их на другое устройство или сделать резервную копию. при импорте данные из архива заменят всё, что сейчас сохранено в приложении',
  hint_devices_new: 'добавь своё устройство для приготовления кофе и выбери его форму, материал и фильтр',
  hint_device_presets: 'выбери готовый вариант, чтобы не заполнять всё вручную. потом можно изменить любые параметры',
  hint_device_flow: 'от выбранного способа приготовления зависит, какие шаги появятся в таймере',

  /* Строка настроек. Выключатель и сброс стоят рядом: человек, проскочивший
     подсказку тапом, иначе не может её вернуть. */
  set_hints: 'подсказки',
  set_hints_hint: 'по одной при первом входе на экран',
  set_hints_on: 'вкл',
  set_hints_off: 'выкл',
  set_hints_reset: 'показать заново',

  /* ── Запись без таймера (баг-фикс BJ-10) ───────────────────────────────────
     Кнопка писала запись сразу, подставляя ей плановые стадии и их сумму как
     фактические. Теперь она открывает панель, где человек называет то
     единственное, что знает: сколько это шло. */

  /** Вопрос панели. */
  brew_manual_q: 'сколько времени заняло приготовление?',
  /** Ноль в поле времени — не измеренный ноль, а его отсутствие. */
  brew_manual_zero: 'не засекал',
  /** Предложение: «по плану 3:35». Тап ставит это время. */
  brew_manual_plan: 'по плану',
  /** Почему у такой записи не будет стадий. */
  brew_manual_stages: 'время отдельных этапов не сохранится, потому что приготовление прошло без таймера',
} as const;

/** Ключ строки. Значения выведены из русской таблицы; счёт держит тест. */
export type StrKey = keyof typeof RU;

const EN: Readonly<Record<StrKey, string>> = {
  appName: 'brew journal',
  nav_home: 'home',
  nav_shelf: 'shelf',
  nav_log: 'log',
  nav_more: 'more',
  back: 'back',

  home_brew: 'brew coffee',
  home_first_coffee: 'add your coffee to log your first brew',
  home_convert: 'grind conversion',
  home_last: 'last brew',
  home_shelf: 'on shelf',
  home_pending: 'rating due',
  home_pending_sub: 'coffee has cooled — rate it now',
  home_rate: 'rate',
  home_empty: 'log is empty. brew the first cup',
  log_no_matches: 'no entries match this filter. try another filter',
  days: 'd',
  grams: 'g',
  pcs: 'pcs',

  phase_degas: 'degassing',
  phase_peak: 'peak',
  phase_fade: 'fading',

  conv_title: 'grind converter',
  conv_from: 'from',
  conv_to: 'to',
  conv_range: 'range',
  conv_center: 'center',
  conv_resolves: 'resolves',
  conv_permark: 'µm/step',
  conv_calibrate: 'calibrate',
  conv_calibrated: 'calibrated',
  conv_from_log: 'from log',
  conv_cal_q: 'which setting actually brewed well?',
  conv_cal_hint: 'offset applies to all future conversions',
  conv_cal_apply: 'apply',
  conv_cal_reset: 'reset',
  conv_use: 'use in brew',

  shelf_title: 'shelf',
  shelf_add: 'add bag',
  shelf_add_bean: 'add coffee',
  shelf_add_photo: 'shoot the bag',
  shelf_left: 'left',
  shelf_age: 'age',
  bean_photos: 'bag photos',
  bean_photos_hint: 'first shot is the face. you set the order',
  bean_roast: 'roast date',
  bean_weight: 'weight',
  bean_name: 'name',
  bean_optional: 'optional',
  bean_form: 'form',
  form_beans: 'beans',
  form_ground: 'ground',
  form_drip: 'drip bag',
  bean_brews: 'brews',
  bean_add_photo: 'add photo',
  bean_dose_fixed: 'dose set by the producer',
  bean_save: 'save',

  dev_title: 'brewers',
  dev_new: 'new brewer',
  dev_edit: 'constructor',
  dev_name: 'name',
  dev_hint: 'the drawing rebuilds from traits',
  dev_save: 'save',

  brew_title: 'brew',
  brew_bean: 'coffee',
  brew_device: 'brew type',
  brew_grind: 'grind',
  brew_dose: 'weight',
  brew_water: 'water',
  brew_temp: 'temperature',
  brew_ratio: 'ratio',
  brew_start: 'start',
  brew_suggest: 'start from converter',
  brew_pours: 'pours',
  brew_no_grind: 'grind set by the producer',
  brew_drip_note: 'drip bag: nothing to grind, weight set by the bag — the rest is as a pourover',
  brew_valve: 'valve',
  brew_valve_hint: 'open moment is a recipe variable',

  t_bloom: 'bloom',
  t_pour: 'pour',
  t_drain: 'drawdown',
  t_drain_wait: 'let the water drain',
  t_steep: 'steep',
  t_stir: 'stir',
  t_press: 'press',
  t_pause: 'pause',
  brew_manual: 'log without timer',
  brew_manual_hint: 'already brewed — log it as is',
  t_valve: 'open valve',
  t_next: 'next',
  t_to_drain: 'let the water drain',
  t_done: 'finish and save',
  t_finish: 'finish',
  t_awake: 'screen stays on',
  t_target: 'target',
  t_water_total: 'water total',
  t_of: 'of',
  t_recipe: 'recipe',

  rec_title: 'recipe',
  rec_auto: 'back to auto',
  rec_total: 'total',
  rec_holds: 'recipe holds',

  rate_later_t: 'rate later',
  rate_later_s:
    'coffee opens up as it cools. the brew is saved — come back from the home screen',
  rate_ok: 'ok',

  diag_title: 'diagnostics',
  diag_sub: 'what to adjust next time',
  diag_acid: 'acidity',
  diag_bitter: 'bitterness',
  diag_body: 'body',
  diag_balance: 'sweetness',
  diag_advice: 'next time',
  diag_save: 'save',
  diag_to_wheel: 'what it tastes like → wheel',
  diag_skip: 'no descriptors',

  wheel_title: 'flavor wheel',
  wheel_root: 'all',
  wheel_up: 'up',
  wheel_picked: 'picked',
  wheel_intensity: 'intensity',
  wheel_tap_tag: 'tap the tag',
  wheel_done: 'done',
  wheel_hint: 'tap to go deeper. center goes up. any level is a valid stop',
  wheel_mem: 'picked before',
  wheel_edit: 'edit',
  wheel_rename: 'rename',
  wheel_add: 'add',
  wheel_hide_q: 'hide?',
  wheel_edit_hint: 'the list below: rename, hide or add your own',
  wheel_edit_root: 'open a category to add your own',
  wheel_edit_added: 'added',
  wheel_edit_renamed: 'renamed',
  wheel_edit_hidden: 'hidden',
  wheel_edits_reset: 'reset wheel edits',

  wheel_mode_drill: 'levels',
  wheel_mode_map: 'map',
  wheel_mode_canvas: 'canvas',
  wheel_mode_list: 'list',
  wheel_map_hint: 'tap to pick. a category is an answer too',
  wheel_map_edit_hint: 'tap a module to rename, hide or add inside',
  wheel_add_inside: 'inside',
  wheel_zoom_out: 'zoom out',
  wheel_zoom_in: 'zoom in',
  wheel_prev: 'last time about this coffee',
  wheel_empty: 'nothing yet',

  log_title: 'log',
  log_all: 'all',
  log_compare: 'compare',
  log_pick2: 'pick two brews',
  log_diff: 'differences highlighted',
  log_pending: 'rating due',
  log_param: 'parameter',
  log_note: 'note',
  log_desc: 'descriptors',
  log_stages: 'stages',
  log_repeat: 'repeat',
  log_edit: 'edit',
  log_rerate: 're-rate — scales & wheel',

  set_title: 'settings',
  set_grinders: 'my grinders',
  set_devices: 'my brewers',
  set_export: 'export base to file',
  set_storage: 'data storage',
  set_storage_checking: 'checking storage protection',
  set_storage_protected: 'protected from automatic eviction · clearing site data deletes the journal',
  set_storage_best_effort: 'not protected · tap to request protection · keep an export',
  set_storage_unavailable: 'browser does not report storage protection · keep an export',
  set_import: 'import',
  set_lang: 'language',
  set_theme: 'theme',
  theme_dark: 'dark',
  theme_light: 'light',
  theme_system: 'auto',
  set_spec: 'spec',
  set_export_done: 'base written to brew-journal-export.zip',
  set_offline: 'local · offline · no account',

  note_label: 'note',
  note_mic: 'voice',
  note_mic_hint: 'recognized descriptors will be offered as tags',
  note_ph: 'what you noticed…',

  spec_title: 'spec',
  spec_palette: 'palette',
  spec_type: 'type',
  spec_comp: 'components',
  spec_grid: 'grid',

  entry_cup: 'cup',
  entry_cup_sub: 'tasting · no recipe',
  entry_grind: 'grind',
  entry_mark: 's',
  entry_none: '—',
  deg: '°',

  a11y_less: 'less',
  a11y_more: 'more',
  a11y_remove: 'remove',

  conv_db: 'grinders',
  conv_search: 'EK43, Comandante, Ode…',
  conv_recent: 'recent',
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
  unit_division_one: 'division',
  unit_division_few: 'divisions',
  um: 'µm',

  log_time: 'time',
  log_mode: 'mode',
  log_bean: 'coffee',
  log_device: 'brewer',
  temp_short: 't°',

  log_f_perc: 'perc',
  log_f_imm: 'imm',
  log_f_hybrid: 'hybrid',
  log_f_drip: 'drip',
  log_f_cup: 'cups',

  cmp_a: 'a',
  cmp_b: 'b',

  diag_taste: 'tasting',
  diag_taste_sub: 'what is in the cup — by feel',
  diag_wheel_sub: 'flavor wheel',
  taste_name: 'what coffee',
  taste_name_ph: 'café, coffee — as you will recall it',

  brew_hy_imm: 'immersion',
  brew_hy_perc: 'perc',
  brew_hy_mid: 'mid',
  brew_conv: 'converter',
  brew_no_device: 'no brewer picked · counted as percolation',
  brew_add_bean: '+ coffee',
  brew_add_device: '+ brewer',
  unit_sec: 's',

  t_draining: 'letting it drain',
  t_next_line: 'next',
  t_last_stage: 'last stage',
  t_paused_num: '· · ·',

  rate_now: 'rate now',
  rate_later_btn: 'later',

  home_today: 'today',
  home_taste: 'rate a cup',

  shelf_packs: 'packs',
  shelf_ph: 'pack photo',

  bean_ph_face: 'front of bag',
  bean_ph_seam: 'seam · roast date',
  bean_ph_new: 'shoot the bag — or drop a file',
  bean_photo_hint: 'one shot is enough — the front of the bag',
  bean_count: 'bags in box',
  bean_untitled: 'untitled',

  dev_mat_ceramic: 'ceramic holds heat — preheat longer',
  dev_mat_glass: 'glass — fast preheat, fast cooling',
  dev_mat_plastic: 'plastic steals almost no heat',
  dev_mat_metal: 'metal — instant heat, watch the temp',
  dev_wall_petal: 'petals reduce paper contact — faster flow',
  dev_wall_ribs: 'ribs keep paper off the wall',
  dev_wall_spiral: 'spiral guides flow to the center',
  dev_wall_smooth: 'smooth wall — slower drawdown',
  dev_untitled: 'custom brewer',

  set_g_add: '+ grinder',
  set_g_step: 'step, µm',
  set_del_q: 'delete?',
  set_del_yes: 'yes',
  set_ver: 'v0.2',

  set_export_hint: 'entries, shelf, photos — one zip',
  set_import_hint: 'zip from export · replaces the whole base',
  set_import_done: 'base restored from file',
  set_import_bad: 'file is from another version — nothing changed',
  set_import_broken: 'file cannot be read — nothing changed',
  set_busy: 'wait…',

  qr_title: 'recipe as code',
  qr_hint: 'shoot it with another phone',

  shelf_empty: 'shelf is empty. shoot the first bag',
  bean_no_brews: 'no brews with this bag yet',
  log_not_found: 'entry not found',

  cal_open: 'calendar',
  cal_prev: 'previous month',
  cal_next: 'next month',

  cal_jan: 'january',
  cal_feb: 'february',
  cal_mar: 'march',
  cal_apr: 'april',
  cal_may: 'may',
  cal_jun: 'june',
  cal_jul: 'july',
  cal_aug: 'august',
  cal_sep: 'september',
  cal_oct: 'october',
  cal_nov: 'november',
  cal_dec: 'december',

  cal_mo: 'mo',
  cal_tu: 'tu',
  cal_we: 'we',
  cal_th: 'th',
  cal_fr: 'fr',
  cal_sa: 'sa',
  cal_su: 'su',

  hint_next: 'next tip',
  hint_done: 'close tip',
  hint_close: 'turn off tips',

  hint_home_brew: 'choose brew coffee to set up your recipe and start brewing',
  hint_home_conv: 'the grind converter: a setting on one grinder in the units of another',
  hint_home_taste: 'coffee can be rated here without a recipe',
  hint_home_pending: 'this brew is logged but not rated yet',

  hint_shelf_add: 'a new bag is added here',
  hint_add_form: 'the coffee form. it decides which fields the brew has',
  hint_add_photo: 'the bag can be photographed here. the photo is optional',
  hint_add_roast: 'roast date. the dots are inserted automatically, the calendar is next to it',
  hint_bean_brews: 'brews made with this bag',

  hint_brew_fields: 'the fields depend on the bag: some values are set by the producer',
  hint_brew_device: 'with no device the brew counts as a cone pour-over',
  hint_brew_grind: 'the converter range is a guide. you can adjust the grind setting',
  hint_brew_outputs: 'start is the staged timer. below it a brew that already happened is logged',
  hint_rate_later: 'your brew is saved. you can rate it later from the home screen',

  hint_diag_scales: 'four scales from 0 to 10. a tap on a cell sets the value',
  hint_diag_wheel: 'the flavour wheel: 102 descriptors across three levels',
  hint_diag_note: 'the note can be dictated. recognised flavours are offered as tags',
  hint_wheel_nav: 'a tap on a sector goes deeper, a tap on the centre goes up',
  hint_wheel_here: 'any level works: a category is recorded the same way',
  hint_wheel_tag: 'a tap on a tag changes its intensity, ✕ removes it',
  hint_wheel_memory: 'a dot marks a flavour from earlier entries',

  hint_conv_from: 'a catalogue of 134 grinders. search covers brands, models and shorthands',
  hint_conv_band:
    'the answer is snapped to the detents of your own grinder. the band is the uncertainty of the data',
  hint_conv_cal: 'calibration shifts the range by a setting that gave a good result',
  hint_conv_use: 'the range goes to the brew, the grind lands at its centre',

  hint_log_filters: 'filters: bags from the shelf, then brewing methods',
  hint_log_compare: 'two entries are compared here, differences are highlighted',
  hint_detail_repeat: 'the parameters of this entry go back into the brew',
  hint_detail_stages:
    'the stages are the actual ones, pauses included. a dot is a marker with no duration',
  hint_detail_qr: 'the code holds the recipe: grind, dose, water, temperature, stages',
  hint_compare_diff: 'what differs is highlighted, what matches is dimmed',

  hint_more_grinders: 'your own grinders: a name and microns per step. the converter uses them',
  hint_more_transfer: 'export is the whole database in one archive. import replaces it entirely',
  hint_devices_new: 'a device is described by traits, there is no brand catalogue',
  hint_device_presets: 'presets fill all six trait groups',
  hint_device_flow: 'flow decides which stages the timer generates',

  set_hints: 'hints',
  set_hints_hint: 'one at a time, on your first visit to a screen',
  set_hints_on: 'on',
  set_hints_off: 'off',
  set_hints_reset: 'show again',

  brew_manual_q: 'how long did the brew take?',
  brew_manual_zero: 'not timed',
  brew_manual_plan: 'planned',
  brew_manual_stages: 'stages are not recorded — only the timer can measure them',
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
  if (m === 'cup') return STR[lang].diag_taste;
  if (m === 'drip') return STR[lang].form_drip;
  return TRAITS.flow.opts[m][lang === 'ru' ? 0 : 1];
}
