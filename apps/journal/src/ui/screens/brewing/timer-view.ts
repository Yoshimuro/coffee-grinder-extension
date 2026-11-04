/**
 * Таймер — все отображаемые значения (component-report §4.5, `DC:1191-1209`).
 *
 * Экран не считает ничего сам: он получает время из домена и прогоняет его
 * через эти функции. Формулы ширин и заливок сегментов, накопительной воды и
 * отклонения перенесены дословно — это единственное место, где они живут, и
 * тест проверяет именно их, а не разметку.
 *
 * D-6: кнопка завершения подписана `t_done` («ГОТОВО», README:50), а не
 * прототипным `t_finish` («ЗАВЕРШИТЬ»).
 */

import { STR, stageName } from '../../../data/strings.js';
import type { BeanForm, DeviceRecord, Lang, Stage } from '../../../db/schema.js';
import { fmtT } from '../../../domain/format.js';
import { plannedTotal } from '../../../domain/stages.js';
import { deviceLabel } from '../../entry-format.js';

const SEP = ' · ';

/** Округление до десятых — сегменты рисуются процентами с одним знаком. */
const r1 = (x: number): number => Math.round(x * 10) / 10;

/* ── Шкала стадий ────────────────────────────────────────────────────────── */

/** Один сегмент шкалы: доля ширины и процент заливки, оба в процентах. */
export interface Segment {
  width: number;
  fill: number;
}

/**
 * Сегменты шкалы (`tSegs`, `DC:1199`).
 *
 * Ширина пропорциональна плановой длительности минус 0.6 % на зазор, но не
 * меньше 1.2 %, иначе короткая стадия схлопнется в невидимую полоску. Маркеры
 * нулевой длительности (`РАЗМЕШАТЬ`, `ОТКРЫТЬ КЛАПАН`) получают ровно 1 %:
 * активными они не становятся, но в шкале присутствуют.
 *
 * Заливка: пройденные — целиком, будущие — пусто, текущая — по доле прошедшего
 * времени. В паузе текущая стадия показана целиком: её время уже записано.
 */
export function segments(
  stages: readonly Stage[],
  idx: number,
  stageSec: number,
  paused: boolean,
): Segment[] {
  // Плановый ноль возможен только у вырожденного плана из одних маркеров;
  // единица вместо него оставляет формулу конечной.
  const total = plannedTotal(stages) || 1;

  return stages.map((stage, i) => ({
    width: stage[1] ? r1(Math.max(1.2, (stage[1] / total) * 100 - 0.6)) : 1,
    fill:
      i < idx
        ? 100
        : i > idx
          ? 0
          : paused
            ? 100
            : stage[1]
              ? r1(Math.min(100, (stageSec / stage[1]) * 100))
              : 0,
  }));
}

/* ── Строки ──────────────────────────────────────────────────────────────── */

/**
 * `рецепт 3:35` — плановая длительность всего плана (`DC:1198`).
 *
 * Было «цель». Слово поменялось не ради слова: таймер больше не подгоняет к
 * числу, а показывает рядом то, что человек сам себе назначил (BJ-12).
 */
export function targetLine(stages: readonly Stage[], lang: Lang): string {
  return `${STR[lang].t_recipe} ${fmtT(plannedTotal(stages))}`;
}

/** `1 / 5`; в паузе счёт стадий стоит и вместо номера идут точки (`DC:1200`). */
export function stageCounter(
  stages: readonly Stage[],
  idx: number,
  lang: Lang,
  paused: boolean,
): string {
  if (paused) return STR[lang].t_paused_num;
  return `${idx + 1} / ${stages.length}`;
}

/** Имя стадии; в паузе — «ПАУЗА» (`DC:1200`). */
export function stageTitle(
  stages: readonly Stage[],
  idx: number,
  lang: Lang,
  paused: boolean,
): string {
  if (paused) return STR[lang].t_pause;
  const cur = stages[idx];
  if (cur?.[0] === 'drain') return STR[lang].t_drain_wait;
  return cur ? stageName(cur[0], lang) : '';
}

