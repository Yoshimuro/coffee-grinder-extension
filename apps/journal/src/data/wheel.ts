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
    ru: 'Фруктовое',
    en: 'Fruity',
    h: 20,
    c: 0.16,
    sub: [
      {
        id: 'berry',
        ru: 'Ягоды',
        en: 'Berries',
        d: [
          ['strawberry', 'Клубника', 'Strawberry'],
          ['raspberry', 'Малина', 'Raspberry'],
          ['blueberry', 'Черника', 'Blueberry'],
          ['blackberry', 'Ежевика', 'Blackberry'],
          ['cranberry', 'Клюква', 'Cranberry'],
          ['gooseberry', 'Крыжовник', 'Gooseberry'],
          ['blackcurrant', 'Чёрная смородина', 'Blackcurrant'],
        ],
      },
      {
        id: 'citrus',
        ru: 'Цитрус',
        en: 'Citrus',
        d: [
          ['lemon', 'Лимон', 'Lemon'],
          ['lime', 'Лайм', 'Lime'],
          ['orange', 'Апельсин', 'Orange'],
          ['grapefruit', 'Грейпфрут', 'Grapefruit'],
          ['bergamot', 'Бергамот', 'Bergamot'],
        ],
      },
      {
        id: 'stone',
        ru: 'Косточковые',
        en: 'Stone fruit',
        d: [
          ['peach', 'Персик', 'Peach'],
          ['apricot', 'Абрикос', 'Apricot'],
          ['scherry', 'Вишня', 'Sour cherry'],
          ['cherry', 'Черешня', 'Sweet cherry'],
          ['plum', 'Слива', 'Plum'],
        ],
      },
      {
        id: 'tropic',
        ru: 'Тропики',
        en: 'Tropical',
        d: [
          ['pineapple', 'Ананас', 'Pineapple'],
          ['mango', 'Манго', 'Mango'],
          ['passion', 'Маракуйя', 'Passion fruit'],
          ['lychee', 'Личи', 'Lychee'],
          ['banana', 'Банан', 'Banana'],
        ],
      },
      {
        id: 'orchard',
        ru: 'Сад',
        en: 'Orchard',
        d: [
          ['apple', 'Яблоко', 'Apple'],
          ['pear', 'Груша', 'Pear'],
          ['grape', 'Виноград', 'Grape'],
          ['quince', 'Айва', 'Quince'],
        ],
      },
      {
        id: 'dried',
        ru: 'Сухофрукты',
        en: 'Dried fruit',
        d: [
          ['raisin', 'Изюм', 'Raisin'],
          ['prune', 'Чернослив', 'Prune'],
          ['dapricot', 'Курага', 'Dried apricot'],
          ['date', 'Финик', 'Date'],
          ['fig', 'Инжир', 'Fig'],
        ],
      },
    ],
  },
  {
    id: 'floral',
    ru: 'Цветочное',
    en: 'Floral',
    h: 330,
    c: 0.14,
    sub: [
      {
        id: 'white',
        ru: 'Белые цветы',
        en: 'White flowers',
        d: [
          ['jasmine', 'Жасмин', 'Jasmine'],
          ['blossom', 'Цвет яблони', 'Apple blossom'],
          ['lily', 'Ландыш', 'Lily of the valley'],
        ],
      },
      {
        id: 'tea',
        ru: 'Чайное',
        en: 'Tea-like',
        d: [
          ['blacktea', 'Чёрный чай', 'Black tea'],
          ['greentea', 'Зелёный чай', 'Green tea'],
          ['chamomile', 'Ромашка', 'Chamomile'],
          ['linden', 'Липовый цвет', 'Linden blossom'],
        ],
      },
      {
        id: 'sweetfl',
        ru: 'Сладкие цветы',
        en: 'Sweet flowers',
        d: [
          ['rose', 'Роза', 'Rose'],
          ['lavender', 'Лаванда', 'Lavender'],
          ['lilac', 'Сирень', 'Lilac'],
        ],
      },
    ],
  },
  {
    id: 'sweet',
    ru: 'Сладкое',
    en: 'Sweet',
    h: 85,
    c: 0.13,
    sub: [
      {
        id: 'caramel',
        ru: 'Карамельное',
        en: 'Caramelized',
        d: [
          ['caramel', 'Карамель', 'Caramel'],
          ['toffee', 'Ирис', 'Toffee'],
          ['brulee', 'Крем-брюле', 'Crème brûlée'],
          ['molasses', 'Патока', 'Molasses'],
        ],
      },
      {
        id: 'honey',
        ru: 'Мёд и сиропы',
        en: 'Honey & syrup',
        d: [
          ['honey', 'Мёд', 'Honey'],
          ['maple', 'Кленовый сироп', 'Maple syrup'],
          ['bakedmilk', 'Топлёное молоко', 'Baked milk'],
        ],
      },
      {
        id: 'vanilla',
        ru: 'Ваниль и выпечка',
        en: 'Vanilla & pastry',
        d: [
          ['vanilla', 'Ваниль', 'Vanilla'],
          ['pastry', 'Сдоба', 'Sweet pastry'],
          ['meringue', 'Безе', 'Meringue'],
        ],
      },
    ],
  },
  {
    id: 'nutty',
    ru: 'Орехи и какао',
    en: 'Nutty & cocoa',
    h: 55,
    c: 0.09,
    sub: [
      {
        id: 'nuts',
        ru: 'Орехи',
        en: 'Nuts',
        d: [
          ['hazelnut', 'Фундук', 'Hazelnut'],
          ['almond', 'Миндаль', 'Almond'],
          ['peanut', 'Арахис', 'Peanut'],
          ['walnut', 'Грецкий орех', 'Walnut'],
          ['cashew', 'Кешью', 'Cashew'],
        ],
      },
      {
        id: 'cocoa',
        ru: 'Какао',
        en: 'Cocoa',
        d: [
          ['cocoad', 'Какао', 'Cocoa'],
          ['darkchoc', 'Тёмный шоколад', 'Dark chocolate'],
          ['milkchoc', 'Молочный шоколад', 'Milk chocolate'],
          ['drinkchoc', 'Горячий шоколад', 'Drinking chocolate'],
        ],
      },
    ],
  },
  {
    id: 'spice',
    ru: 'Пряности',
    en: 'Spices',
    h: 45,
    c: 0.14,
    sub: [
      {
        id: 'warm',
        ru: 'Тёплые',
        en: 'Warm',
        d: [
          ['cinnamon', 'Корица', 'Cinnamon'],
          ['clove', 'Гвоздика', 'Clove'],
          ['nutmeg', 'Мускатный орех', 'Nutmeg'],
          ['cardamom', 'Кардамон', 'Cardamom'],
        ],
      },
      {
        id: 'pungent',
        ru: 'Острые',
        en: 'Pungent',
        d: [
          ['pepper', 'Чёрный перец', 'Black pepper'],
          ['ginger', 'Имбирь', 'Ginger'],
        ],
      },
      {
        id: 'anise',
        ru: 'Анисовые',
        en: 'Anise',
        d: [
          ['anise', 'Анис', 'Anise'],
          ['staranise', 'Бадьян', 'Star anise'],
          ['coriander', 'Кориандр', 'Coriander seed'],
        ],
      },
    ],
  },
  {
    id: 'roast',
    ru: 'Обжарка',
    en: 'Roasted',
    h: 30,
    c: 0.05,
    sub: [
      {
        id: 'bread',
        ru: 'Хлебное',
        en: 'Grain & bread',
        d: [
          ['crust', 'Хлебная корка', 'Bread crust'],
          ['malt', 'Солод', 'Malt'],
          ['rye', 'Ржаной хлеб', 'Rye bread'],
        ],
      },
      {
        id: 'smoke',
        ru: 'Дымное',
        en: 'Smoky',
        d: [
          ['smoke', 'Дым', 'Smoke'],
          ['ash', 'Зола', 'Ash'],
          ['tobacco', 'Табак', 'Tobacco'],
          ['burnt', 'Жжёный сахар', 'Burnt sugar'],
        ],
      },
    ],
  },
  {
    id: 'green',
    ru: 'Зелёное',
    en: 'Green',
    h: 150,
    c: 0.12,
    sub: [
      {
        id: 'grass',
        ru: 'Травяное',
        en: 'Grassy',
        d: [
          ['grass', 'Свежая трава', 'Fresh grass'],
          ['hay', 'Сено', 'Hay'],
          ['stem', 'Стебель', 'Stem'],
        ],
      },
      {
        id: 'veg',
        ru: 'Овощное',
        en: 'Vegetal',
        d: [
          ['pea', 'Зелёный горошек', 'Green pea'],
          ['cucumber', 'Огурец', 'Cucumber'],
          ['olive', 'Оливковое масло', 'Olive oil'],
          ['bellpepper', 'Болгарский перец', 'Bell pepper'],
        ],
      },
    ],
  },
  {
    id: 'ferment',
    ru: 'Ферментация',
    en: 'Fermented',
    h: 310,
    c: 0.12,
    sub: [
      {
        id: 'wine',
        ru: 'Винное',
        en: 'Winey',
        d: [
          ['whitewine', 'Белое вино', 'White wine'],
          ['redwine', 'Красное вино', 'Red wine'],
          ['whisky', 'Виски', 'Whisky'],
        ],
      },
      {
        id: 'ferm',
        ru: 'Ферментное',
        en: 'Fermented',
        d: [
          ['kvass', 'Квас', 'Kvass'],
          ['kefir', 'Кефир', 'Kefir'],
          ['overripe', 'Перезрелый фрукт', 'Overripe fruit'],
        ],
      },
      {
        id: 'acids',
        ru: 'Кислоты',
        en: 'Acids',
        d: [
          ['citric', 'Лимонная кислота', 'Citric acid'],
          ['cider', 'Яблочный уксус', 'Cider vinegar'],
          ['lactic', 'Молочная кислота', 'Lactic acid'],
        ],
      },
    ],
  },
  {
    id: 'other',
    ru: 'Прочее',
    en: 'Other',
    h: 250,
    c: 0.04,
    sub: [
      {
        id: 'paper',
        ru: 'Бумажное',
        en: 'Papery',
        d: [
          ['paper', 'Бумага', 'Paper'],
          ['cardboard', 'Картон', 'Cardboard'],
          ['dust', 'Пыль', 'Dust'],
        ],
      },
      {
        id: 'chem',
        ru: 'Химическое',
        en: 'Chemical',
        d: [
          ['rubber', 'Резина', 'Rubber'],
          ['medicinal', 'Аптечное', 'Medicinal'],
          ['petrol', 'Бензин', 'Petrol'],
        ],
      },
      {
        id: 'earth',
        ru: 'Земляное',
        en: 'Earthy',
        d: [
          ['earth', 'Земля', 'Earth'],
          ['musty', 'Затхлое', 'Musty'],
          ['mushroom', 'Гриб', 'Mushroom'],
          ['mineral', 'Минеральное', 'Mineral'],
        ],
      },
    ],
  },
] as const satisfies readonly WheelCategory[];

