/**
 * Колесо вкусов — порт `WHEEL`/`DESC`/`catColor` из `data.js` (§2-3 отчёта).
 *
 * Иерархия: категория → подкатегория → дескриптор. Дескриптор — позиционный
 * кортеж `[id, ru, en]`, ровно как в прототипе.
 *
 * **Контракт (BJ-3/contracts.md).** Множество id — append-only: исторические
 * записи журнала хранят `desc: [[descriptorId, intensity], …]` голыми строками,
 * поэтому переименование или переиспользование id задним числом ломает уже
 * сохранённые записи. Опечатки прототипа (`scherry`, `dapricot`, `cocoad`)
 * перенесены байт-в-байт намеренно.
 *
 * Цвет живёт только на категории (`h`, `c`); подкатегории и дескрипторы его
 * наследуют — глубина различается лишь светлотой (component-report §8.1).
 *
 * Пользовательские правки колеса накладываются поверх этой базы отдельным
 * слоем — см. `wheel-edits.ts` и {@link WheelSet}.
 */

/** Лист колеса: `[id, ru, en]`. Порядок позиционный — ru перед en. */
export type DescriptorTuple = readonly [id: string, ru: string, en: string];

export interface WheelSub {
  readonly id: string;
  readonly ru: string;
  readonly en: string;
  readonly d: readonly DescriptorTuple[];
}

export interface WheelCategory {
  readonly id: string;
  readonly ru: string;
  readonly en: string;
  /** Тон oklch, 0–360. */
  readonly h: number;
  /** Цветность oklch, 0.04–0.16. Одна на всю категорию. */
  readonly c: number;
  readonly sub: readonly WheelSub[];
}

/* `as const` держит литеральные типы id — из них ниже выводятся union'ы, а
   `satisfies` проверяет форму, не расширяя её. */
