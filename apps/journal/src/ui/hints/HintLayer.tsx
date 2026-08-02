/**
 * Слой подсказок первого входа (BJ-10).
 *
 * Один компонент на всё приложение: он смотрит, на каком экране человек стоит,
 * какие подсказки этого экрана ещё не показаны, и — когда зона появилась в
 * DOM — затемняет экран, оставляя её в вырезе.
 *
 * Три решения, которые стоит знать, прежде чем править:
 *
 * 1. **Зона ищется селектором, а не ref'ом.** Половина зон уже помечена
 *    `data-testid` ради e2e; заводить второй механизм разметки ради подсветки
 *    не за чем, а `ref` пришлось бы прокидывать через компоненты, которые о
 *    подсказках знать не должны.
 * 2. **Опрос, а не наблюдатель.** Зона может появиться позже экрана — карточка
 *    «оценка ждёт» после ответа базы, кнопка «+ имя» на колесе после захода
 *    вглубь. Дешёвый `querySelector` по двум-трём селекторам раз в
 *    {@link POLL_MS} стоит меньше, чем `MutationObserver` на всё дерево, и не
 *    срабатывает на каждый тик таймера.
 * 3. **Показанное пишется по шагам.** Свернул приложение на середине цепочки —
 *    прочитанное останется прочитанным, а непоказанное дождётся следующего
 *    захода. Цепочка при этом фиксируется в состоянии, поэтому счётчик «2 / 3»
 *    не пересчитывается на ходу.
 *
 * Таймер намеренно не имеет подсказок: там идёт заваривание, и затемнение
 * экрана стоило бы человеку секунд.
 */

import { useCallback, useEffect, useState } from 'react';

import { useNav } from '../../app/nav.js';
import type { Hint } from '../../data/hints.js';
import { STR } from '../../data/strings.js';
import { markHint, setHintsOn, useLang, useSettings } from '../../db/repo/settings.js';
import {
  type Box,
  cardAnchor,
  holeBox,
  isVisibleBox,
  pendingHints,
  stepCounter,
} from './hint-view.js';
import './hints.css';

/** Пауза перед первой попыткой: экраны ждут ответа базы, зоны — вёрстки. */
const FIRST_TRY_MS = 450;

/** Как часто проверять, не появилась ли зона. */
const POLL_MS = 700;

function boxOf(element: Element): Box {
  const rect = element.getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

/** Зона подсказки, если она сейчас на экране и что-то занимает. */
function findZone(selector: string): Box | null {
  const element = document.querySelector(selector);
  if (!element) return null;
  const box = boxOf(element);
  return isVisibleBox(box) ? box : null;
}

export function HintLayer() {
  const screen = useNav((s) => s.screen);
  const lang = useLang();
  const t = STR[lang];
  const settings = useSettings();

  /* Цепочка фиксируется на старте: подсказки по ходу помечаются показанными, и
     без снимка счётчик «2 / 3» пересчитывался бы под пальцем. */
  const [chain, setChain] = useState<Hint[]>([]);
  const [at, setAt] = useState(0);
  const [hole, setHole] = useState<Box | null>(null);

  const current = chain[at];

  /* Строкой, а не массивом: `useLiveQuery` отдаёт новый массив на каждый ответ
     базы, и эффект перезапускался бы вхолостую. */
  const shownKey = settings.hints.join('|');
  const { hintsOn } = settings;

  /* Смена экрана закрывает цепочку: подсвечивать зону, которой на новом экране
     нет, нечем, а «назад» посреди цепочки — обычное дело. */
  useEffect(() => {
    setChain([]);
    setAt(0);
    setHole(null);
  }, [screen]);

  /* Старт цепочки. Пока она идёт, эффект молчит — иначе пометка показанного
     тут же перезапускала бы поиск. */
  useEffect(() => {
    if (chain.length > 0) return;

    const pending = pendingHints(screen, shownKey === '' ? [] : shownKey.split('|'), hintsOn);
    if (pending.length === 0) return;

    const tryStart = (): void => {
      const ready = pending.filter((hint) => findZone(hint.selector) !== null);
      if (ready.length === 0) return;
      setChain(ready);
      setAt(0);
    };

    const first = setTimeout(tryStart, FIRST_TRY_MS);
    const poll = setInterval(tryStart, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(poll);
    };
  }, [screen, shownKey, hintsOn, chain.length]);

  /* Замер активного шага. Зона может лежать ниже сгиба — сначала подводим её к
     середине экрана, и только потом меряем: иначе вырез встал бы по старым
     координатам. */
  useEffect(() => {
    if (!current) return;

    const element = document.querySelector(current.selector);
    if (!element) {
      // Зона исчезла между стартом и показом — закрываем цепочку молча, ничего
      // не помечая: неверно подсвеченный кусок хуже отсутствующей подсказки.
      setChain([]);
      setAt(0);
      setHole(null);
      return;
    }

    element.scrollIntoView({ block: 'center', inline: 'nearest' });

    const measure = (): void => {
      setHole(holeBox(boxOf(element), { width: window.innerWidth, height: window.innerHeight }));
    };

    /* Два кадра: первый отдаёт браузеру прокрутку, второй меряет уже приехавшее. */
    const frame = requestAnimationFrame(() => requestAnimationFrame(measure));
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, [current]);

  const next = useCallback((): void => {
    if (!current) return;
    void markHint(current.id);
    if (at + 1 < chain.length) {
      setAt(at + 1);
      setHole(null);
      return;
    }
    setChain([]);
    setAt(0);
    setHole(null);
  }, [current, at, chain.length]);

  /* «СКРЫТЬ ПОДСКАЗКИ» ничего не помечает показанным: выключатель — не «я это
     прочитал», а «не показывай». Вернуть их можно строкой в настройках, и
     тогда всё, что не дочитано, покажется снова. */
  const hideAll = (): void => {
    void setHintsOn(false);
    setChain([]);
    setAt(0);
    setHole(null);
  };

  if (!current || !hole) return null;

  const anchor = cardAnchor(hole, { width: window.innerWidth, height: window.innerHeight });
  const counter = stepCounter(at, chain.length);
  const last = at === chain.length - 1;

  return (
    <div
      className="bj-hint"
      data-testid="hint"
      role="dialog"
      aria-modal="true"
      aria-label={t.set_hints}
      onClick={next}
    >
      <div
        className="bj-hint__hole"
        style={{
          left: `${String(hole.left)}px`,
          top: `${String(hole.top)}px`,
          width: `${String(hole.width)}px`,
          height: `${String(hole.height)}px`,
        }}
      />

      {/* Полоса идёт до карточки: они соседи, и при столкновении наверху
          обязана оказаться карточка, а не выключатель. */}
      <button
        type="button"
        className="bj-hint__hide"
        data-testid="hint-hide"
        onClick={(e) => {
          // Иначе тап уехал бы в «дальше» на подложке и закрыл не то.
          e.stopPropagation();
          hideAll();
        }}
      >
        {t.hint_close}
      </button>

      <div
        className={`bj-hint__card bj-hint__card--${anchor.side}`}
        style={anchor.side === 'below' ? { top: `${String(anchor.offset)}px` } : { bottom: `${String(anchor.offset)}px` }}
      >
        <p className="bj-hint__text" data-testid="hint-text">
          {t[current.key]}
        </p>
        <div className="bj-hint__foot">
          <span className="bj-hint__count">{counter}</span>
          <button type="button" className="bj-hint__next" data-testid="hint-next" onClick={next}>
            {last ? t.hint_done : t.hint_next}
          </button>
        </div>
      </div>
    </div>
  );
}
