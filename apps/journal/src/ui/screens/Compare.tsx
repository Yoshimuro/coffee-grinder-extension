/**
 * Сравнение двух записей — пятнадцать строк, у которых подсвечены отличия.
 *
 * Экран ничего не решает и ничего не советует: он ставит два столбца рядом и
 * гасит всё, что совпало. Разница между двумя завариваниями — обычно одна-две
 * строки, и задача экрана в том, чтобы их было видно сразу.
 *
 * Дифф и порядок строк — в `journal/compare-rows.ts`; здесь только раскладка.
 * Там же лечится падение прототипа на записях-дегустациях (§9): пачки у них
 * нет, и `bean(a.bean).name` разыменовывал `undefined`.
 */

import { STR } from '../../data/strings.js';
import { useBean } from '../../db/repo/beans.js';
import { useEntry } from '../../db/repo/entries.js';
import { useDevice } from '../../db/repo/devices.js';
import { useLang } from '../../db/repo/settings.js';
import { EmptyState } from '../components/EmptyState.js';
import { ScreenHeader } from '../components/ScreenHeader.js';
import { compareHeading, compareRows } from './journal/compare-rows.js';
import { useJournalView } from './journal/view-store.js';
import './journal/journal.css';

export function Compare() {
  const lang = useLang();
  const t = STR[lang];
  const pair = useJournalView((s) => s.pair);

  const entryA = useEntry(pair?.[0]);
  const entryB = useEntry(pair?.[1]);
  const beanA = useBean(entryA?.bean);
  const beanB = useBean(entryB?.bean);
  const deviceA = useDevice(entryA?.device);
  const deviceB = useDevice(entryB?.device);

  if (!entryA || !entryB) {
    return (
      <div className="jr" data-screen="compare">
        <ScreenHeader title={t.log_compare} />
        <div className="jr__body">
          <EmptyState text={t.log_pick2} />
        </div>
      </div>
    );
  }

  const rows = compareRows(
    { entry: entryA, bean: beanA, device: deviceA },
    { entry: entryB, bean: beanB, device: deviceB },
    lang,
  );

  return (
    <div className="jr" data-screen="compare">
      <ScreenHeader title={t.log_compare} right={t.log_diff} />

      <div className="jr-cmp__head">
        <div className="jr-cmp__label" />
        <div className="jr-cmp__col">{compareHeading('a', entryA, lang)}</div>
        <div className="jr-cmp__col">{compareHeading('b', entryB, lang)}</div>
      </div>

      <div className="jr__body jr-cmp__body" data-hint="compare-rows">
        {rows.map((row) => (
          <div className="jr-cmp__row" key={row.label}>
            <div className="jr-cmp__label">{row.label}</div>
            <div className={row.diff ? 'jr-cmp__value jr-cmp__value--diff' : 'jr-cmp__value'}>
              {row.a}
            </div>
            <div className={row.diff ? 'jr-cmp__value jr-cmp__value--diff' : 'jr-cmp__value'}>
              {row.b}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
