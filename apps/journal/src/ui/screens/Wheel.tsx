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
import { addWheelNode, hideWheelNode, renameWheelNode, useWheel } from '../../db/repo/wheel.js';
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
  const ws = useWheel();
  const t = STR[lang];
  const back = useNav((s) => s.back);

  const picked = useRate((s) => s.picked);
  const togglePick = useRate((s) => s.togglePick);
  const setPickIntensity = useRate((s) => s.setPickIntensity);
  const removePick = useRate((s) => s.removePick);

  const [path, setPath] = useState<string[]>([]);
  const [dir, setDir] = useState<Dir>(1);

  /* Режим правки (BJ-11). Всё его состояние — экранное: правки пишутся в базу
     сразу, и уносить с экрана нечего. Смена уровня сбрасывает недописанное —
     строки списка на новом уровне другие. */
  const [editing, setEditing] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [hiding, setHiding] = useState<string | null>(null);
  const [addVal, setAddVal] = useState('');

  function resetEditRows(): void {
    setRenaming(null);
    setHiding(null);
    setAddVal('');
  }

  /* Память колеса — живая: сохранённая оценка проявляет точки без перезахода
     на экран. `undefined` — база ещё не ответила, точек пока нет. */
  const done = useDoneEntries();
  const memory = useMemo(() => memorySet(done ?? []), [done]);

  const items = useMemo(() => wheelItems(path, lang, ws), [path, lang, ws]);
  const pickedIds = useMemo(() => new Set(picked.map(([id]) => id)), [picked]);
  const trail = crumbs(path, lang, ws);
  const addHere = addHereTarget(path, picked);

  function tap(item: WheelItem): void {
    if (item.leaf) {
      /* В режиме правки лист не выбирается: выбор — дело оценки, а сюда пришли
         за структурой. Правится он в списке под колесом. */
      if (!editing) togglePick(item.id);
      return;
    }
    setPath(pathInto(path, item));
    setDir(1);
    resetEditRows();
  }

  function up(): void {
    if (path.length === 0) return;
    setPath(pathUp(path));
    setDir(-1);
    resetEditRows();
  }

  /** Крошки и «наверх» ходят в одну сторону — отсюда общий `dir: -1`. */
  function jump(depth: number): void {
    if (depth === path.length) return;
    setPath(path.slice(0, depth));
    setDir(-1);
    resetEditRows();
  }

  function startRename(item: WheelItem): void {
    setHiding(null);
    setRenaming(item.id);
    setRenameVal(item.label);
  }

  /** Правится подпись текущего языка; вторая остаётся какой была. */
  function submitRename(id: string): void {
    const value = renameVal.trim();
    setRenaming(null);
    if (!value || value === nameOf(id, lang, ws)) return;
    const ru = lang === 'ru' ? value : nameOf(id, 'ru', ws);
    const en = lang === 'en' ? value : nameOf(id, 'en', ws);
    void renameWheelNode(id, ru, en);
  }

  function submitAdd(): void {
    const value = addVal.trim();
    if (!value || path.length === 0) return;
    const parent = path[path.length - 1];
    if (parent === undefined) return;
    setAddVal('');
    void addWheelNode(path.length === 1 ? 'sub' : 'desc', parent, value);
  }

  return (
    <div className="bj-wheel" data-screen="wheel">
      <ScreenHeader
        title={t.wheel_title}
        right={
          <>
            <button
              type="button"
              className={editing ? 'bj-wheel__pencil bj-wheel__pencil--on' : 'bj-wheel__pencil'}
              data-testid="wheel-edit"
              aria-pressed={editing}
              onClick={() => {
                setEditing(!editing);
                resetEditRows();
              }}
            >
              {t.wheel_edit}
            </button>
            <button type="button" className="bj-wheel__done" data-testid="wheel-done" onClick={back}>
              {t.wheel_done}
            </button>
          </>
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
            {`+ ${nameOf(addHere, lang, ws)}`}
          </button>
        )}
      </div>

      <div className="bj-wheel__stage" data-hint="wheel-stage">
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

      <div className="bj-wheel__hint">{editing ? t.wheel_edit_hint : t.wheel_hint}</div>

      {editing ? (
        <div className="bj-wheel__foot bj-wheel__foot--edit" data-testid="wheel-edit-panel">
          <div className="bj-wheel__rows">
            {items.map((item) => (
              <div className="bj-wheel__row" key={item.id} data-testid={`wheel-row-${item.id}`}>
                <span
                  className="bj-wheel__row-dot"
                  style={{ background: colOf(item.id, undefined, ws) }}
                />
                {renaming === item.id ? (
                  <>
                    <input
                      className="bj-wheel__row-input"
                      type="text"
                      autoFocus
                      aria-label={t.wheel_rename}
                      data-testid="wheel-rename-input"
                      value={renameVal}
                      onChange={(e) => setRenameVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitRename(item.id);
                        if (e.key === 'Escape') setRenaming(null);
                      }}
                    />
                    <button
                      type="button"
                      className="bj-wheel__row-yes"
                      data-testid="wheel-rename-save"
                      onClick={() => submitRename(item.id)}
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      className="bj-wheel__row-no"
                      aria-label={t.back}
                      onClick={() => setRenaming(null)}
                    >
                      ✕
                    </button>
                  </>
                ) : hiding === item.id ? (
                  <>
                    <span className="bj-wheel__row-name">{item.label}</span>
                    <span className="bj-wheel__row-ask">{t.wheel_hide_q}</span>
                    <button
                      type="button"
                      className="bj-wheel__row-yes"
                      data-testid="wheel-hide-yes"
                      onClick={() => {
                        setHiding(null);
                        void hideWheelNode(item.id);
                      }}
                    >
                      {t.set_del_yes}
                    </button>
                    <button
                      type="button"
                      className="bj-wheel__row-no"
                      aria-label={t.back}
                      onClick={() => setHiding(null)}
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    <span className="bj-wheel__row-name">{item.label}</span>
                    <button
                      type="button"
                      className="bj-wheel__row-act"
                      aria-label={`${t.wheel_rename}: ${item.label}`}
                      data-testid={`wheel-rename-${item.id}`}
                      onClick={() => startRename(item)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="bj-wheel__row-act"
                      aria-label={`${t.a11y_remove}: ${item.label}`}
                      data-testid={`wheel-hide-${item.id}`}
                      onClick={() => {
                        setRenaming(null);
                        setHiding(item.id);
                      }}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {path.length > 0 ? (
            <div className="bj-wheel__addrow">
              <input
                className="bj-wheel__row-input"
                type="text"
                placeholder={t.bean_name}
                aria-label={t.wheel_add}
                data-testid="wheel-add-input"
                value={addVal}
                onChange={(e) => setAddVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitAdd();
                }}
              />
              <button
                type="button"
                className="bj-wheel__addbtn"
                data-testid="wheel-add-save"
                onClick={submitAdd}
              >
                {`+ ${t.wheel_add}`}
              </button>
            </div>
          ) : (
            <div className="bj-wheel__empty">{t.wheel_edit_root}</div>
          )}
        </div>
      ) : (
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
                label={nameOf(id, lang, ws)}
                caps={false}
                intensity={intensity}
                borderColor={colOf(id, 0.8, ws)}
                dotColor={colOf(id, undefined, ws)}
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
      )}
    </div>
  );
}
