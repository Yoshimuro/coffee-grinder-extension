// Brew Journal — данные и расчёты (RU/EN)
export const TODAY = '2026-08-01';

export const GRINDERS = {
  c40: { name: 'Comandante C40', unit: { ru: 'кликов', en: 'clicks' }, step: 15, zero: 280, max: 40, dp: 0 },
  s3:  { name: 'Timemore Chestnut S3', unit: { ru: 'кликов', en: 'clicks' }, step: 8.7, zero: 690, max: 36, dp: 1 },
};
export const GRINDER_DB = [
  { id: 'c40', short: 'C40', name: 'Comandante C40 MK4', step: 15, zero: 280, dp: 0 },
  { id: 'ek43', short: 'EK43', name: 'Mahlkönig EK43 ICON (coffee, dial 1-16)', step: 53, zero: 6, dp: 0 },
  { id: 'jmax', short: 'J-Max', name: '1Zpresso J-Max', step: 8.8, zero: 250, dp: 0 },
  { id: 'kultra', short: 'K-Ultra', name: '1Zpresso K-Ultra', step: 22, zero: 240, dp: 0 },
  { id: 'q2', short: 'Q2', name: '1Zpresso Q2 Heptagonal', step: 25, zero: 230, dp: 0 },
  { id: 'k6', short: 'K6', name: 'Kingrinder K6', step: 16, zero: 250, dp: 0 },
  { id: 'k4', short: 'K4', name: 'Kingrinder K4', step: 18, zero: 250, dp: 0 },
  { id: 'c2', short: 'C2', name: 'Timemore Chestnut C2', step: 37, zero: 290, dp: 0 },
  { id: 'c3pro', short: 'C3 Pro', name: 'Timemore Chestnut C3 Pro', step: 34, zero: 285, dp: 0 },
  { id: 's3db', short: 'S3', name: 'Timemore Chestnut S3', step: 8.7, zero: 690, dp: 1 },
  { id: 'sculptor', short: '078S', name: 'Timemore Sculptor 078S', step: 14, zero: 120, dp: 0 },
  { id: 'ode2', short: 'Ode 2', name: 'Fellow Ode Gen 2', step: 28, zero: 280, dp: 0 },
  { id: 'opus', short: 'Opus', name: 'Fellow Opus', step: 26, zero: 260, dp: 0 },
  { id: 'encore', short: 'Encore', name: 'Baratza Encore', step: 22, zero: 250, dp: 0 },
  { id: 'virtuoso', short: 'Virtuoso+', name: 'Baratza Virtuoso+', step: 21, zero: 240, dp: 0 },
  { id: 'df64', short: 'DF64', name: 'DF64 Gen 2', step: 9, zero: 200, dp: 0 },
  { id: 'niche', short: 'Niche', name: 'Niche Zero', step: 12, zero: 180, dp: 0 },
  { id: 'uniform', short: 'Uniform', name: 'Wilfa Uniform', step: 32, zero: 250, dp: 0 },
  { id: 'minislim', short: 'Mini Slim', name: 'Hario Mini Slim Plus', step: 80, zero: 300, dp: 0 },
  { id: 'skerton', short: 'Skerton', name: 'Hario Skerton Pro', step: 75, zero: 290, dp: 0 },
  { id: 'key', short: 'Key', name: 'Weber Key Mk2', step: 10, zero: 190, dp: 0 },
  { id: 'p64', short: 'P64', name: 'Lagom P64', step: 11, zero: 170, dp: 0 },
  { id: 'x54', short: 'X54', name: 'Mahlkönig X54', step: 30, zero: 230, dp: 0 },
  { id: 'sette', short: 'Sette 270', name: 'Baratza Sette 270', step: 15, zero: 220, dp: 0 },
];
const UNCERT = 12; // µm — пересчёт между жерновами приблизителен
export const toUm = (g, v) => GRINDERS[g].zero + GRINDERS[g].step * v;
export const fromUm = (g, um) => (um - GRINDERS[g].zero) / GRINDERS[g].step;
export function convert(from, to, val, calib = 0) {
  const um = toUm(from, val);
  const c = fromUm(to, um) + calib;
  const r = (x) => Math.max(0, Math.round(x * 10) / 10);
  return { um: Math.round(um), center: r(c), lo: r(fromUm(to, um - UNCERT) + calib), hi: r(fromUm(to, um + UNCERT) + calib) };
}