/** `'fruit' | 'floral' | …` — 9 значений. */
export type CategoryId = (typeof WHEEL)[number]['id'];

/** `'berry' | 'citrus' | …` — 27 значений. */
export type SubId = (typeof WHEEL)[number]['sub'][number]['id'];

/** `'strawberry' | 'raspberry' | …` — 102 значения, внешний ключ журнала. */
export type DescriptorId = (typeof WHEEL)[number]['sub'][number]['d'][number][0];

export interface DescriptorInfo {
  readonly ru: string;
  readonly en: string;
  /** Обратная ссылка — путь восстанавливается без обхода дерева. */
  readonly cat: CategoryId;
  readonly sub: SubId;
  /** Тон и цветность родительской категории. */
  readonly h: number;
  readonly c: number;
}

/**
 * Плоская проекция листьев колеса. В прототипе это мутация `{}` в `forEach`
 * прямо при загрузке модуля — здесь чистая функция, результат заморожен
 * (data-js-report §11).
 */
export function buildDesc(
  wheel: typeof WHEEL,
): Readonly<Record<DescriptorId, DescriptorInfo>> {
  const out: Partial<Record<DescriptorId, DescriptorInfo>> = {};
  for (const cat of wheel) {
    for (const s of cat.sub) {
      for (const [id, ru, en] of s.d) {
        out[id] = Object.freeze({ ru, en, cat: cat.id, sub: s.id, h: cat.h, c: cat.c });
      }
    }
  }
  // Каждый лист колеса записан выше, поэтому частичная карта заполнена целиком;
  // выразить это системе типов нечем.
  return Object.freeze(out) as Readonly<Record<DescriptorId, DescriptorInfo>>;
}

