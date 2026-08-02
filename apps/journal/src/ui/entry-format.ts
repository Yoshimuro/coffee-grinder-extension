/**
 * Подписи записи журнала — порт `entryTitle` / `entrySub` / `entryMark`
 * (`DC:970`, `DC:971`, `DC:977`; component-report §10.4).
 *
 * Одна запись показывается пятью экранами (home, log, detail, bean, compare), и
 * во всех пяти она должна читаться одинаково — поэтому формат живёт здесь, а не
 * в каждом из них. Функции чистые: пачку и девайс подаёт вызывающий, потому что
 * только он знает, откуда их взять (liveQuery, кэш, уже загруженный список).
 *
 * Отличия от прототипа:
 *   - тексты «Чашка» / «дегустация · без рецепта» / «помол» / «С» переехали в
 *     `data/strings.ts` — в прототипе они были вписаны в методы, и английская
 *     версия журнала оставалась русской;
 *   - оценка гасится по `status`, а не по наличию `diag`: в схеме v1 `diag`
 *     обязателен, у ждущей оценки записи он заполнен нулями (`PENDING_DIAG`),
 *     и «С 0» было бы враньём.
 */

import { STR } from '../data/strings.js';
import type { BeanForm, BeanRecord, DeviceRecord, EntryRecord, Lang } from '../db/schema.js';
import { fmtT } from '../domain/format.js';

/** Разделитель прототипа. Один на весь файл, чтобы он не разъехался. */
const SEP = ' · ';

/**
 * Записи ссылаются на пачку и девайс по id. Обе ссылки могут не разрешиться:
 * `cup` их не имеет вовсе, а удалённая пачка оставляет висячий id (D-3 спеки —
 * запись переживает удаление того, о чём она).
 */
export interface EntryRefs {
  bean?: BeanRecord | null | undefined;
  device?: DeviceRecord | null | undefined;
}

/**
 * Имя девайса без бренда. `Hario ` срезается так же, как в прототипе: в строке
 * «Ява · Hario V60-02» бренд занимает треть ширины и ничего не различает.
 */
export function brewerName(device: DeviceRecord | null | undefined, lang: Lang): string {
  return device ? device.name.replace('Hario ', '') : STR[lang].entry_none;
}

/**
 * Подпись девайса. Денормализованное `devName` идёт первым: запись обязана
 * пережить удаление девайса. Дрип девайса не имеет — там стоит форма кофе.
 *
 * Две перегрузки, потому что зовут её из двух мест с разными данными: журнал
 * знает запись, а таймер и сетап — только форму кофе и выбранный девайс, записи
 * ещё нет. G2 держал вторую как `brewerLabel` в `timer-view.ts` и пометил
 * дублем; здесь она внутри той же функции, чтобы «V60-02» везде получалось по
 * одному правилу.
 */
export function deviceLabel(entry: EntryRecord, lang: Lang, device?: DeviceRecord | null): string;
export function deviceLabel(form: BeanForm, lang: Lang, device: DeviceRecord | null): string;
export function deviceLabel(
  source: EntryRecord | BeanForm,
  lang: Lang,
  device?: DeviceRecord | null,
): string {
  const t = STR[lang];

  if (typeof source === 'string') {
    return source === 'drip' ? t.form_drip : brewerName(device, lang);
  }

  if (source.mode === 'drip') return t.form_drip;
  if (source.devName) return source.devName;
  return brewerName(device, lang);
}

/** Заголовок: `Пачка · Девайс`. Для дегустации — своё имя или «Чашка». */
export function entryTitle(entry: EntryRecord, lang: Lang, refs: EntryRefs = {}): string {
  const t = STR[lang];
  if (entry.mode === 'cup') return entry.title || t.entry_cup;

  const bean = refs.bean?.name || t.entry_none;
  return `${bean}${SEP}${deviceLabel(entry, lang, refs.device)}`;
}

/**
 * Тех-подстрока: `помол N · доза г · вода г · T° · M:SS`.
 *
 * Части, которых у записи нет, просто выпадают — у молотого и дрипа нет помола,
 * у импортированной записи может не быть температуры.
 */
export function entrySub(entry: EntryRecord, lang: Lang): string {
  const t = STR[lang];
  if (entry.mode === 'cup') return t.entry_cup_sub;

  /* Схема требует dose/water/temp/total, но прототип проверял каждое поле
     (`DC:971`), и запись может приехать импортом из чужой сборки. `isFinite`
     ловит и пропуск, и NaN, и не спорит с типом. */
  const parts: string[] = [];
  if (entry.grind !== null && Number.isFinite(entry.grind))
    parts.push(`${t.entry_grind} ${entry.grind}`);
  if (Number.isFinite(entry.dose)) parts.push(`${entry.dose} ${t.grams}`);
  if (Number.isFinite(entry.water)) parts.push(`${entry.water} ${t.grams}`);
  if (Number.isFinite(entry.temp)) parts.push(`${entry.temp}${t.deg}`);
  /* Ноль — это «не засекал» у записи без таймера, а не измеренный ноль: «0:00»
     в ленте читалось бы как мгновенное заваривание. */
  if (Number.isFinite(entry.total) && entry.total > 0) parts.push(fmtT(entry.total));
  return parts.join(SEP);
}

/** Оценка: `С N` из `diag.balance`. У ждущей оценки записи — пусто. */
export function entryMark(entry: EntryRecord, lang: Lang): string {
  if (entry.status !== 'done') return '';
  return `${STR[lang].entry_mark} ${entry.diag.balance}`;
}