export const ageDays = (roast, today = TODAY) => Math.round((new Date(today) - new Date(roast)) / 864e5);
export const phaseOf = (d) => (d < 4 ? 'degas' : d <= 21 ? 'peak' : 'fade');
export const fmtT = (s) => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`;

// ── Колесо вкусов: словарь свой, иерархия общепринятая (9 категорий), геометрия и палитра свои.
// Дескриптор = [id, ru, en]; RU — адаптация под узнаваемые референсы, не подстрочник.
export const WHEEL = [
  { id: 'fruit', ru: 'Фруктовое', en: 'Fruity', h: 20, c: 0.16, sub: [
    { id: 'berry', ru: 'Ягоды', en: 'Berries', d: [['strawberry','Клубника','Strawberry'],['raspberry','Малина','Raspberry'],['blueberry','Черника','Blueberry'],['blackberry','Ежевика','Blackberry'],['cranberry','Клюква','Cranberry'],['gooseberry','Крыжовник','Gooseberry'],['blackcurrant','Чёрная смородина','Blackcurrant']] },
    { id: 'citrus', ru: 'Цитрус', en: 'Citrus', d: [['lemon','Лимон','Lemon'],['lime','Лайм','Lime'],['orange','Апельсин','Orange'],['grapefruit','Грейпфрут','Grapefruit'],['bergamot','Бергамот','Bergamot']] },
    { id: 'stone', ru: 'Косточковые', en: 'Stone fruit', d: [['peach','Персик','Peach'],['apricot','Абрикос','Apricot'],['scherry','Вишня','Sour cherry'],['cherry','Черешня','Sweet cherry'],['plum','Слива','Plum']] },
    { id: 'tropic', ru: 'Тропики', en: 'Tropical', d: [['pineapple','Ананас','Pineapple'],['mango','Манго','Mango'],['passion','Маракуйя','Passion fruit'],['lychee','Личи','Lychee'],['banana','Банан','Banana']] },
    { id: 'orchard', ru: 'Сад', en: 'Orchard', d: [['apple','Яблоко','Apple'],['pear','Груша','Pear'],['grape','Виноград','Grape'],['quince','Айва','Quince']] },
    { id: 'dried', ru: 'Сухофрукты', en: 'Dried fruit', d: [['raisin','Изюм','Raisin'],['prune','Чернослив','Prune'],['dapricot','Курага','Dried apricot'],['date','Финик','Date'],['fig','Инжир','Fig']] },
  ]},
  { id: 'floral', ru: 'Цветочное', en: 'Floral', h: 330, c: 0.14, sub: [
    { id: 'white', ru: 'Белые цветы', en: 'White flowers', d: [['jasmine','Жасмин','Jasmine'],['blossom','Цвет яблони','Apple blossom'],['lily','Ландыш','Lily of the valley']] },
    { id: 'tea', ru: 'Чайное', en: 'Tea-like', d: [['blacktea','Чёрный чай','Black tea'],['greentea','Зелёный чай','Green tea'],['chamomile','Ромашка','Chamomile'],['linden','Липовый цвет','Linden blossom']] },
    { id: 'sweetfl', ru: 'Сладкие цветы', en: 'Sweet flowers', d: [['rose','Роза','Rose'],['lavender','Лаванда','Lavender'],['lilac','Сирень','Lilac']] },
  ]},
  { id: 'sweet', ru: 'Сладкое', en: 'Sweet', h: 85, c: 0.13, sub: [
    { id: 'caramel', ru: 'Карамельное', en: 'Caramelized', d: [['caramel','Карамель','Caramel'],['toffee','Ирис','Toffee'],['brulee','Крем-брюле','Crème brûlée'],['molasses','Патока','Molasses']] },
    { id: 'honey', ru: 'Мёд и сиропы', en: 'Honey & syrup', d: [['honey','Мёд','Honey'],['maple','Кленовый сироп','Maple syrup'],['bakedmilk','Топлёное молоко','Baked milk']] },
    { id: 'vanilla', ru: 'Ваниль и выпечка', en: 'Vanilla & pastry', d: [['vanilla','Ваниль','Vanilla'],['pastry','Сдоба','Sweet pastry'],['meringue','Безе','Meringue']] },
  ]},
  { id: 'nutty', ru: 'Орехи и какао', en: 'Nutty & cocoa', h: 55, c: 0.09, sub: [
    { id: 'nuts', ru: 'Орехи', en: 'Nuts', d: [['hazelnut','Фундук','Hazelnut'],['almond','Миндаль','Almond'],['peanut','Арахис','Peanut'],['walnut','Грецкий орех','Walnut'],['cashew','Кешью','Cashew']] },
    { id: 'cocoa', ru: 'Какао', en: 'Cocoa', d: [['cocoad','Какао','Cocoa'],['darkchoc','Тёмный шоколад','Dark chocolate'],['milkchoc','Молочный шоколад','Milk chocolate'],['drinkchoc','Горячий шоколад','Drinking chocolate']] },
  ]},
  { id: 'spice', ru: 'Пряности', en: 'Spices', h: 45, c: 0.14, sub: [
    { id: 'warm', ru: 'Тёплые', en: 'Warm', d: [['cinnamon','Корица','Cinnamon'],['clove','Гвоздика','Clove'],['nutmeg','Мускатный орех','Nutmeg'],['cardamom','Кардамон','Cardamom']] },
    { id: 'pungent', ru: 'Острые', en: 'Pungent', d: [['pepper','Чёрный перец','Black pepper'],['ginger','Имбирь','Ginger']] },
    { id: 'anise', ru: 'Анисовые', en: 'Anise', d: [['anise','Анис','Anise'],['staranise','Бадьян','Star anise'],['coriander','Кориандр','Coriander seed']] },
  ]},
  { id: 'roast', ru: 'Обжарка', en: 'Roasted', h: 30, c: 0.05, sub: [
    { id: 'bread', ru: 'Хлебное', en: 'Grain & bread', d: [['crust','Хлебная корка','Bread crust'],['malt','Солод','Malt'],['rye','Ржаной хлеб','Rye bread']] },
    { id: 'smoke', ru: 'Дымное', en: 'Smoky', d: [['smoke','Дым','Smoke'],['ash','Зола','Ash'],['tobacco','Табак','Tobacco'],['burnt','Жжёный сахар','Burnt sugar']] },
  ]},
  { id: 'green', ru: 'Зелёное', en: 'Green', h: 150, c: 0.12, sub: [
    { id: 'grass', ru: 'Травяное', en: 'Grassy', d: [['grass','Свежая трава','Fresh grass'],['hay','Сено','Hay'],['stem','Стебель','Stem']] },
    { id: 'veg', ru: 'Овощное', en: 'Vegetal', d: [['pea','Зелёный горошек','Green pea'],['cucumber','Огурец','Cucumber'],['olive','Оливковое масло','Olive oil'],['bellpepper','Болгарский перец','Bell pepper']] },
  ]},
  { id: 'ferment', ru: 'Ферментация', en: 'Fermented', h: 310, c: 0.12, sub: [
    { id: 'wine', ru: 'Винное', en: 'Winey', d: [['whitewine','Белое вино','White wine'],['redwine','Красное вино','Red wine'],['whisky','Виски','Whisky']] },
    { id: 'ferm', ru: 'Ферментное', en: 'Fermented', d: [['kvass','Квас','Kvass'],['kefir','Кефир','Kefir'],['overripe','Перезрелый фрукт','Overripe fruit']] },
    { id: 'acids', ru: 'Кислоты', en: 'Acids', d: [['citric','Лимонная кислота','Citric acid'],['cider','Яблочный уксус','Cider vinegar'],['lactic','Молочная кислота','Lactic acid']] },
  ]},
  { id: 'other', ru: 'Прочее', en: 'Other', h: 250, c: 0.04, sub: [
    { id: 'paper', ru: 'Бумажное', en: 'Papery', d: [['paper','Бумага','Paper'],['cardboard','Картон','Cardboard'],['dust','Пыль','Dust']] },
    { id: 'chem', ru: 'Химическое', en: 'Chemical', d: [['rubber','Резина','Rubber'],['medicinal','Аптечное','Medicinal'],['petrol','Бензин','Petrol']] },
    { id: 'earth', ru: 'Земляное', en: 'Earthy', d: [['earth','Земля','Earth'],['musty','Затхлое','Musty'],['mushroom','Гриб','Mushroom'],['mineral','Минеральное','Mineral']] },
  ]},
];
export const DESC = {}; // id → {ru,en,cat,sub,h,c}
WHEEL.forEach((cat) => cat.sub.forEach((s) => s.d.forEach(([id, ru, en]) => { DESC[id] = { ru, en, cat: cat.id, sub: s.id, h: cat.h, c: cat.c }; })));
export const catColor = (cat, l = 0.7, cMul = 1, a = 1) => `oklch(${l} ${(cat.c * cMul).toFixed(3)} ${cat.h}${a < 1 ? ' / ' + a : ''})`;

// ── Девайсы: конструктор по признакам
export const TRAITS = {
  flow:     { ru: 'Поток', en: 'Flow', opts: { perc: ['Пролив', 'Percolation'], imm: ['Иммерсия', 'Immersion'], hybrid: ['Гибрид · клапан', 'Hybrid · valve'] } },
  bottom:   { ru: 'Дно', en: 'Bottom', opts: { cone: ['Конус', 'Cone'], flat: ['Плоское', 'Flat'], basket: ['Корзина', 'Basket'], cyl: ['Цилиндр', 'Cylinder'] } },
  wall:     { ru: 'Стенка', en: 'Wall', opts: { ribs: ['Прямые рёбра', 'Straight ribs'], spiral: ['Спираль', 'Spiral'], petal: ['Лепестки', 'Petals'], smooth: ['Гладкая', 'Smooth'] } },
  filter:   { ru: 'Фильтр', en: 'Filter', opts: { pcone: ['Бумага · конус', 'Paper cone'], wave: ['Волновой', 'Wave'], pflat: ['Бумага · диск', 'Paper disc'], metal: ['Металл', 'Metal'], cloth: ['Ткань', 'Cloth'], built: ['Встроенный', 'Built-in'] } },
  material: { ru: 'Материал', en: 'Material', opts: { ceramic: ['Керамика', 'Ceramic'], glass: ['Стекло', 'Glass'], plastic: ['Пластик', 'Plastic'], metal: ['Металл', 'Metal'] } },
  vol:      { ru: 'Объём', en: 'Volume', opts: { s: ['01 · до 300 мл', '01 · to 300 ml'], m: ['02 · до 500 мл', '02 · to 500 ml'], l: ['03 · до 700 мл', '03 · to 700 ml'] } },
};
export const KNOWN_DEVICES = ([
  { id: 'v60', name: 'Hario V60-02', flow: 'perc', bottom: 'cone', wall: 'spiral', filter: 'pcone', material: 'plastic', vol: 'm' },
  { id: 'switch', name: 'Hario Switch', flow: 'hybrid', bottom: 'cone', wall: 'spiral', filter: 'pcone', material: 'glass', vol: 'm' },
  { id: 'aero', name: 'AeroPress', flow: 'imm', bottom: 'cyl', wall: 'smooth', filter: 'pflat', material: 'plastic', vol: 's' },
]);
export const seedDevices = () => [];

// ── Полка: три формы кофе. Форма определяет поля заваривания.
export const seedShelf = () => ([
  { id: 'java', form: 'beans', name: 'Ява Золотая', roaster: 'Сварщица Екатерина', roast: '2026-07-27', weight: 250, left: 187, photos: 2 },
  { id: 'drip1', form: 'drip', name: 'Дрип · Колумбия Уила', roaster: 'Сварщица Екатерина', roast: '2026-07-10', count: 5, leftCount: 3, dose: 12, photos: 1 },
  { id: 'kenya', form: 'ground', name: 'Кения Ньери · молотый', roaster: 'привезли из отпуска', roast: '2026-07-18', weight: 100, left: 64, photos: 1 },
]);

// ── Журнал
export const seedJournal = () => ([
  { id: 'j1', date: '2026-08-01', time: '09:12', bean: 'java', device: null, devName: 'V60', mode: 'perc', grind: 4.4, dose: 15, water: 250, temp: 94, total: 168,
    stages: [['bloom', 45, 50], ['pour', 40, 100], ['pour', 38, 100], ['drain', 45, 0]], status: 'pending' },
  { id: 'j2', date: '2026-07-31', time: '08:47', bean: 'java', device: null, devName: 'Switch', mode: 'hybrid', grind: 4.8, dose: 15, water: 240, temp: 92, total: 190, valveAt: 80,
    stages: [['steep', 80, 240], ['valve', 0, 0], ['drain', 110, 0]], status: 'done',
    diag: { acid: 5, bitter: 4, body: 6, balance: 6 }, desc: [['cocoad', 2], ['hazelnut', 2]], note: 'ровнее, чем пролив, но скучнее' },
  { id: 'j3', date: '2026-07-30', time: '09:05', bean: 'java', device: null, devName: 'V60', mode: 'perc', grind: 4.6, dose: 15, water: 250, temp: 94, total: 170,
    stages: [['bloom', 45, 50], ['pour', 40, 100], ['pour', 40, 100], ['drain', 45, 0]], status: 'done',
    diag: { acid: 6, bitter: 3, body: 5, balance: 7 }, desc: [['blueberry', 2], ['blackcurrant', 1], ['honey', 2]], note: 'слаще на остывании, держать 94°' },
  { id: 'j4', date: '2026-07-29', time: '08:58', bean: 'java', device: null, devName: 'V60', mode: 'perc', grind: 5.0, dose: 15, water: 250, temp: 92, total: 155,
    stages: [['bloom', 45, 50], ['pour', 35, 100], ['pour', 35, 100], ['drain', 40, 0]], status: 'done',
    diag: { acid: 3, bitter: 6, body: 4, balance: 4 }, desc: [['walnut', 1], ['cocoad', 2]], note: 'плоско. крупновато' },
  { id: 'j5', date: '2026-07-28', time: '16:20', bean: 'drip1', device: null, mode: 'drip', dose: 12, water: 180, temp: 90, total: 150, pours: 3, status: 'done',
    diag: { acid: 5, bitter: 4, body: 4, balance: 6 }, desc: [['caramel', 2]], note: 'в поезде. лучше, чем ожидал' },
  { id: 'j6', date: '2026-07-26', time: '10:30', bean: 'kenya', device: null, devName: 'AeroPress', mode: 'imm', grind: null, dose: 14, water: 210, temp: 88, total: 120, stirAt: 30,
    stages: [['steep', 90, 210], ['stir', 0, 0], ['press', 30, 0]], status: 'done',
    diag: { acid: 7, bitter: 3, body: 4, balance: 5 }, desc: [['grapefruit', 2], ['blackcurrant', 2]], note: 'ярко. можно чуть мельче' },
]);

// ── Диагностика → подсказка (плоские глаголы, без энтузиазма)
export function advice(d, lang) {
  const L = lang === 'ru';
  const out = [];
  if (d.acid >= 7 && d.bitter <= 4) out.push(L ? 'мельче на 0.5 · или горячее на 2°' : 'grind 0.5 finer · or 2° hotter');
  if (d.bitter >= 7 && d.acid <= 4) out.push(L ? 'крупнее на 0.5 · или холоднее на 2°' : 'grind 0.5 coarser · or 2° cooler');
  if (d.body <= 3) out.push(L ? 'дольше контакт · или мельче на 0.3' : 'longer contact · or 0.3 finer');
  if (d.body >= 8 && d.balance <= 5) out.push(L ? 'меньше доза · или крупнее на 0.3' : 'lower dose · or 0.3 coarser');
  if (!out.length && d.balance >= 7) out.push(L ? 'повторить без изменений' : 'repeat as is');
  if (!out.length) out.push(L ? 'менять один параметр за раз' : 'change one variable at a time');
  return out;
}

// ── Строки интерфейса
export const STR = {
  ru: {
    appName: 'brew journal', nav_home: 'ГЛАВНЫЙ', nav_shelf: 'ПОЛКА', nav_log: 'ЖУРНАЛ', nav_more: 'ЕЩЁ', back: 'НАЗАД',
    home_brew: 'ЗАВАРИТЬ', home_convert: 'КОНВЕРТЕР', home_last: 'ПРОШЛЫЙ РАЗ', home_shelf: 'НА ПОЛКЕ', home_pending: 'ОЦЕНКА ЖДЁТ', home_pending_sub: 'кофе остыл — можно оценивать', home_rate: 'ОЦЕНИТЬ', home_empty: 'Журнал пуст. Заварить первую чашку', days: 'дн', grams: 'г', pcs: 'шт',
    phase_degas: 'дегазация', phase_peak: 'пик', phase_fade: 'спад',
    conv_title: 'КОНВЕРТЕР ПОМОЛА', conv_from: 'ОТКУДА', conv_to: 'КУДА', conv_range: 'ДИАПАЗОН', conv_center: 'центр', conv_resolves: 'разрешение', conv_permark: 'мкм/шаг', conv_calibrate: 'ОТКАЛИБРОВАТЬ', conv_calibrated: 'калибровано', conv_from_log: 'из журнала', conv_cal_q: 'Какая настройка реально дала хороший результат?', conv_cal_hint: 'сдвиг применится ко всем будущим пересчётам', conv_cal_apply: 'ПРИМЕНИТЬ', conv_cal_reset: 'СБРОС', conv_use: 'ВЗЯТЬ В ЗАВАРИВАНИЕ',
    shelf_title: 'ПОЛКА', shelf_add: 'ДОБАВИТЬ ПАЧКУ', shelf_add_photo: 'СНЯТЬ ПАЧКУ', shelf_add_manual: 'ВПИСАТЬ РУКАМИ', shelf_left: 'остаток', shelf_age: 'возраст', bean_photos: 'ФОТО ПАЧКИ', bean_photos_hint: 'первый снимок — лицо пачки. порядок задаёшь сам', bean_roast: 'ДАТА ОБЖАРКИ', bean_weight: 'ВЕС', bean_name: 'НАЗВАНИЕ', bean_optional: 'необязательно', bean_form: 'ФОРМА', form_beans: 'ЗЕРНО', form_ground: 'МОЛОТЫЙ', form_drip: 'ДРИП-ПАКЕТ', bean_brews: 'ЗАВАРИВАНИЯ', bean_add_photo: 'ЕЩЁ ФОТО', bean_dose_fixed: 'доза задана производителем', bean_save: 'СОХРАНИТЬ',
    dev_title: 'ДЕВАЙСЫ', dev_new: 'НОВЫЙ ДЕВАЙС', dev_edit: 'КОНСТРУКТОР', dev_name: 'ИМЯ', dev_hint: 'чертёж перестраивается из признаков', dev_save: 'СОХРАНИТЬ',
    brew_title: 'ЗАВАРИВАНИЕ', brew_bean: 'КОФЕ', brew_device: 'ТИП ЗАВАРИВАНИЯ', brew_grind: 'ПОМОЛ', brew_dose: 'ВЕС', brew_water: 'ВОДА', brew_temp: 'ТЕМПЕРАТУРА', brew_ratio: 'соотношение', brew_start: 'СТАРТ', brew_suggest: 'старт из конвертера', brew_pours: 'ПРОЛИВЫ', brew_no_grind: 'помол задан производителем', brew_drip_note: 'пакет = упаковка и воронка. девайс не выбирается', brew_valve: 'КЛАПАН', brew_valve_hint: 'момент открытия — переменная рецепта',
    t_bloom: 'СМАЧИВАНИЕ', t_pour: 'ПРОЛИВ', t_drain: 'ДРЕНАЖ', t_steep: 'НАСТАИВАНИЕ', t_stir: 'РАЗМЕШАТЬ', t_press: 'ПРОДАВИТЬ', t_pause: 'ПАУЗА', brew_manual: 'ЗАПИСАТЬ БЕЗ ТАЙМЕРА', brew_manual_hint: 'рецепт уже пролит — вписать как есть', t_valve: 'ОТКРЫТЬ КЛАПАН', t_next: 'ДАЛЬШЕ', t_done: 'ГОТОВО', t_finish: 'ЗАВЕРШИТЬ', t_awake: 'экран не гаснет', t_target: 'цель', t_water_total: 'воды всего', t_of: 'из',
    rate_later_t: 'ОЦЕНКА ПОЗЖЕ', rate_later_s: 'кофе раскрывается, когда остывает. заваривание сохранено — вернись к нему с домашнего экрана', rate_ok: 'ПОНЯТНО',
    diag_title: 'ДИАГНОСТИКА', diag_sub: 'что подкрутить в следующий раз', diag_acid: 'КИСЛОТНОСТЬ', diag_bitter: 'ГОРЕЧЬ', diag_body: 'ТЕЛО', diag_balance: 'СЛАДОСТЬ', diag_advice: 'НА СЛЕДУЮЩИЙ РАЗ', diag_save: 'СОХРАНИТЬ', diag_to_wheel: 'НА ЧТО ПОХОЖЕ → КОЛЕСО', diag_skip: 'без дескрипторов',
    wheel_title: 'КОЛЕСО ВКУСОВ', wheel_root: 'ВСЁ', wheel_up: 'ВВЕРХ', wheel_picked: 'ВЫБРАНО', wheel_intensity: 'интенсивность', wheel_done: 'ГОТОВО', wheel_hint: 'тап — внутрь. центр — наверх. остановиться можно на любом уровне', wheel_mem: 'уже выбирал', wheel_prev: 'В ПРОШЛЫЙ РАЗ ОБ ЭТОМ ЗЕРНЕ', wheel_empty: 'пока ничего',
    log_title: 'ЖУРНАЛ', log_all: 'ВСЁ', log_compare: 'СРАВНИТЬ', log_pick2: 'выбери два заваривания', log_diff: 'подсвечены отличия', log_pending: 'ждёт оценки', log_param: 'ПАРАМЕТР', log_note: 'ЗАМЕТКА', log_desc: 'ДЕСКРИПТОРЫ', log_stages: 'СТАДИИ', log_repeat: 'ПОВТОРИТЬ',
    set_title: 'НАСТРОЙКИ', set_grinders: 'МОИ КОФЕМОЛКИ', set_devices: 'МОИ ДЕВАЙСЫ', set_export: 'ЭКСПОРТ БАЗЫ В ФАЙЛ', set_import: 'ИМПОРТ', set_lang: 'ЯЗЫК', set_spec: 'СПЕЦИФИКАЦИЯ', set_qr: 'QR РЕЦЕПТА', set_export_done: 'база записана в файл brew-journal.json', set_offline: 'локально · офлайн · без аккаунта',
    note_label: 'ЗАМЕТКА', note_mic: 'ГОЛОСОМ', note_mic_hint: 'распознанные дескрипторы предложатся тегами', note_ph: 'что заметил…',
    spec_title: 'СПЕЦИФИКАЦИЯ', spec_palette: 'ПАЛИТРА', spec_type: 'ТИПОГРАФИКА', spec_comp: 'КОМПОНЕНТЫ', spec_grid: 'СЕТКА',
  },
  en: {
    appName: 'brew journal', nav_home: 'HOME', nav_shelf: 'SHELF', nav_log: 'LOG', nav_more: 'MORE', back: 'BACK',
    home_brew: 'LOG BREW', home_convert: 'CONVERTER', home_last: 'LAST BREW', home_shelf: 'ON SHELF', home_pending: 'RATING DUE', home_pending_sub: 'coffee has cooled — rate it now', home_rate: 'RATE', home_empty: 'Log is empty. Brew the first cup', days: 'd', grams: 'g', pcs: 'pcs',
    phase_degas: 'degassing', phase_peak: 'peak', phase_fade: 'fading',
    conv_title: 'GRIND CONVERTER', conv_from: 'FROM', conv_to: 'TO', conv_range: 'RANGE', conv_center: 'center', conv_resolves: 'resolves', conv_permark: 'µm/step', conv_calibrate: 'CALIBRATE', conv_calibrated: 'calibrated', conv_from_log: 'from log', conv_cal_q: 'Which setting actually brewed well?', conv_cal_hint: 'offset applies to all future conversions', conv_cal_apply: 'APPLY', conv_cal_reset: 'RESET', conv_use: 'USE IN BREW',
    shelf_title: 'SHELF', shelf_add: 'ADD BAG', shelf_add_photo: 'SHOOT THE BAG', shelf_add_manual: 'TYPE IT IN', shelf_left: 'left', shelf_age: 'age', bean_photos: 'BAG PHOTOS', bean_photos_hint: 'first shot is the face. you set the order', bean_roast: 'ROAST DATE', bean_weight: 'WEIGHT', bean_name: 'NAME', bean_optional: 'optional', bean_form: 'FORM', form_beans: 'BEANS', form_ground: 'GROUND', form_drip: 'DRIP BAG', bean_brews: 'BREWS', bean_add_photo: 'ADD PHOTO', bean_dose_fixed: 'dose set by the producer', bean_save: 'SAVE',
    dev_title: 'BREWERS', dev_new: 'NEW BREWER', dev_edit: 'CONSTRUCTOR', dev_name: 'NAME', dev_hint: 'the drawing rebuilds from traits', dev_save: 'SAVE',
    brew_title: 'BREW', brew_bean: 'COFFEE', brew_device: 'BREW TYPE', brew_grind: 'GRIND', brew_dose: 'WEIGHT', brew_water: 'WATER', brew_temp: 'TEMPERATURE', brew_ratio: 'ratio', brew_start: 'START', brew_suggest: 'start from converter', brew_pours: 'POURS', brew_no_grind: 'grind set by the producer', brew_drip_note: 'the bag is both pack and dripper. no device to pick', brew_valve: 'VALVE', brew_valve_hint: 'open moment is a recipe variable',
    t_bloom: 'BLOOM', t_pour: 'POUR', t_drain: 'DRAWDOWN', t_steep: 'STEEP', t_stir: 'STIR', t_press: 'PRESS', t_pause: 'PAUSE', brew_manual: 'LOG WITHOUT TIMER', brew_manual_hint: 'already brewed — log it as is', t_valve: 'OPEN VALVE', t_next: 'NEXT', t_done: 'DONE', t_finish: 'FINISH', t_awake: 'screen stays on', t_target: 'target', t_water_total: 'water total', t_of: 'of',
    rate_later_t: 'RATE LATER', rate_later_s: 'coffee opens up as it cools. the brew is saved — come back from the home screen', rate_ok: 'OK',
    diag_title: 'DIAGNOSTICS', diag_sub: 'what to adjust next time', diag_acid: 'ACIDITY', diag_bitter: 'BITTERNESS', diag_body: 'BODY', diag_balance: 'SWEETNESS', diag_advice: 'NEXT TIME', diag_save: 'SAVE', diag_to_wheel: 'WHAT IT TASTES LIKE → WHEEL', diag_skip: 'no descriptors',
    wheel_title: 'FLAVOR WHEEL', wheel_root: 'ALL', wheel_up: 'UP', wheel_picked: 'PICKED', wheel_intensity: 'intensity', wheel_done: 'DONE', wheel_hint: 'tap to go deeper. center goes up. any level is a valid stop', wheel_mem: 'picked before', wheel_prev: 'LAST TIME ABOUT THIS COFFEE', wheel_empty: 'nothing yet',
    log_title: 'LOG', log_all: 'ALL', log_compare: 'COMPARE', log_pick2: 'pick two brews', log_diff: 'differences highlighted', log_pending: 'rating due', log_param: 'PARAMETER', log_note: 'NOTE', log_desc: 'DESCRIPTORS', log_stages: 'STAGES', log_repeat: 'REPEAT',
    set_title: 'SETTINGS', set_grinders: 'MY GRINDERS', set_devices: 'MY BREWERS', set_export: 'EXPORT BASE TO FILE', set_import: 'IMPORT', set_lang: 'LANGUAGE', set_spec: 'SPEC', set_qr: 'RECIPE QR', set_export_done: 'base written to brew-journal.json', set_offline: 'local · offline · no account',
    note_label: 'NOTE', note_mic: 'VOICE', note_mic_hint: 'recognized descriptors will be offered as tags', note_ph: 'what you noticed…',
    spec_title: 'SPEC', spec_palette: 'PALETTE', spec_type: 'TYPE', spec_comp: 'COMPONENTS', spec_grid: 'GRID',
  },
};
export const stageName = (k, lang) => STR[lang]['t_' + k] || k;
export const modeName = (m, lang) => m === 'cup' ? (lang === 'ru' ? 'Дегустация' : 'Tasting') : m === 'drip' ? STR[lang].form_drip : TRAITS.flow.opts[m] ? TRAITS.flow.opts[m][lang === 'ru' ? 0 : 1] : m;
