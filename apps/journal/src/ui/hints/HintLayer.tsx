/**
 * Contextual first-use help. The highlighted element keeps its real action;
 * the surrounding UI stays available and blank space never advances a tip.
 * Explicit next/close controls handle explanatory steps. Using a highlighted
 * control pauses further help until the next screen visit.
 * Hint IDs remain persisted individually; the timer never receives a tip.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useNav } from '../../app/nav.js';
import type { Hint } from '../../data/hints.js';
import { STR } from '../../data/strings.js';
import { markHint, setHintsOn, useLang, useSettings } from '../../db/repo/settings.js';
import {
  type Box,
  CARD_ROOM,
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
  if (!element || element.closest('[data-hints-ready="false"]')) return null;
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
  const [usedScreen, setUsedScreen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(CARD_ROOM);

  const current = chain[at];

  /* Строкой, а не массивом: `useLiveQuery` отдаёт новый массив на каждый ответ
     базы, и эффект перезапускался бы вхолостую. */
  const shownKey = settings.hints.join('|');
  const { hintsOn, wheelMode } = settings;

  /* Смена экрана закрывает цепочку: подсвечивать зону, которой на новом экране
     нет, нечем, а «назад» посреди цепочки — обычное дело.
     Режим колеса (BJ-12) здесь по той же причине: КАРТА, ПОЛОТНО и СПИСОК —
     это разная разметка одного экрана, и цепочку надо пересобрать. Шаги, чьих
     якорей в новом режиме нет, отсеются сами — их зоны просто не найдутся. */
  useEffect(() => {
    setChain([]);
    setAt(0);
    setHole(null);
    setUsedScreen(false);
  }, [screen, wheelMode]);

  /* Старт цепочки. Пока она идёт, эффект молчит — иначе пометка показанного
     тут же перезапускала бы поиск. */
  useEffect(() => {
    if (chain.length > 0 || usedScreen) return;

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
  }, [screen, shownKey, hintsOn, wheelMode, chain.length, usedScreen]);

  // Keep the control's real action. After using it, pause help for this visit
  // so another hint cannot interrupt typing or the user's next action.
  useEffect(() => {
    if (!current) return;
    const zone = document.querySelector(current.selector);
    if (!zone) return;
    const onUse = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const control = event.target.closest('button, input, textarea, select, a[href], [role="button"]');
      if (
        !control || !zone.contains(control) ||
        control.matches(':disabled, [aria-disabled="true"]')
      ) return;
      void markHint(current.id);
      setChain([]);
      setAt(0);
      setHole(null);
      setUsedScreen(true);
    };
    document.addEventListener('click', onUse, true);
    return () => document.removeEventListener('click', onUse, true);
  }, [current]);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const measure = () => setCardHeight(Math.ceil(card.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    return () => observer.disconnect();
  }, [current, hole !== null]);

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
    let measureFrame = 0;
    const frame = requestAnimationFrame(() => {
      measureFrame = requestAnimationFrame(measure);
    });
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(measureFrame);
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      window.removeEventListener('scroll', measure, true);
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

  /* «ОТКЛЮЧИТЬ ПОДСКАЗКИ» ничего не помечает показанным: выключатель — не «я это
     прочитал», а «не показывай». Вернуть их можно строкой в настройках, и
     тогда всё, что не дочитано, покажется снова. */
  const hideAll = (): void => {
    void setHintsOn(false);
    setChain([]);
    setAt(0);
    setHole(null);
  };

  if (!current || !hole) return null;

  const anchor = cardAnchor(
    hole,
    { width: window.innerWidth, height: window.innerHeight },
    undefined,
    cardHeight,
  );
  const counter = stepCounter(at, chain.length);
  const last = at === chain.length - 1;

  return (
    <div
      className="bj-hint"
      data-testid="hint"
      role="region"
      aria-label={t.set_hints}
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

      <div
        ref={cardRef}
        className={`bj-hint__card bj-hint__card--${anchor.side}`}
        style={anchor.side === 'below' ? { top: `${String(anchor.offset)}px` } : { bottom: `${String(anchor.offset)}px` }}
      >
        <div className="bj-hint__label">{t.set_hints}</div>
        <p className="bj-hint__text" data-testid="hint-text">
          {t[current.key]}
        </p>
        <div className="bj-hint__foot">
          <span className="bj-hint__count">{counter}</span>
          <button type="button" className="bj-hint__next" data-testid="hint-next" onClick={next}>
            {last ? t.hint_done : t.hint_next}
          </button>
        </div>
        <button type="button" className="bj-hint__hide" data-testid="hint-hide" onClick={hideAll}>
          {t.hint_close}
        </button>
      </div>
    </div>
  );
}