/**
 * Фактическое время текущей стадии: `0:39`, в паузе — растущее `+ 0:05`
 * стекания (BJ-12).
 *
 * Заменило обратный отсчёт `− 0:12` с овертаймом `+ 0:0N`. Отсчёт назад
 * превращал подсказку в норматив: человек смотрел, сколько он «должен», а не
 * сколько прошло. Теперь счёт идёт только вперёд, а рецепт стоит рядом серым
 * ({@link recipeLine}).
 *
 * Плюс здесь — обычный, а минус ушёл вместе с отсчётом.
 */
export function stageElapsedLine(stageSec: number, paused: boolean): string {
  return paused ? `+ ${fmtT(stageSec)}` : fmtT(stageSec);
}

/**
 * Тихая цель стадии: `рецепт 0:45 · 150 г` (BJ-12).
 *
 * Пустая строка у стадии без цели — у отметки нулевой длительности говорить
 * нечего. В паузе вместо неё «даём стечь»: это единственное, что сейчас
 * происходит, и никакого рецепта у стекания нет.
 *
 * Заменила строку «150 г из 250»: накопительная вода отвечала на вопрос, за
 * которым к таймеру не приходят, а место занимала.
 */
export function recipeLine(
  stages: readonly Stage[],
  idx: number,
  lang: Lang,
  paused: boolean,
): string {
  const t = STR[lang];
  if (paused) return t.t_draining;

  const cur = stages[idx];
  if (!cur || (!cur[1] && !cur[2])) return '';

  const dur = cur[1] ? ` ${fmtT(cur[1])}` : '';
  const water = cur[2] ? `${SEP}${cur[2]} ${t.grams}` : '';
  return `${t.t_recipe}${dur}${water}`;
}

/** `дальше: ПРОЛИВ · 70 г` либо `последняя стадия` (`DC:1203`). */
export function nextLine(stages: readonly Stage[], idx: number, lang: Lang): string {
  const t = STR[lang];
  const nxt = stages[idx + 1];
  if (!nxt) return t.t_last_stage;
  const water = nxt[2] ? `${SEP}${nxt[2]} ${t.grams}` : '';
  return `${t.t_next_line}: ${stageName(nxt[0], lang)}${water}`;
}

/**
 * Подпись главной кнопки (`tBtnLabel`, `DC:1204`).
 *
 * Три случая помимо обычного «ДАЛЬШЕ»:
 *   - последняя стадия — явное завершение с сохранением;
 *   - следующая стадия нулевой длительности — кнопка называет само действие
 *     («РАЗМЕШАТЬ», «ОТКРЫТЬ КЛАПАН»): маркер не становится активной стадией и
 *     виден пользователю только здесь;
 *   - в паузе кнопка называет стадию, к которой возвращает.
 */
export function mainButtonLabel(
  stages: readonly Stage[],
  idx: number,
  lang: Lang,
  paused: boolean,
): string {
  const t = STR[lang];
  const nxt = stages[idx + 1];

  if (nxt?.[0] === 'drain') return t.t_to_drain;
  if (paused) return nxt ? stageName(nxt[0], lang) : t.t_done;
  if (idx >= stages.length - 1) return t.t_done;
  return nxt && nxt[1] === 0 ? stageName(nxt[0], lang) : t.t_next;
}

/**
 * Девайс в шапке таймера: у дрипа его нет — там стоит форма кофе; бренд «Hario»
 * срезается, потому что он занимает треть строки и ничего не различает
 * (`tBeanLine`, `DC:1207`).
 */
export function brewerLabel(form: BeanForm, device: DeviceRecord | null, lang: Lang): string {
  // Один формат имени на всё приложение — перегрузка `deviceLabel` (S-6).
  // Обёртка оставлена ради порядка аргументов, к которому привязаны тесты.
  return deviceLabel(form, lang, device);
}

/** `Ява Золотая · V60-02 · 94°` (`DC:1207`). */
export function beanLine(
  beanName: string | undefined,
  form: BeanForm,
  device: DeviceRecord | null,
  temp: number,
  lang: Lang,
): string {
  const t = STR[lang];
  return [beanName || t.entry_none, brewerLabel(form, device, lang), `${temp}${t.deg}`].join(SEP);
}