export const WHEEL = [
  {
    id: 'fruit',
    ru: 'фруктовое',
    en: 'fruity',
    h: 20,
    c: 0.16,
    sub: [
      {
        id: 'berry',
        ru: 'ягоды',
        en: 'berries',
        d: [
          ['strawberry', 'клубника', 'strawberry'],
          ['raspberry', 'малина', 'raspberry'],
          ['blueberry', 'черника', 'blueberry'],
          ['blackberry', 'ежевика', 'blackberry'],
          ['cranberry', 'клюква', 'cranberry'],
          ['gooseberry', 'крыжовник', 'gooseberry'],
          ['blackcurrant', 'чёрная смородина', 'blackcurrant'],
        ],
      },
      {
        id: 'citrus',
        ru: 'цитрус',
        en: 'citrus',
        d: [
          ['lemon', 'лимон', 'lemon'],
          ['lime', 'лайм', 'lime'],
          ['orange', 'апельсин', 'orange'],
          ['grapefruit', 'грейпфрут', 'grapefruit'],
          ['bergamot', 'бергамот', 'bergamot'],
        ],
      },
      {
        id: 'stone',
        ru: 'косточковые',
        en: 'stone fruit',
        d: [
          ['peach', 'персик', 'peach'],
          ['apricot', 'абрикос', 'apricot'],
          ['scherry', 'вишня', 'sour cherry'],
          ['cherry', 'черешня', 'sweet cherry'],
          ['plum', 'слива', 'plum'],
        ],
      },
      {
        id: 'tropic',
        ru: 'тропики',
        en: 'tropical',
        d: [
          ['pineapple', 'ананас', 'pineapple'],
          ['mango', 'манго', 'mango'],
          ['passion', 'маракуйя', 'passion fruit'],
          ['lychee', 'личи', 'lychee'],
          ['banana', 'банан', 'banana'],
        ],
      },
      {
        id: 'orchard',
        ru: 'сад',
        en: 'orchard',
        d: [
          ['apple', 'яблоко', 'apple'],
          ['pear', 'груша', 'pear'],
          ['grape', 'виноград', 'grape'],
          ['quince', 'айва', 'quince'],
        ],
      },
      {
        id: 'dried',
        ru: 'сухофрукты',
        en: 'dried fruit',
        d: [
          ['raisin', 'изюм', 'raisin'],
          ['prune', 'чернослив', 'prune'],
          ['dapricot', 'курага', 'dried apricot'],
          ['date', 'финик', 'date'],
          ['fig', 'инжир', 'fig'],
        ],
      },
    ],
  },
  {
    id: 'floral',
    ru: 'цветочное',
    en: 'floral',
    h: 330,
    c: 0.14,
    sub: [
      {
        id: 'white',
        ru: 'белые цветы',
        en: 'white flowers',
        d: [
          ['jasmine', 'жасмин', 'jasmine'],
          ['blossom', 'цвет яблони', 'apple blossom'],
          ['lily', 'ландыш', 'lily of the valley'],
        ],
      },
      {
        id: 'tea',
        ru: 'чайное',
        en: 'tea-like',
        d: [
          ['blacktea', 'чёрный чай', 'black tea'],
          ['greentea', 'зелёный чай', 'green tea'],
          ['chamomile', 'ромашка', 'chamomile'],
          ['linden', 'липовый цвет', 'linden blossom'],
        ],
      },
      {
        id: 'sweetfl',
        ru: 'сладкие цветы',
        en: 'sweet flowers',
        d: [
          ['rose', 'роза', 'rose'],
          ['lavender', 'лаванда', 'lavender'],
          ['lilac', 'сирень', 'lilac'],
        ],
      },
    ],
  },
  {
    id: 'sweet',
    ru: 'сладкое',
    en: 'sweet',
    h: 85,
    c: 0.13,
    sub: [
      {
        id: 'caramel',
        ru: 'карамельное',
        en: 'caramelized',
        d: [
          ['caramel', 'карамель', 'caramel'],
          ['toffee', 'ирис', 'toffee'],
          ['brulee', 'крем-брюле', 'crème brûlée'],
          ['molasses', 'патока', 'molasses'],
        ],
      },
      {
        id: 'honey',
        ru: 'мёд и сиропы',
        en: 'honey & syrup',
        d: [
          ['honey', 'мёд', 'honey'],
          ['maple', 'кленовый сироп', 'maple syrup'],
          ['bakedmilk', 'топлёное молоко', 'baked milk'],
        ],
      },
      {
        id: 'vanilla',
        ru: 'ваниль и выпечка',
        en: 'vanilla & pastry',
        d: [
          ['vanilla', 'ваниль', 'vanilla'],
          ['pastry', 'сдоба', 'sweet pastry'],
          ['meringue', 'безе', 'meringue'],
        ],
      },
    ],
  },
  {
    id: 'nutty',
    ru: 'орехи и какао',
    en: 'nutty & cocoa',
    h: 55,
    c: 0.09,
    sub: [
      {
        id: 'nuts',
        ru: 'орехи',
        en: 'nuts',
        d: [
          ['hazelnut', 'фундук', 'hazelnut'],
          ['almond', 'миндаль', 'almond'],
          ['peanut', 'арахис', 'peanut'],
          ['walnut', 'грецкий орех', 'walnut'],
          ['cashew', 'кешью', 'cashew'],
        ],
      },
      {
        id: 'cocoa',
        ru: 'какао',
        en: 'cocoa',
        d: [
          ['cocoad', 'какао', 'cocoa'],
          ['darkchoc', 'тёмный шоколад', 'dark chocolate'],
          ['milkchoc', 'молочный шоколад', 'milk chocolate'],
          ['drinkchoc', 'горячий шоколад', 'drinking chocolate'],
        ],
      },
    ],
  },
  {
    id: 'spice',
    ru: 'пряности',
    en: 'spices',
    h: 45,
    c: 0.14,
    sub: [
      {
        id: 'warm',
        ru: 'тёплые',
        en: 'warm',
        d: [
          ['cinnamon', 'корица', 'cinnamon'],
          ['clove', 'гвоздика', 'clove'],
          ['nutmeg', 'мускатный орех', 'nutmeg'],
          ['cardamom', 'кардамон', 'cardamom'],
        ],
      },
      {
        id: 'pungent',
        ru: 'острые',
        en: 'pungent',
        d: [
          ['pepper', 'чёрный перец', 'black pepper'],
          ['ginger', 'имбирь', 'ginger'],
        ],
      },
      {
        id: 'anise',
        ru: 'анисовые',
        en: 'anise',
        d: [
          ['anise', 'анис', 'anise'],
          ['staranise', 'бадьян', 'star anise'],
          ['coriander', 'кориандр', 'coriander seed'],
        ],
      },
    ],
  },
  {
    id: 'roast',
    ru: 'обжарка',
    en: 'roasted',
    h: 30,
    c: 0.05,
    sub: [
      {
        id: 'bread',
        ru: 'хлебное',
        en: 'grain & bread',
        d: [
          ['crust', 'хлебная корка', 'bread crust'],
          ['malt', 'солод', 'malt'],
          ['rye', 'ржаной хлеб', 'rye bread'],
        ],
      },
      {
        id: 'smoke',
        ru: 'дымное',
        en: 'smoky',
        d: [
          ['smoke', 'дым', 'smoke'],
          ['ash', 'зола', 'ash'],
          ['tobacco', 'табак', 'tobacco'],
          ['burnt', 'жжёный сахар', 'burnt sugar'],
        ],
      },
    ],
  },
  {
    id: 'green',
    ru: 'зелёное',
    en: 'green',
    h: 150,
    c: 0.12,
    sub: [
      {
        id: 'grass',
        ru: 'травяное',
        en: 'grassy',
        d: [
          ['grass', 'свежая трава', 'fresh grass'],
          ['hay', 'сено', 'hay'],
          ['stem', 'стебель', 'stem'],
        ],
      },
      {
        id: 'veg',
        ru: 'овощное',
        en: 'vegetal',
        d: [
          ['pea', 'зелёный горошек', 'green pea'],
          ['cucumber', 'огурец', 'cucumber'],
          ['olive', 'оливковое масло', 'olive oil'],
          ['bellpepper', 'болгарский перец', 'bell pepper'],
        ],
      },
    ],
  },
  {
    id: 'ferment',
    ru: 'ферментация',
    en: 'fermented',
    h: 310,
    c: 0.12,
    sub: [
      {
        id: 'wine',
        ru: 'винное',
        en: 'winey',
        d: [
          ['whitewine', 'белое вино', 'white wine'],
          ['redwine', 'красное вино', 'red wine'],
          ['portwine', 'портвейн', 'port wine'],
          ['vermouth', 'вермут', 'vermouth'],
          ['champagne', 'игристое вино', 'sparkling wine'],
        ],
      },
      {
        /* `whisky` переехал сюда из `wine`: id не тронут, категория та же,
           поэтому цвет и записи журнала не меняются — контракт append-only
           запрещает трогать id, а не позицию внутри категории. */
        id: 'spirits',
        ru: 'крепкое',
        en: 'spirits',
        d: [
          ['whisky', 'виски', 'whisky'],
          ['brandy', 'бренди', 'brandy'],
          ['cognac', 'коньяк', 'cognac'],
          ['rum', 'ром', 'rum'],
          ['liqueur', 'ликёр', 'liqueur'],
        ],
      },
      {
        id: 'ferm',
        ru: 'ферментное',
        en: 'fermented',
        d: [
          ['kvass', 'квас', 'kvass'],
          ['kefir', 'кефир', 'kefir'],
          ['overripe', 'перезрелый фрукт', 'overripe fruit'],
        ],
      },
      {
        id: 'acids',
        ru: 'кислоты',
        en: 'acids',
        d: [
          ['citric', 'лимонная кислота', 'citric acid'],
          ['cider', 'яблочный уксус', 'cider vinegar'],
          ['lactic', 'молочная кислота', 'lactic acid'],
        ],
      },
    ],
  },
  {
    id: 'other',
    ru: 'прочее',
    en: 'other',
    h: 250,
    c: 0.04,
    sub: [
      {
        id: 'paper',
        ru: 'бумажное',
        en: 'papery',
        d: [
          ['paper', 'бумага', 'paper'],
          ['cardboard', 'картон', 'cardboard'],
          ['dust', 'пыль', 'dust'],
        ],
      },
      {
        id: 'chem',
        ru: 'химическое',
        en: 'chemical',
        d: [
          ['rubber', 'резина', 'rubber'],
          ['medicinal', 'аптечное', 'medicinal'],
          ['petrol', 'бензин', 'petrol'],
        ],
      },
      {
        id: 'earth',
        ru: 'земляное',
        en: 'earthy',
        d: [
          ['earth', 'земля', 'earth'],
          ['musty', 'затхлое', 'musty'],
          ['mushroom', 'гриб', 'mushroom'],
          ['mineral', 'минеральное', 'mineral'],
        ],
      },
    ],
  },
] as const satisfies readonly WheelCategory[];