/** `id → {ru, en, cat, sub, h, c}` по всем 102 дескрипторам. */
export const DESC = buildDesc(WHEEL);

/** Дескриптор по произвольной строке (например, из старой записи журнала). */
export function descById(id: string): DescriptorInfo | undefined {
  return (DESC as Readonly<Record<string, DescriptorInfo | undefined>>)[id];
}

/** Цвет категории. Альфа дописывается только когда она меньше единицы. */
export function catColor(cat: WheelCategory, l = 0.7, cMul = 1, a = 1): string {
  return `oklch(${l} ${(cat.c * cMul).toFixed(3)} ${cat.h}${a < 1 ? ' / ' + a : ''})`;
}

/**
 * Тон/цветность по id любого уровня: дескриптор → его категория, иначе поиск
 * среди категорий и подкатегорий (`DC:962`). Неизвестный id даёт серый.
 */
export function hueOf(id: string): { h: number; c: number } {
  const d = descById(id);
  if (d) return { h: d.h, c: d.c };
  for (const c of WHEEL) {
    if (c.id === id) return { h: c.h, c: c.c };
    for (const s of c.sub) if (s.id === id) return { h: c.h, c: c.c };
  }
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
export function nameOf(id: string, lang: 'ru' | 'en'): string {
  const d = descById(id);
  if (d) return d[lang];
  for (const c of WHEEL) {
    if (c.id === id) return c[lang];
    for (const s of c.sub) if (s.id === id) return s[lang];
  }
  return id;
}

/**
 * Цвет чипа-тега (`DC:963`): светлота фиксирована 0.72, цветность приглушена
 * ×0.92 — у секторов колеса своя логика, см. {@link lightnessFor}.
 */
export function colOf(id: string, a?: number): string {
  const { h, c } = hueOf(id);
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
