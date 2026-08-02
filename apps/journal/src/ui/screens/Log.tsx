/**
 * Журнал — лента записей с фильтрами и режимом сравнения.
 *
 * Режим сравнения — не отдельный экран, а состояние ленты: чекбоксы слева,
 * подсказка «выбери два заваривания» сверху, кнопка внизу. Держим последние
 * две отметки (`slice(-2)`, `DC:1327`): третий тап не ругается, а вытесняет
 * самую старую — так не нужно ни объяснять лимит, ни блокировать строки.
 *
 * Фильтр и режим сравнения живут в состоянии экрана, а не в сторе: обе вещи —
 * это «как я сейчас смотрю ленту», и уносить их с собой на другой экран не
 * нужно. Через стор передаются только результаты — id записи и пара.
 */

import { useState } from 'react';

import { useNav } from '../../app/nav.js';
import { STR } from '../../data/strings.js';
import { colOf, nameOf } from '../../data/wheel.js';
import { useBeans } from '../../db/repo/beans.js';
import { ALL_ENTRIES, type LogFilter, filterKey, useEntries } from '../../db/repo/entries.js';
import { useDevices } from '../../db/repo/devices.js';
import { useLang } from '../../db/repo/settings.js';
import { Chip, ChipRow } from '../components/Chip.js';
import { EmptyState } from '../components/EmptyState.js';
import { InverseButton } from '../components/InverseButton.js';
import { ScreenHeader } from '../components/ScreenHeader.js';
import { entryMark, entrySub, entryTitle } from '../entry-format.js';
import { isPending, shortDate } from './journal/format.js';
import { filterLabel, logFilters } from './journal/log-filters.js';
import { orderPair, useJournalView } from './journal/view-store.js';
import './journal/journal.css';

export function Log() {
  const lang = useLang();
  const t = STR[lang];
  const go = useNav((s) => s.go);
  const openEntry = useJournalView((s) => s.openEntry);
  const openPair = useJournalView((s) => s.openPair);

  const [filter, setFilter] = useState<LogFilter>(ALL_ENTRIES);
  const [cmpMode, setCmpMode] = useState(false);
  const [cmpSel, setCmpSel] = useState<string[]>([]);

  const entries = useEntries(filter);
  const beans = useBeans() ?? [];
  const devices = useDevices() ?? [];

  const chips = logFilters(beans);
  const activeKey = filterKey(filter);

  /* Отметки переживают смену фильтра, но кнопка появляется, только когда обе
     записи видны в ленте: иначе она вела бы в сравнение с пустой колонкой. */
  const chosen = cmpSel
    .map((id) => (entries ?? []).find((e) => e.id === id))
    .filter((e) => e !== undefined);

  function toggleCompare(): void {
    setCmpMode((on) => !on);
    setCmpSel([]);
  }

  function tapRow(id: string): void {
    if (!cmpMode) {
      openEntry(id);
      go('detail');
      return;
    }
    setCmpSel((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id].slice(-2)));
  }

  function openCompare(): void {
    const [a, b] = chosen;
    if (!a || !b) return;
    openPair(orderPair(a, b));
    go('compare');
  }

  return (
    <div className="jr jr--root" data-screen="log">
      <ScreenHeader
        title={t.log_title}
        back={false}
        right={
          <span className="jr-log__head">
            <InverseButton className="jr-log__brew" onClick={() => go('brew')}>
              {t.home_brew}
            </InverseButton>
            <button
              type="button"
              className={cmpMode ? 'jr-log__cmp jr-log__cmp--on' : 'jr-log__cmp'}
              data-testid="log-compare"
              aria-pressed={cmpMode}
              onClick={toggleCompare}
            >
              {t.log_compare}
            </button>
          </span>
        }
      />

      <div className="jr-log__filters" data-hint="log-filters">
        <ChipRow scroll>
          {chips.map((f) => {
            const key = filterKey(f);
            return (
              <Chip
                key={key}
                label={filterLabel(f, lang, beans)}
                active={key === activeKey}
                onClick={() => setFilter(f)}
              />
            );
          })}
        </ChipRow>
      </div>

      {cmpMode ? <div className="jr-log__pick2">{t.log_pick2}</div> : null}

      <div className="jr__body jr-log__list">
        {entries !== undefined && entries.length === 0 ? (
          <EmptyState text={t.home_empty} />
        ) : null}

        {(entries ?? []).map((entry) => {
          const bean = beans.find((b) => b.id === entry.bean);
          const device = devices.find((d) => d.id === entry.device);
          const mark = entryMark(entry, lang);

          return (
            <button
              type="button"
              key={entry.id}
              className="jr-row"
              data-testid="log-row"
              onClick={() => tapRow(entry.id)}
            >
              {cmpMode ? (
                <span
                  className={
                    cmpSel.includes(entry.id) ? 'jr-row__box jr-row__box--on' : 'jr-row__box'
                  }
                />
              ) : null}

              <span className="jr-row__when">
                <span className="jr-row__date">{shortDate(entry.date)}</span>
                <span className="jr-row__time">{entry.time}</span>
              </span>

              <span className="jr-row__main">
                <span className="jr-row__title">{entryTitle(entry, lang, { bean, device })}</span>
                <span className="jr-row__sub">{entrySub(entry, lang)}</span>
                {entry.desc.length > 0 ? (
                  <span className="jr-row__desc">
                    {entry.desc.map(([id]) => (
                      <span className="jr-dot" key={id}>
                        <span className="jr-dot__mark" style={{ background: colOf(id) }} />
                        {nameOf(id, lang)}
                      </span>
                    ))}
                  </span>
                ) : null}
              </span>

              <span className="jr-row__right">
                {mark ? <span className="jr-row__mark">{mark}</span> : null}
                {isPending(entry) ? (
                  <span className="jr-row__pending">{t.log_pending}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {cmpMode && chosen.length === 2 ? (
        <div className="jr-log__foot">
          <InverseButton testId="log-compare-open" onClick={openCompare}>{`${t.log_compare} →`}</InverseButton>
        </div>
      ) : null}
    </div>
  );
}
