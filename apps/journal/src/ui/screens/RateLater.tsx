/**
 * «Оценка позже» — экран между завариванием и диагностикой.
 *
 * Он существует ровно ради одной мысли: кофе раскрывается остывая, и оценивать
 * его прямо сейчас необязательно. Поэтому «ПОЗЖЕ» — полноценный выход, а не
 * отказ: запись уже сохранена со статусом `pending` и ждёт на домашнем экране.
 *
 * Шапки нет намеренно — назад отсюда некуда, заваривание закончилось. Обе
 * кнопки сбрасывают стек на домашний экран (`rlOk`/`rlNow`, `DC:1304`), чтобы
 * «назад» из диагностики не возвращало в уже отработавший таймер.
 */

import { useNav } from '../../app/nav.js';
import { STR } from '../../data/strings.js';
import { useLang } from '../../db/repo/settings.js';
import { InverseButton } from '../components/index.js';
import './brewing/brewing.css';

export function RateLater() {
  const go = useNav((s) => s.go);
  const setTab = useNav((s) => s.setTab);
  const lang = useLang();
  const t = STR[lang];

  /*
   * Диагностика получает запись не параметром, а поиском: `usePendingEntry()`
   * отдаёт самую свежую ждущую оценки — ровно ту, которую только что записали.
   * Тот же путь работает с карточки «ОЦЕНКА ЖДЁТ» на домашнем экране, так что
   * второго механизма передачи не нужно.
   */
  const rateNow = () => {
    setTab('home');
    go('diag');
  };

  return (
    <section className="screen bj-rate" data-screen="rateLater">
      <div className="bj-rate__dot" />
      <div className="bj-rate__title">{t.rate_later_t}</div>
      <div className="bj-rate__sub">{t.rate_later_s}</div>

      <div className="bj-rate__actions">
        <InverseButton testId="rate-now" onClick={rateNow}>
          {t.rate_now}
        </InverseButton>
        <button type="button" className="bj-rate__later" onClick={() => setTab('home')}>
          {t.rate_later_btn}
        </button>
      </div>
    </section>
  );
}
