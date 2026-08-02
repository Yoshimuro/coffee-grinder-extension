/**
 * Подписи пачки — порт `formL` / `leftStr` / `beanTech` / `fd`
 * (`DC:951`, `DC:965-968`).
 *
 * Живёт рядом с `entry-format.ts` и по той же причине: одну пачку показывают
 * пять экранов — полка, карточка пачки, сетап заваривания, лента журнала и
 * фильтры, — и во всех пяти она обязана читаться одинаково. G2 объявил эти
 * функции у себя в `brewing/brew-view.ts` (там они были нужны раньше, чем
 * появилась общая точка) и пометил их кандидатами на подъём; здесь они и
 * подняты, а `brew-view.ts` их реэкспортирует, чтобы не ломать свои импорты.
 *
 * Функции чистые, «сегодня» приходит параметром: прототип держал дату
 * константой `TODAY` и от этого врал на второй день (спека §7).
 */

import { ageDays, phaseOf } from '../data/freshness.js';
import { STR } from '../data/strings.js';
import type { BeanForm, BeanRecord, Lang } from '../db/schema.js';

/** Разделитель прототипа. Один на файл, чтобы он не разъехался. */
const SEP = ' · ';

/** Метка формы кофе: «ЗЕРНО» / «МОЛОТЫЙ» / «ДРИП-ПАКЕТ» (`formL`, `DC:968`). */
export function formLabel(form: BeanForm, lang: Lang): string {
  const t = STR[lang];
  return form === 'beans' ? t.form_beans : form === 'ground' ? t.form_ground : t.form_drip;
}

/**
 * Остаток пачки: граммы у зерна и молотого, штуки у дрипа (`leftStr`, `DC:966`).
 *
 * Отсутствующий остаток читается нулём, а не прочерком: пустая пачка — это
 * ноль, и «—» на её месте выглядело бы как «неизвестно».
 */
export function leftLabel(bean: BeanRecord, lang: Lang): string {
  const t = STR[lang];
  return bean.form === 'drip' ? `${bean.leftCount ?? 0} ${t.pcs}` : `${bean.left ?? 0} ${t.grams}`;
}

/** Возраст с фазой: «5 дн · пик». Отдельно — его показывает карточка пачки. */
export function ageLabel(bean: BeanRecord, lang: Lang, today: string): string {
  const t = STR[lang];
  const days = ageDays(bean.roast, today);
  return `${days} ${t.days}${SEP}${t[`phase_${phaseOf(days)}`]}`;
}

/** Тех-подстрока пачки: «5 дн · пик · 187 г» (`beanTech`, `DC:967`). */
export function beanTech(bean: BeanRecord, lang: Lang, today: string): string {
  return `${ageLabel(bean, lang, today)}${SEP}${leftLabel(bean, lang)}`;
}

/** То же с формой впереди: «ЗЕРНО · 5 дн · пик · 187 г» (полка, `DC:1253`). */
export function beanTechWithForm(bean: BeanRecord, lang: Lang, today: string): string {
  return `${formLabel(bean.form, lang)}${SEP}${beanTech(bean, lang, today)}`;
}

/**
 * Имя пачки для строки списка. Пустое имя — прочерк: пачку можно завести
 * вообще без названия (`bean_optional`), и подпись обязана это пережить.
 */
export function beanName(bean: BeanRecord | null | undefined, lang: Lang): string {
  return bean?.name || STR[lang].entry_none;
}

/* ── Даты ────────────────────────────────────────────────────────────────── */

/** `DD.MM` — колонка даты в ленте журнала и на карточке пачки (`fd`, `DC:951`). */
export function shortDate(iso: string): string {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
}

/** `DD.MM.YYYY` — дата обжарки в статах и в поле ввода. */
export function longDate(iso: string): string {
  return `${shortDate(iso)}.${iso.slice(0, 4)}`;
}

/**
 * Разбор `DD.MM.YYYY` обратно в ISO (`addSave`, `DC:1271`).
 *
 * Поле даты обжарки — текстовое: нативный `<input type="date">` в тёмной теме
 * WebView рисует свой календарь чужими цветами и своим шрифтом, а формат здесь
 * ровно один. `null` — не разобралось, вызывающий оставляет прежнюю дату.
 */
export function parseDate(raw: string): string | null {
  const m = /^\s*(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})\s*$/.exec(raw);
  if (!m) return null;

  const [, d, mo, y] = m as unknown as [string, string, string, string];
  const day = Number(d);
  const month = Number(mo);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const iso = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  // «31.02.2026» разбирается по маске, но такого дня нет: сравнение с тем, что
  // получилось у Date, отсекает это, не заводя таблицы длин месяцев.
  const parsed = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.getUTCDate() !== day ? null : iso;
}

/**
 * Автомаска ввода `DD.MM.YYYY`: пользователь набирает только цифры, точки
 * после дня и месяца встают сами (BJ-8 — просили не заставлять ставить точки
 * руками).
 *
 * Чистая функция от `raw` и `prev` — тестируется так же легко, как
 * `parseDate`, и по той же причине держит поле текстовым (см. `parseDate`
 * выше). `prev` нужен для одного случая: обычный backspace в конце строки
 * стирает автоматически вставленную точку, а под ней спрятана цифра — без
 * сравнения с предыдущим значением поле «залипало» бы на границе групп и не
 * давало стереть дату короче.
 */
export function maskDate(raw: string, prev = ''): string {
  const digitsOf = (s: string) => s.replace(/\D/g, '').slice(0, 8);
  const rawDigits = digitsOf(raw);
  const prevDigits = digitsOf(prev);

  // Строка укоротилась, а цифры не изменились — значит, стёрлась именно
  // точка. Стираем следом и цифру под ней, иначе backspace на границе дня
  // или месяца ничего бы не делал.
  const digits =
    raw.length < prev.length && rawDigits === prevDigits && rawDigits.length > 0
      ? rawDigits.slice(0, -1)
      : rawDigits;

  return formatMaskedDate(digits);
}

/** Расставляет точки после дня и месяца по числу собранных цифр. */
function formatMaskedDate(digits: string): string {
  let out = digits.slice(0, 2);
  if (digits.length >= 2) out += '.';
  if (digits.length > 2) {
    out += digits.slice(2, 4);
    if (digits.length >= 4) out += '.';
  }
  if (digits.length > 4) out += digits.slice(4, 8);
  return out;
}