/** `'fruit' | 'floral' | …` — 9 значений. */
export type CategoryId = (typeof WHEEL)[number]['id'];

/** `'berry' | 'citrus' | …` — 28 значений. */
export type SubId = (typeof WHEEL)[number]['sub'][number]['id'];

/** `'strawberry' | 'raspberry' | …` — 109 значений, внешний ключ журнала. */
export type DescriptorId = (typeof WHEEL)[number]['sub'][number]['d'][number][0];

export interface DescriptorInfo {
  readonly ru: string;
  readonly en: string;
  /* Обратные ссылки — путь восстанавливается без обхода дерева. Строки, а не
     union'ы: составное колесо (база + правки, `wheel-edits.ts`) несёт id,
     которых литеральные типы базы не знают. */
  readonly cat: string;
  readonly sub: string;
  /** Тон и цветность родительской категории. */
  readonly h: number;
  readonly c: number;
}

/**
 * Плоская проекция листьев колеса. В прототипе это мутация `{}` в `forEach`
 * прямо при загрузке модуля — здесь чистая функция, результат заморожен
 * (data-js-report §11). Принимает любое дерево категорий — в том числе
 * составное, с пользовательскими правками.
 */
export function buildDesc(
  wheel: readonly WheelCategory[],
): Readonly<Record<string, DescriptorInfo>> {
  const out: Record<string, DescriptorInfo> = {};
  for (const cat of wheel) {
    for (const s of cat.sub) {
      for (const [id, ru, en] of s.d) {
        out[id] = Object.freeze({ ru, en, cat: cat.id, sub: s.id, h: cat.h, c: cat.c });
      }
    }
  }
  return Object.freeze(out);
}

