/**
 * Домашний экран — вариант C (README:25).
 *
 * Из трёх вариантов прототипа выбран самый пустой, и это выбор, а не экономия:
 * дом нужен, чтобы начать заваривание за один тап и увидеть, что было. Витрина
 * с фото пачки (вариант B) и сводка полки (вариант A) отвечают на вопросы,
 * которых утром никто не задаёт.
 *
 * Порядок сверху вниз — по срочности: чашка, которая уже остыла и ждёт оценки;
 * заваривание; лента последних пяти. Карточка «оценка ждёт» стоит над кнопками
 * именно поэтому — она про то, что уже сделано и вот-вот выветрится из памяти.
 */

import { useNav } from '../../app/nav.js';
import { isoDate } from '../../data/freshness.js';
import { STR } from '../../data/strings.js';
import { useBeans } from '../../db/repo/beans.js';
import { useDevices } from '../../db/repo/devices.js';
import { useEntries, usePendingEntry } from '../../db/repo/entries.js';
import { useLang } from '../../db/repo/settings.js';
import { shortDate } from '../bean-format.js';
import { EmptyState, Section } from '../components/index.js';
import { entryMark, entrySub, entryTitle } from '../entry-format.js';
import { feedEntries, pendingTitle, pendingWhen, todayLine } from './home/home-view.js';
import { useRate } from './journal/rate-store.js';
import { useJournalView } from './journal/view-store.js';
import './Home.css';

export function Home() {
  const go = useNav((s) => s.go);
  const lang = useLang();
  const t = STR[lang];

  const entries = useEntries();
  const pending = usePendingEntry();
  const beans = useBeans();
  const devices = useDevices();
  const openEntry = useJournalView((s) => s.openEntry);

  const today = isoDate(new Date());
  const feed = feedEntries(entries);

  /** Пачка и девайс записи — заголовок собирается как `Пачка · Девайс`. */
  const refsOf = (bean: string | null, device: string | null) => ({
    bean: beans?.find((b) => b.id === bean),
    device: devices?.find((d) => d.id === device),
  });

  /* Оценка ждущей записи открывается явно. Стор умеет подхватить её и сам, но
     у `startRating` есть второй смысл — сбросить набор предыдущей сессии,
     чтобы чужие шкалы и заметка не приехали на новую чашку. */
  const ratePending = () => {
    if (!pending) return;
    useRate.getState().startRating(pending.id);
    go('diag');
  };

  /* «ОЦЕНИТЬ ЧАШКУ» — дегустация вне журнала: кофе выпит не дома, записи под
     него нет. Без явного `startTasting` кнопка открыла бы оценку ждущего
     заваривания — это контракт из отчёта G3. */
  const taste = () => {
    useRate.getState().startTasting();
    go('diag');
  };

  const openDetail = (id: string) => {
    openEntry(id);
    go('detail');
  };

  /** ✎ в строке: та же запись, но сразу в режиме правки (BJ-12). */
  const editEntry = (id: string) => {
    openEntry(id, true);
    go('detail');
  };

  return (
    <section className="screen" data-screen="home">
      <header className="bj-head bj-head--root home-head">
        <h1 className="bj-head__title home-head__title">{t.appName.toUpperCase()}</h1>
        <div className="bj-head__right">{todayLine(today)}</div>
      </header>

      <div className="screen__body home-body">
        {pending ? (
          <div className="home-pending" data-testid="home-pending">
            <div className="home-pending__main">
              <div className="home-pending__title">
                {pendingTitle(pending, lang, refsOf(pending.bean, pending.device))}
              </div>
              <div className="home-pending__when">{pendingWhen(pending, lang, today)}</div>
            </div>
            <button
              type="button"
              className="home-pending__rate"
              data-testid="home-rate"
              onClick={ratePending}
            >
              {t.home_rate}
            </button>
          </div>
        ) : null}

        <div className="home-cta">
          <button
            type="button"
            className="home-cta__brew"
            data-testid="home-brew"
            onClick={() => go('brew')}
          >
            {t.home_brew}
          </button>
          <button
            type="button"
            className="home-cta__conv"
            data-testid="home-conv"
            aria-label={t.home_convert}
            onClick={() => go('conv')}
          >
            ⇄
          </button>
        </div>

        <button type="button" className="home-taste" data-testid="home-taste" onClick={taste}>
          {t.home_taste}
        </button>

        <Section label={t.log_title}>
          {feed.map((entry) => (
            /* Как и в журнале: строка — контейнер, открывает её внутренняя
               кнопка, а ✎ стоит рядом и уводит в правку. */
            <div key={entry.id} className="home-feed__row">
              <button
                type="button"
                className="home-feed__open"
                data-testid="home-feed-row"
                onClick={() => openDetail(entry.id)}
              >
                <span className="home-feed__date">{shortDate(entry.date)}</span>
                <span className="home-feed__main">
                  <span className="home-feed__title">
                    {entryTitle(entry, lang, refsOf(entry.bean, entry.device))}
                  </span>
                  <span className="home-feed__sub">{entrySub(entry, lang)}</span>
                </span>
                <span className="home-feed__mark">{entryMark(entry, lang)}</span>
              </button>

              <button
                type="button"
                className="bj-pencil"
                data-testid="home-feed-edit"
                aria-label={`${t.log_edit}: ${entryTitle(entry, lang, refsOf(entry.bean, entry.device))}`}
                onClick={(e) => {
                  e.stopPropagation();
                  editEntry(entry.id);
                }}
              >
                ✎
              </button>
            </div>
          ))}

          {/* Журнал пуст — приглашение заварить, а не сообщение об отсутствии. */}
          {entries !== undefined && entries.length === 0 ? (
            <EmptyState text={t.home_empty} onClick={() => go('brew')} />
          ) : null}
        </Section>
      </div>
    </section>
  );
}
