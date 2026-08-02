/**
 * Колесо вкусов — экран, ради которого приложение и затевалось.
 *
 * Три уровня одного кольца: девять категорий, подкатегории выбранной, листья
 * выбранной подкатегории. Вглубь — тап по сектору, наверх — тап по центру,
 * вбок — крошки. Смена уровня не перелистывает экран, а «приближает» кольцо:
 * узел пересоздаётся по смене `key`, и CSS-анимация играет заново (§8.4).
 *
 * Остановиться можно на любом уровне — «фруктовое» тоже ответ, и кнопка
 * «+ <имя>» кладёт в набор саму категорию (README:59). Поэтому выбранное
 * хранится строками id без указания глубины: `nameOf`/`colOf` знают все три.
 *
 * Собственного состояния у экрана ровно два поля — путь и направление зума.
 * Набранное живёт в сторе оценки вместе со шкалами и заметкой диагностики: по
 * «ГОТОВО» человек возвращается на диагностику, и терять там нечего.
 */

import { useMemo, useState } from 'react';

import { useNav } from '../../app/nav.js';
import { STR } from '../../data/strings.js';
import { colOf, nameOf } from '../../data/wheel.js';
import { useDoneEntries } from '../../db/repo/entries.js';
import { useLang } from '../../db/repo/settings.js';
import { ScreenHeader } from '../components/ScreenHeader.js';
import { Tag } from '../components/Tag.js';
import { useRate } from './journal/rate-store.js';
import { WheelSvg } from './wheel/WheelSvg.js';
import {
  type WheelItem,
  addHereTarget,
  crumbs,
  memorySet,
  pathInto,
  pathUp,
  wheelItems,
} from './wheel/wheel-view.js';
import './wheel/wheel.css';

/** Направление зума: вглубь или наверх. */
type Dir = 1 | -1;

export function Wheel() {
  const lang = useLang();
  const t = STR[lang];
  const back = useNav((s) => s.back);

  const picked = useRate((s) => s.picked);
  const togglePick = useRate((s) => s.togglePick);
  const setPickIntensity = useRate((s) => s.setPickIntensity);
  const removePick = useRate((s) => s.removePick);

  const [path, setPath] = useState<string[]>([]);
  const [dir, setDir] = useState<Dir>(1);

  /* Память колеса — живая: сохранённая оценка проявляет точки без перезахода
     на экран. `undefined` — база ещё не ответила, точек пока нет. */
  const done = useDoneEntries();
  const memory = useMemo(() => memorySet(done ?? []), [done]);

  const items = useMemo(() => wheelItems(path, lang), [path, lang]);
  const pickedIds = useMemo(() => new Set(picked.map(([id]) => id)), [picked]);
  const trail = crumbs(path, lang);
  const addHere = addHereTarget(path, picked);

  function tap(item: WheelItem): void {
    if (item.leaf) {
      togglePick(item.id);
      return;
    }
    setPath(pathInto(path, item));
    setDir(1);
  }

  function up(): void {
    if (path.length === 0) return;
    setPath(pathUp(path));
    setDir(-1);
  }

  /** Крошки и «наверх» ходят в одну сторону — отсюда общий `dir: -1`. */
  function jump(depth: number): void {
    if (depth === path.length) return;
    setPath(path.slice(0, depth));
    setDir(-1);
  }

  return (
    <div className="bj-wheel" data-screen="wheel">
      <ScreenHeader
        title={t.wheel_title}
        right={
          <button type="button" className="bj-wheel__done" data-testid="wheel-done" onClick={back}>
            {t.wheel_done}
          </button>
        }
      />

      <div className="bj-wheel__crumbs">
        {trail.map((crumb, i) => (
          <button
            type="button"
            key={crumb.key}
            className={
              crumb.current ? 'bj-wheel__crumb bj-wheel__crumb--current' : 'bj-wheel__crumb'
            }
            data-testid={`wheel-crumb-${String(crumb.depth)}`}
            onClick={() => {
              jump(crumb.depth);
            }}
          >
            {i === 0 ? crumb.label : ` / ${crumb.label}`}
          </button>
        ))}

        {addHere === null ? null : (
          <button
            type="button"
            className="bj-wheel__add"
            data-testid="wheel-add-here"
            onClick={() => {
              togglePick(addHere);
            }}
          >
            {`+ ${nameOf(addHere, lang)}`}
          </button>
        )}
      </div>

      <div className="bj-wheel__stage">
        {/*
          Ключ — сам путь: он меняется ровно тогда, когда меняется уровень, и
          пересозданный узел проигрывает анимацию с нуля. Классом отличаются
          только кейфреймы, длительность и кривая у обоих направлений общие.
        */}
        <div
          key={path.join('/') || 'root'}
          className={dir > 0 ? 'bj-wheel__zoom' : 'bj-wheel__zoom bj-wheel__zoom--out'}
        >
          <WheelSvg
            items={items}
            path={path}
            picked={pickedIds}
            memory={memory}
            lang={lang}
            onTap={tap}
            onUp={up}
          />
        </div>
      </div>

      <div className="bj-wheel__hint">{t.wheel_hint}</div>

      <div className="bj-wheel__foot">
        <div className="bj-wheel__foot-label">
          {`${t.wheel_picked} ${picked.length > 0 ? String(picked.length) : ''}`}
          <span className="bj-wheel__foot-note">{` · ${t.wheel_intensity} — ${t.wheel_tap_tag}`}</span>
        </div>

        <div className="bj-wheel__picked" data-testid="wheel-picked">
          {picked.length === 0 ? <div className="bj-wheel__empty">{t.wheel_empty}</div> : null}
          {picked.map(([id, intensity]) => (
            <Tag
              key={id}
              label={nameOf(id, lang)}
              caps={false}
              intensity={intensity}
              borderColor={colOf(id, 0.8)}
              dotColor={colOf(id)}
              onCycle={(next) => {
                setPickIntensity(id, next);
              }}
              onRemove={() => {
                removePick(id);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