/** `id → {ru, en, cat, sub, h, c}` по всем 109 дескрипторам базы. */
export const DESC = buildDesc(WHEEL);

/**
 * Дерево плюс его плоская проекция — то, с чем работают все функции ниже и
 * весь UI. База (`BASE_WHEEL`) — единственный набор до появления правок;
 * составные наборы собирает `makeWheelSet` из `wheel-edits.ts`.
 */
export interface WheelSet {
  readonly cats: readonly WheelCategory[];
  readonly desc: Readonly<Record<string, DescriptorInfo>>;
  /**
   * Куда откатываться, когда id в этом наборе не найден. У базы отката нет;
   * составные наборы указывают сюда набор без скрытий (см. `effectiveWheelSet`)
   * — так скрытый узел, встроенный или пользовательский, не теряет ни имени,
   * ни цвета в старых записях журнала.
   */
  readonly fallback?: WheelSet;
}

/** База как набор — дефолт всех параметризованных функций ниже. */
export const BASE_WHEEL: WheelSet = Object.freeze({ cats: WHEEL, desc: DESC });

/** Дескриптор по произвольной строке (например, из старой записи журнала). */
export function descById(id: string, ws: WheelSet = BASE_WHEEL): DescriptorInfo | undefined {
  return (ws.desc as Readonly<Record<string, DescriptorInfo | undefined>>)[id];
}

