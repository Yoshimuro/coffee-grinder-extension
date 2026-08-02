/**
 * Таймер заваривания.
 *
 * Считает домен (`domain/timer.ts`), показывает `brewing/timer-view.ts`, экран
 * только тикает и раскладывает. Тик — интервал 250 мс, который двигает одно
 * число `now`; всё остальное — производные от него и от состояния таймера.
 * Прямых записей в DOM по id, которыми жил прототип (`DC:937-940`), здесь нет:
 * они были обходом лишнего `forceUpdate`, а не требованием.
 *
 * Часы не хранятся в сторе: состояние знает только `t0`/`s0`, а сколько
 * прошло — вопрос к `Date.now()` в момент отрисовки. Поэтому таймер переживает
 * сон вкладки и не накапливает дрейф интервала.
 */

import { useEffect, useState } from 'react';

import { useNav } from '../../app/nav.js';
import { STR } from '../../data/strings.js';
import { useBeans } from '../../db/repo/beans.js';
import { useDevices } from '../../db/repo/devices.js';
import { saveEntryWithDecrement } from '../../db/repo/entries.js';
import { useLang } from '../../db/repo/settings.js';
import { fmtT } from '../../domain/format.js';
import {
  type TimerState,
  canPause,
  elapsed,
  makeEntry,
  stageElapsed,
  useTimer,
} from '../../domain/timer.js';
import { awake } from '../../platform/awake.js';
import { useBrewSetup } from './brewing/brew-store.js';
import { brewSetup } from './brewing/brew-view.js';
import {
  beanLine,
  deviationLine,
  mainButtonLabel,
  nextLine,
  segments,
  stageCounter,
  stageTitle,
  targetLine,
  waterLine,
} from './brewing/timer-view.js';
import './brewing/brewing.css';

/** Шаг тика прототипа (`ensureIv`, `DC:931`). Секунды на экране от него ровные. */
const TICK_MS = 250;

export function Timer() {
  const go = useNav((s) => s.go);
  const back = useNav((s) => s.back);
  const lang = useLang();
  const t = STR[lang];

  const live = useTimer((s) => s.timer);
  const pause = useTimer((s) => s.pause);
  const advance = useTimer((s) => s.advance);
  const cancel = useTimer((s) => s.cancel);

  const setup = useBrewSetup();
  const beans = useBeans();
  const devices = useDevices();
  const bean = beans?.find((b) => b.id === setup.bean) ?? null;
  const device = devices?.find((d) => d.id === setup.device) ?? null;

  /* Последний кадр заваривания вместе с моментом, на который он посчитан:
     `advance()` обнуляет таймер сразу, а запись ещё пишется в базу — без этого
     снимка экран мигнул бы пустотой. */
  const [frozen, setFrozen] = useState<{ timer: TimerState; at: number } | null>(null);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [live]);

  /* «экран не гаснет» в шапке — обещание, и держит его платформенный слой:
     на телефоне это `FLAG_KEEP_SCREEN_ON`, в браузере — Screen Wake Lock.
     Блокировка живёт ровно столько, сколько живёт экран таймера: она снимается
     и по «ГОТОВО», и по «✕», и по возврату жестом — все три пути проходят через
     размонтирование. */
  useEffect(() => {
    void awake.enter();
    return () => {
      void awake.exit();
    };
  }, []);

  const view = live ?? frozen?.timer ?? null;
  const at = live ? now : (frozen?.at ?? now);

  /* Сюда можно попасть только со «СТАРТА»; если таймера всё же нет — уходим
     назад, а не показываем пустой экран. */
  useEffect(() => {
    if (!view) back();
  }, [view, back]);

  if (!view) return null;

  const stages = view.stages;
  const stageSec = stageElapsed(view, at);
  const paused = view.paused;

  const onMain = async () => {
    if (!live) return;

    /* Пачка нужна только последнему нажатию — оно строит запись. Пока база не
       ответила, это нажатие не делает ничего: сдвинуть таймер и не суметь
       записать заваривание значит его потерять. */
    const last = !paused && view.idx >= stages.length - 1;
    if (last && !bean) return;

    const closedAt = Date.now();
    const done = advance(closedAt);
    if (!done || !bean) return;

    setFrozen({ timer: live, at: closedAt });
    const { entry } = makeEntry({
      setup: brewSetup(setup, bean, device),
      bean,
      stages: done.rec,
      total: done.total,
      now: new Date(),
    });
    // Пачка идёт несписанная, с полки: списывает транзакция репозитория.
    await saveEntryWithDecrement(entry, bean);
    go('rateLater');
  };

  const onCancel = () => {
    cancel();
    back();
  };

  return (
    <section className="screen bj-timer" data-screen="timer">
      <div className="bj-timer__head">
        <button
          type="button"
          className="bj-timer__cancel"
          aria-label={STR[lang].back}
          onClick={onCancel}
        >
          ✕
        </button>
        <div className="bj-timer__bean">
          {beanLine(bean?.name, bean?.form ?? 'beans', device, setup.temp, lang)}
        </div>
        <div className="bj-timer__awake">{t.t_awake}</div>
      </div>

      <div className="bj-timer__elapsed">{fmtT(elapsed(view, at))}</div>
      <div className="bj-timer__target">{targetLine(stages, lang)}</div>

      <div className="bj-timer__segs">
        {segments(stages, view.idx, stageSec, paused).map((seg, i) => (
          <div
            // Стадии различаются только позицией в плане — она и есть ключ.
            key={i}
            className="bj-timer__seg"
            style={{ width: `${seg.width}%` }}
          >
            <div className="bj-timer__fill" style={{ width: `${seg.fill}%` }} />
          </div>
        ))}
      </div>

      <div className="bj-timer__stage">
        <div className="bj-timer__num">{stageCounter(stages, view.idx, lang, paused)}</div>
        <div className="bj-timer__name">{stageTitle(stages, view.idx, lang, paused)}</div>
        <div className="bj-timer__water">
          {waterLine(stages, view.idx, setup.water, lang, paused)}
        </div>
        <div className="bj-timer__dev">{deviationLine(stages, view.idx, stageSec, paused)}</div>
      </div>

      <div className="bj-timer__next">{nextLine(stages, view.idx, lang)}</div>

      <div className="bj-timer__spacer" />

      {canPause(view) ? (
        <button
          type="button"
          className="bj-timer__pause"
          data-testid="timer-pause"
          onClick={() => pause()}
        >
          {t.t_pause}
        </button>
      ) : null}

      <button
        type="button"
        className="bj-timer__main"
        data-testid="timer-main"
        onClick={() => void onMain()}
      >
        {mainButtonLabel(stages, view.idx, lang, paused)}
      </button>
    </section>
  );
}
