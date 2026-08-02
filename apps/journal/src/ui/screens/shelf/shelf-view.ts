/**
 * Полка — чистые правила и строки трёх экранов (shelf / bean / beanAdd).
 *
 * Группа G1 работу не сдала, экраны собраны на интеграции (S-6). Логика
 * вынесена сюда по той же причине, что у остальных групп: диапазоны количества,
 * состав статов и сборка новой записи — правила продукта, и проверяться они
 * должны тестом, а не глазами по JSX.
 *
 * Числа перенесены из прототипа дословно (`addAmtDec`/`addAmtInc` `DC:1268-1269`,
 * `addSave` `DC:1271`).
 */

import { STR } from '../../../data/strings.js';
import type { BeanForm, BeanRecord, Lang } from '../../../db/schema.js';
import type { StepperRange } from '../../components/index.js';
import { ageLabel, leftLabel, longDate, parseDate } from '../../bean-format.js';

/** Три формы кофе в порядке чипов на экране добавления (`DC:1262`). */
export const BEAN_FORMS: readonly BeanForm[] = ['beans', 'ground', 'drip'];

/** ВЕС пачки: ±25 г от 50 (`DC:1268-1269`). Верх — килограммовый пакет. */
export const WEIGHT_RANGE: StepperRange = { min: 50, max: 1000, step: 25 };

/** ШТУК В КОРОБКЕ: ±1 от одной (`DC:1268-1269`). */
export const COUNT_RANGE: StepperRange = { min: 1, max: 60, step: 1 };

/**
 * Доза одного дрип-пакета в граммах.
 *
 * Прототип вписывал 12 прямо в `addSave` (`DC:1271`), и это не выдумка, а
 * фактический стандарт: производители фасуют 11–12 г. Поля для неё на экране
 * нет — форма добавления по макету спрашивает только количество, — поэтому
 * значение остаётся здесь одной названной константой, а не разбредается по
 * коду. Захардкоженность унаследована и зафиксирована, а не изобретена.
 */
export const DRIP_DOSE = 12;

/** Количество у дрипа считается штуками, у остального — граммами. */
export function amountRange(form: BeanForm): StepperRange {
  return form === 'drip' ? COUNT_RANGE : WEIGHT_RANGE;
}

/** Подпись поля количества: «ШТУК В КОРОБКЕ» или «ВЕС» (`DC:1266`). */
export function amountLabel(form: BeanForm, lang: Lang): string {
  return form === 'drip' ? STR[lang].bean_count : STR[lang].bean_weight;
}

/** Единица поля количества: «шт» или «г». */
export function amountUnit(form: BeanForm, lang: Lang): string {
  return form === 'drip' ? STR[lang].pcs : STR[lang].grams;
}

/** Счётчик в шапке полки: «3 · пачки» (`shelfCount`, `DC:1252`). */
export function shelfCountLine(count: number, lang: Lang): string {
  return `${count} · ${STR[lang].shelf_packs}`;
}

/* ── Карточка пачки ──────────────────────────────────────────────────────── */

/** Один стат в тройной сетке карточки. */
export interface BeanStat {
  label: string;
  value: string;
}

/**
 * Три стата карточки пачки (`beanStats`, `DC:1256`): возраст с фазой, остаток,
 * дата обжарки.
 */
export function beanStats(bean: BeanRecord, lang: Lang, today: string): BeanStat[] {
  const t = STR[lang];
  return [
    { label: t.shelf_age.toUpperCase(), value: ageLabel(bean, lang, today) },
    { label: t.shelf_left.toUpperCase(), value: leftLabel(bean, lang) },
    { label: t.bean_roast, value: longDate(bean.roast) },
  ];
}

/**
 * Подпись пустого слота фото: первый — лицо пачки, остальные — шов с датой
 * (`beanSlots`, `DC:1259`).
 */
export function slotPlaceholder(index: number, lang: Lang): string {
  return index === 0 ? STR[lang].bean_ph_face : STR[lang].bean_ph_seam;
}

/**
 * Сколько слотов показывает карточка: все снятые плюс один пустой, но не
 * меньше двух — README просит минимум лицо и шов с датой обжарки.
 */
export function slotCount(photos: readonly unknown[]): number {
  return Math.max(2, photos.length + 1);
}

/** Ответ сторожа карточки: нести ли дальше «пачка отвечала» и пора ли уходить. */
export interface BeanGuard {
  /** Пачка хоть раз ответила. С этого момента `undefined` значит «удалена». */
  answered: boolean;
  /** Показывать нечего — карточку надо закрыть. */
  gone: boolean;
}

/**
 * Пачку могли удалить, пока карточка открыта, — тогда экран уходит назад, а не
 * рисует себя из прочерков. Но `useBean` отдаёт `undefined` и пока база молчит,
 * и когда записи нет, поэтому «нет» опознаётся не по самому `undefined`, а по
 * тому, отвечала ли пачка хоть раз.
 *
 * Без этой памяти карточка закрывалась сама, не успев отрисоваться: два запроса
 * (пачка и её заварки) уходят в базу вместе и возвращаются в произвольном
 * порядке, и список успевал первым.
 */
export function beanGuard(
  beanId: string | null,
  bean: BeanRecord | undefined,
  answered: boolean,
): BeanGuard {
  const seen = answered || bean !== undefined;
  return { answered: seen, gone: beanId === null || (seen && bean === undefined) };
}

/* ── Новая пачка ─────────────────────────────────────────────────────────── */

/** Что экран добавления собрал к моменту нажатия «СОХРАНИТЬ». */
export interface NewBeanDraft {
  form: BeanForm;
  /** ISO `YYYY-MM-DD`. Экран разбирает его из `DD.MM.YYYY` при вводе. */
  roast: string;
  /** Граммы или штуки — по форме. */
  amount: number;
  name: string;
  photos: BeanRecord['photos'];
}

/**
 * Гейт кнопки «СОХРАНИТЬ» экрана добавления: дата обжарки держит на себе всю
 * свежесть пачки и обязана быть валидной, а с BJ-8 обязательным стало и
 * имя — фолбэк на `bean_untitled` в `makeBean` ниже остаётся только для
 * импорта чужих zip и старых записей, а не для нового ввода.
 */
export function draftReady(roastText: string, name: string): boolean {
  return parseDate(roastText) !== null && name.trim() !== '';
}

/**
 * Черновик → запись полки (`addSave`, `DC:1271`).
 *
 * Остаток при заведении равен полному объёму: пачку заводят непочатой, а
 * списывать её будет заваривание. Пустое имя заменяется на «Без названия» —
 * пустая строка в списке читалась бы как сбой, а не как решение не называть.
 */
export function makeBean(draft: NewBeanDraft, id: string, lang: Lang): BeanRecord {
  const bean: BeanRecord = {
    id,
    form: draft.form,
    name: draft.name.trim() || STR[lang].bean_untitled,
    roaster: '',
    roast: draft.roast,
    photos: [...draft.photos],
  };

  if (draft.form === 'drip') {
    bean.count = draft.amount;
    bean.leftCount = draft.amount;
    bean.dose = DRIP_DOSE;
  } else {
    bean.weight = draft.amount;
    bean.left = draft.amount;
  }

  return bean;
}