/** Цвет категории. Альфа дописывается только когда она меньше единицы. */
export function catColor(cat: WheelCategory, l = 0.7, cMul = 1, a = 1): string {
  return `oklch(${l} ${(cat.c * cMul).toFixed(3)} ${cat.h}${a < 1 ? ' / ' + a : ''})`;
}

/**
 * Тон/цветность по id любого уровня: дескриптор → его категория, иначе поиск
 * среди категорий и подкатегорий (`DC:962`). Неизвестный id даёт серый.
 *
 * Составной набор перед «серым» откатывается по цепочке `fallback`: правка
 * могла скрыть узел, но наборы без скрытий и база знают его — старые записи
 * журнала не теряют цвет.
 */
export function hueOf(id: string, ws: WheelSet = BASE_WHEEL): { h: number; c: number } {
  const d = descById(id, ws);
  if (d) return { h: d.h, c: d.c };
  for (const c of ws.cats) {
    if (c.id === id) return { h: c.h, c: c.c };
    for (const s of c.sub) if (s.id === id) return { h: c.h, c: c.c };
  }
  if (ws.fallback) return hueOf(id, ws.fallback);
  return { h: 0, c: 0 };
}

/**
 * Имя узла колеса на любом уровне (`nameOf`, `DC:957`): дескриптор, подкатегория
 * или категория. Неизвестный id возвращается как есть — запись журнала могла
 * приехать импортом из сборки, где лист называется иначе.
 *
 * Зеркало {@link hueOf}: тот же обход, только вместо тона берётся название.
 * Нужно всем, кто рисует выбранные дескрипторы, — диагностике, детали записи,
 * сравнению (BJ-4) и колесу (BJ-5), поэтому живёт рядом с данными.
 */
export function nameOf(id: string, lang: 'ru' | 'en', ws: WheelSet = BASE_WHEEL): string {
  const d = descById(id, ws);
  if (d) return d[lang];
  for (const c of ws.cats) {
    if (c.id === id) return c[lang];
    for (const s of c.sub) if (s.id === id) return s[lang];
  }
  // Как и в hueOf: скрытый правкой узел называет цепочка fallback.
  if (ws.fallback) return nameOf(id, lang, ws.fallback);
  return id;
}

/**
 * Цвет чипа-тега (`DC:963`): светлота фиксирована 0.72, цветность приглушена
 * ×0.92 — у секторов колеса своя логика, см. {@link lightnessFor}.
 */
export function colOf(id: string, a?: number, ws: WheelSet = BASE_WHEEL): string {
  const { h, c } = hueOf(id, ws);
  return `oklch(0.72 ${(c * 0.92).toFixed(3)} ${h}${a ? ' / ' + a : ''})`;
}

/** Уровень колеса: 0 — категории, 1 — подкатегории, 2 — дескрипторы. */
export type WheelDepth = 0 | 1 | 2;

/**
 * Светлота сектора (component-report §8.1). Категории чередуются через одну,
 * внутри уровня светлота растёт по позиции, чтобы соседние сектора различались.
 */
export function lightnessFor(depth: WheelDepth, index: number, count: number): number {
  if (depth === 0) return index % 2 ? 0.72 : 0.66;
  const spread = depth === 1 ? 0.22 : 0.24;
  return 0.6 + (index * spread) / Math.max(1, count - 1);
}
