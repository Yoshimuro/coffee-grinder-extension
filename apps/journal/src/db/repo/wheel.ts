/**
 * Эффективное колесо вкусов и мутаторы его правок.
 *
 * Единственная точка, где UI берёт колесо: экраны не импортируют `WHEEL`
 * напрямую, а спрашивают {@link useWheel}. Хук накладывает правки из настроек
 * (ключ `wheelEdits`) на встроенную базу; без правок отдаётся база как есть.
 *
 * Мутаторы ниже — транзакции read-modify-write по образцу `markHint`: список
 * читается и пишется двумя действиями, и между ними успевает пройти следующий
 * тап. Правила, защищающие историю журнала:
 *   - id никогда не переименовывается: `renameWheelNode` меняет подписи;
 *   - встроенный узел не удаляется, а скрывается;
 *   - пользовательский дескриптор удаляется физически только пока на него не
 *     ссылается ни одна запись — иначе тоже скрывается, и его имя продолжает
 *     жить в списке правок (могильник для `nameOf`).
 */

import { useMemo } from 'react';

import { WHEEL, type WheelSet } from '../../data/wheel.js';
import {
  CUSTOM_PREFIX,
  type WheelEdit,
  composeWheel,
  effectiveWheelSet,
  hasWheelId,
} from '../../data/wheel-edits.js';
import { type BrewJournalDB, db, getSetting, putSetting } from '../schema.js';
import { useSetting } from './settings.js';

export type { WheelEdit, WheelSet };

/** Колесо с учётом пользовательских правок. Живое: правка обновляет экраны. */
export function useWheel(): WheelSet {
  const edits = useSetting('wheelEdits');
  return useMemo(() => effectiveWheelSet(edits), [edits]);
}

/* ── Чеканка пользовательских id ─────────────────────────────────────────── */

/* Гост 7.79-2000 здесь не нужен: слаг — внутренний ключ, его никто не читает.
   Таблица покрывает русский ввод; всё непокрытое станет дефисом. */
const TRANSLIT: Readonly<Record<string, string>> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

/** `Крем-брюле` → `krem-bryule`. Пустому имени отвечает `node`. */
export function slugify(name: string): string {
  const out = [...name.toLowerCase()]
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return out || 'node';
}

/**
 * Свободный id с префиксом `u-`: занятый слаг добивается суффиксом `-2`, `-3`…
 * Префикс — гарантия, что будущий встроенный id не столкнётся с уже
 * существующим пользовательским.
 */
export function newCustomId(name: string, taken: (id: string) => boolean): string {
  const base = CUSTOM_PREFIX + slugify(name);
  if (!taken(base)) return base;
  for (let i = 2; ; i++) {
    const id = `${base}-${i}`;
    if (!taken(id)) return id;
  }
}

/* ── Мутаторы ────────────────────────────────────────────────────────────── */

async function readEdits(database: BrewJournalDB): Promise<WheelEdit[]> {
  return (await getSetting('wheelEdits', database)) ?? [];
}

/** Полное дерево (правки без скрытий) — против него проверяются id и родители. */
function fullTree(edits: readonly WheelEdit[]) {
  return composeWheel(WHEEL, edits.filter((e) => e.op !== 'hide'));
}

/**
 * Добавляет пользовательский узел: подкатегорию в категорию или дескриптор в
 * подкатегорию. Введённое имя ложится в оба языка — второй правится
 * переименованием, когда дойдут руки.
 *
 * Возвращает id нового узла или `null`: пустое имя либо родитель, которого в
 * колесе (уже) нет.
 */
export async function addWheelNode(
  kind: 'sub' | 'desc',
  parent: string,
  name: string,
  database: BrewJournalDB = db,
): Promise<string | null> {
  const label = name.trim();
  if (!label) return null;

  return database.transaction('rw', database.settings, async () => {
    const edits = await readEdits(database);
    const full = fullTree(edits);
    if (!hasWheelId(full, parent)) return null;

    const id = newCustomId(label, (x) => hasWheelId(full, x));
    const edit: WheelEdit =
      kind === 'desc'
        ? { op: 'add-desc', id, sub: parent, ru: label, en: label }
        : { op: 'add-sub', id, cat: parent, ru: label, en: label };
    await putSetting('wheelEdits', [...edits, edit], database);
    return id;
  });
}

/**
 * Меняет подписи узла, id нетронут. Пользовательский узел правится прямо в его
 * add-правке; для встроенного прежнее переименование заменяется новым — правки
 * не копятся.
 */
export async function renameWheelNode(
  target: string,
  ru: string,
  en: string,
  database: BrewJournalDB = db,
): Promise<void> {
  await database.transaction('rw', database.settings, async () => {
    const edits = await readEdits(database);

    let patched = false;
    const next: WheelEdit[] = edits.map((e) => {
      if ((e.op === 'add-desc' || e.op === 'add-sub' || e.op === 'add-cat') && e.id === target) {
        patched = true;
        return { ...e, ru, en };
      }
      return e;
    });

    if (patched) {
      await putSetting('wheelEdits', next, database);
      return;
    }

    const cleaned = next.filter((e) => !(e.op === 'rename' && e.target === target));
    cleaned.push({ op: 'rename', target, ru, en });
    await putSetting('wheelEdits', cleaned, database);
  });
}

/**
 * Убирает узел из колеса.
 *
 * Пользовательский дескриптор, на который не ссылается ни одна запись, удаляется
 * физически — вместе с его переименованиями. Всё остальное (встроенные узлы,
 * использованные пользовательские, целые подкатегории) скрывается: имя и цвет
 * остаются доступны истории через цепочку fallback.
 */
export async function hideWheelNode(target: string, database: BrewJournalDB = db): Promise<void> {
  await database.transaction('rw', database.settings, database.entries, async () => {
    const edits = await readEdits(database);

    const added = edits.find((e) => e.op === 'add-desc' && e.id === target);
    if (added) {
      const used = await database.entries
        .filter((e) => e.desc.some(([id]) => id === target))
        .count();
      if (used === 0) {
        await putSetting(
          'wheelEdits',
          edits.filter((e) => e !== added && !(e.op === 'rename' && e.target === target)),
          database,
        );
        return;
      }
    }

    if (edits.some((e) => e.op === 'hide' && e.target === target)) return;
    await putSetting('wheelEdits', [...edits, { op: 'hide', target }], database);
  });
}

/**
 * Отменяет одну правку — убирает её из списка. Отмена скрытия возвращает узел,
 * отмена добавления убирает его из колеса (имя из могильника при этом
 * пропадает — на это идёт сам человек, нажимая отмену в настройках).
 */
export async function undoWheelEdit(edit: WheelEdit, database: BrewJournalDB = db): Promise<void> {
  const key = JSON.stringify(edit);
  await database.transaction('rw', database.settings, async () => {
    const edits = await readEdits(database);
    const at = edits.findIndex((e) => JSON.stringify(e) === key);
    if (at < 0) return;
    await putSetting('wheelEdits', edits.filter((_, i) => i !== at), database);
  });
}

/** «СБРОСИТЬ ПРАВКИ»: колесо возвращается к встроенной базе. */
export async function resetWheelEdits(database: BrewJournalDB = db): Promise<void> {
  await putSetting('wheelEdits', [], database);
}
