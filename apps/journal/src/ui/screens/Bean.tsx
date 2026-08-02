/**
 * Карточка пачки — снимки, три числа и история этого зерна.
 *
 * Фото идут столбцом и в полную ширину, потому что на них смотрят: этикетка с
 * датой обжарки и составом — единственный источник правды о пачке, и мелкая
 * миниатюра его не заменяет (README:70). Первый снимок — лицо, дальше шов с
 * датой; порядок задаёт человек, приложение его не переставляет.
 *
 * Ниже — заваривания именно этой пачки. Это ответ на вопрос «что я с ней уже
 * делал», из-за которого карточка вообще существует: без него полка была бы
 * складом, а не журналом.
 */

import { useEffect, useRef } from 'react';

import { useNav } from '../../app/nav.js';
import { isoDate } from '../../data/freshness.js';
import { STR } from '../../data/strings.js';
import { useBean } from '../../db/repo/beans.js';
import { useEntriesForBean } from '../../db/repo/entries.js';
import { useLang } from '../../db/repo/settings.js';
import { beanName, formLabel, shortDate } from '../bean-format.js';
import { entryMark, entrySub } from '../entry-format.js';
import { EmptyState, InverseButton, ScreenHeader, Section, Tag } from '../components/index.js';
import { useJournalView } from './journal/view-store.js';
import { PhotoSlot } from './shelf/PhotoSlot.js';
import { useBeanView } from './shelf/bean-store.js';
import { beanGuard, beanStats, slotCount, slotPlaceholder } from './shelf/shelf-view.js';
import { useBrewSetup } from './brewing/brew-store.js';
import './shelf/shelf.css';

export function Bean() {
  const go = useNav((s) => s.go);
  const back = useNav((s) => s.back);
  const lang = useLang();
  const t = STR[lang];

  const beanId = useBeanView((s) => s.beanId);
  const bean = useBean(beanId);
  const entries = useEntriesForBean(beanId ?? '');
  const openEntry = useJournalView((s) => s.openEntry);

  /* Уходить ли назад, решает `beanGuard`: правило «пачки нет» ошибочно срабатывало
     на гонке двух запросов, поэтому оно вынесено в чистую функцию и покрыто
     тестом. Реф здесь — только память между кадрами. */
  const answered = useRef(false);
  const guard = beanGuard(beanId, bean, answered.current);
  answered.current = guard.answered;
  const gone = guard.gone;

  useEffect(() => {
    if (gone) back();
  }, [gone, back]);

  if (bean === undefined) return <section className="screen" data-screen="bean" />;

  const today = isoDate(new Date());
  const stats = beanStats(bean, lang, today);
  const slots = slotCount(bean.photos);

  const brewThis = () => {
    useBrewSetup.getState().setBean(bean.id);
    go('brew');
  };

  const openLog = (id: string) => {
    openEntry(id);
    go('detail');
  };

  return (
    <section className="screen" data-screen="bean">
      <ScreenHeader
        title={beanName(bean, lang)}
        plain
        right={<Tag label={formLabel(bean.form, lang)} />}
      />

      <div className="screen__body bj-bean">
        <div className="bj-bean__shots">
          {Array.from({ length: slots }, (_, i) => (
            <PhotoSlot
              key={bean.photos[i]?.path ?? `empty-${String(i)}`}
              photo={bean.photos[i] ?? null}
              placeholder={slotPlaceholder(i, lang)}
              size="full"
            />
          ))}
        </div>
        <div className="bj-bean__hint">{t.bean_photos_hint}</div>

        <div className="bj-bean__stats">
          {stats.map((stat) => (
            <div key={stat.label} className="bj-bean__stat">
              <div className="bj-bean__stat-label">{stat.label}</div>
              <div className="bj-bean__stat-value">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Дозу дрипа задал производитель — сетап её не спрашивает. */}
        {bean.form === 'drip' ? <div className="bj-bean__note">{t.bean_dose_fixed}</div> : null}

        <Section label={t.bean_brews} testId="bean-brews">
          {(entries ?? []).map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="bj-bean__brew"
              onClick={() => openLog(entry.id)}
            >
              <span className="bj-bean__brew-date">{shortDate(entry.date)}</span>
              <span className="bj-bean__brew-sub">{entrySub(entry, lang)}</span>
              <span className="bj-bean__brew-mark">{entryMark(entry, lang)}</span>
            </button>
          ))}
          {entries !== undefined && entries.length === 0 ? (
            <EmptyState text={t.bean_no_brews} />
          ) : null}
        </Section>

        <InverseButton size="lg" className="bj-bean__brew-btn" onClick={brewThis}>
          {t.home_brew}
        </InverseButton>
      </div>
    </section>
  );
}
