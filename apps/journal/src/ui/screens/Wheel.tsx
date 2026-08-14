/**
 * Колесо вкусов — экран, ради которого приложение и затевалось.
 *
 * Четыре способа смотреть на одно и то же дерево (BJ-12):
 *
 *   УРОВНИ  — прежний drill-down: одно кольцо за раз, тап вглубь, центр наверх;
 *   КАРТА   — весь санбёрст сразу, скролл и зум 55–130 %;
 *   ПОЛОТНО — та же карта втрое крупнее, панорамой, с мини-картой в углу;
 *   СПИСОК  — плоско: категории секциями, дескрипторы чипами.
 *
 * Режим — настройка (`wheelMode`), а не состояние экрана: это ответ на вопрос
 * «как мне удобнее», и переспрашивать его на каждом заходе незачем.
 *
 * Остановиться можно на любом уровне — «фруктовое» тоже ответ (README:59). В
 * уровнях это делает кнопка «+ <имя>», в остальных режимах — прямой тап по
 * кольцу категории: там она такой же сектор, как лист.
 *
 * Собственного состояния у экрана ровно столько, сколько теряется без сожаления:
 * путь, направление зума, масштаб карты и выбранный для правки узел. Набранное
 * живёт в сторе оценки — по «ГОТОВО» человек возвращается на диагностику.
 */

import {
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useNav } from '../../app/nav.js';
import { STR } from '../../data/strings.js';
import { colOf, nameOf } from '../../data/wheel.js';
import { useDoneEntries } from '../../db/repo/entries.js';
import { useLang, useWheelMode, setWheelMode } from '../../db/repo/settings.js';
import { addWheelNode, hideWheelNode, renameWheelNode, useWheel } from '../../db/repo/wheel.js';
import type { WheelMode } from '../../db/schema.js';
import { Chip } from '../components/Chip.js';
import { ScreenHeader } from '../components/ScreenHeader.js';
import { Tag } from '../components/Tag.js';
import { useRate } from './journal/rate-store.js';
import { MiniMap } from './wheel/MiniMap.js';
import { WheelMapSvg } from './wheel/WheelMapSvg.js';
import { WheelSvg } from './wheel/WheelSvg.js';
import { wheelList } from './wheel/list-view.js';
import {
  CANVAS_K,
  MAP_SIZE,
  MAP_ZOOM_DEFAULT,
  MAP_ZOOM_MAX,
  MAP_ZOOM_MIN,
  MAP_ZOOM_STEP,
  type Viewport,
  centerScroll,
  clampZoom,
  mapPixels,
  movedTooFar,
  viewportRect,
} from './wheel/map-view.js';
import {
  type WheelItem,
  addHereTarget,
  crumbs,
  memorySet,
  nodeKindOf,
  pathInto,
  pathUp,
  wheelItems,
} from './wheel/wheel-view.js';
import './wheel/wheel.css';

/** Направление зума: вглубь или наверх. */
type Dir = 1 | -1;

const MODES: readonly WheelMode[] = ['drill', 'map', 'canvas', 'list'];

/** Рамка обзора до первого события прокрутки. */
const VIEWPORT_START: Viewport = { left: 0, top: 0, width: 24, height: 34 };

export function Wheel() {
  const lang = useLang();
  const ws = useWheel();
  const t = STR[lang];
  const back = useNav((s) => s.back);
  const mode = useWheelMode();

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

  /* Карта и полотно (BJ-12): масштаб, выбранный для правки узел и рамка обзора
     мини-карты. Всё экранное — с уходом с колеса теряется без потерь. */
  const [zoom, setZoom] = useState(MAP_ZOOM_DEFAULT);
  const [sel, setSel] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>(VIEWPORT_START);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  /* Панорама мышью: откуда потянули и на сколько уехали. `moved` переживает
     pointerup, потому что click приходит после него — иначе каждый протяг
     заканчивался бы выбором случайного узла. */
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const moved = useRef(false);

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
  const list = useMemo(
    () => (mode === 'list' ? wheelList(ws, lang, pickedIds, memory) : []),
    [mode, ws, lang, pickedIds, memory],
  );

  /* Вход в режим и смена масштаба ставят скролл по центру: без этого человек
     оказывался бы в левом верхнем углу картины, где ничего нет. */
  useEffect(() => {
    const el = mode === 'map' ? mapRef.current : mode === 'canvas' ? canvasRef.current : null;
    if (!el) return;
    const { left, top } = centerScroll(el);
    el.scrollLeft = left;
    el.scrollTop = top;
    if (mode === 'canvas') setViewport(viewportRect(el));
  }, [mode, zoom]);

  function changeMode(next: WheelMode): void {
    if (next === mode) return;
    void setWheelMode(next);
    setSel(null);
    resetEditRows();
  }

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

  /**
   * Тап по узлу на карте, полотне и в списке.
   *
   * Уровень здесь не важен: категория — такой же ответ, как лист. В режиме
   * правки тап не выбирает, а открывает панель узла в подвале.
   */
  function tapNode(id: string): void {
    if (moved.current) return;
    if (editing) {
      setSel(id);
      setRenaming(null);
      setHiding(null);
      setAddVal('');
      return;
    }
    togglePick(id);
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

  function startRename(id: string, label: string): void {
    setHiding(null);
    setRenaming(id);
    setRenameVal(label);
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

  /** «+ ВНУТРЬ» в панели узла: категория растит подкатегорию, та — дескриптор. */
  function submitAddInside(): void {
    const value = addVal.trim();
    if (!value || sel === null) return;
    const kind = nodeKindOf(sel, ws);
    if (kind !== 'cat' && kind !== 'sub') return;
    setAddVal('');
    void addWheelNode(kind === 'cat' ? 'sub' : 'desc', sel, value);
  }

  /* ── Панорама полотна ─────────────────────────────────────────────────── */

  function panDown(e: ReactPointerEvent<HTMLDivElement>): void {
    moved.current = false;
    if (e.pointerType !== 'mouse') return;
    const el = e.currentTarget;
    drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
  }

  function panMove(e: ReactPointerEvent<HTMLDivElement>): void {
    const from = drag.current;
    if (!from) return;
    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;
    if (movedTooFar(dx, dy)) moved.current = true;
    const el = e.currentTarget;
    el.scrollLeft = from.left - dx;
    el.scrollTop = from.top - dy;
  }

  function panUp(): void {
    drag.current = null;
  }

  /* Пальцем полотно скроллится нативно — жест всё равно надо отличить от тапа,
     иначе прокрутка заканчивалась бы выбором узла под пальцем. */
  function touchMove(e: ReactTouchEvent<HTMLDivElement>): void {
    if (e.touches.length > 0) moved.current = true;
  }

  const hint =
    mode === 'drill'
      ? editing
        ? t.wheel_edit_hint
        : t.wheel_hint
      : editing
        ? t.wheel_map_edit_hint
        : t.wheel_map_hint;

  const selKind = sel === null ? null : nodeKindOf(sel, ws);

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
                setSel(null);
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

      {/* ── Переключатель режимов ──────────────────────────────────────── */}
      <div className="bj-wheel__modes">
        {MODES.map((m) => (
          <Chip
            key={m}
            label={t[`wheel_mode_${m}`]}
            active={m === mode}
            testId={`wheel-mode-${m}`}
            onClick={() => {
              changeMode(m);
            }}
          />
        ))}

        {mode === 'map' ? (
          <div className="bj-wheel__zoom">
            <button
              type="button"
              className="bj-wheel__zoom-btn"
              data-testid="wheel-zoom-out"
              aria-label={t.wheel_zoom_out}
              disabled={zoom <= MAP_ZOOM_MIN}
              onClick={() => {
                setZoom(clampZoom(zoom - MAP_ZOOM_STEP));
              }}
            >
              −
            </button>
            <span className="bj-wheel__zoom-val">{`${String(zoom)}%`}</span>
            <button
              type="button"
              className="bj-wheel__zoom-btn"
              data-testid="wheel-zoom-in"
              aria-label={t.wheel_zoom_in}
              disabled={zoom >= MAP_ZOOM_MAX}
              onClick={() => {
                setZoom(clampZoom(zoom + MAP_ZOOM_STEP));
              }}
            >
              +
            </button>
          </div>
        ) : null}
      </div>

      {/* ── УРОВНИ ─────────────────────────────────────────────────────── */}
      {mode === 'drill' ? (
        <>
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
              className={dir > 0 ? 'bj-wheel__zoom-in' : 'bj-wheel__zoom-in bj-wheel__zoom-in--out'}
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
        </>
      ) : null}

      {/* ── КАРТА ──────────────────────────────────────────────────────── */}
      {mode === 'map' ? (
        <div className="bj-map" ref={mapRef} data-testid="wheel-map">
          <div style={{ width: mapPixels(zoom), height: mapPixels(zoom) }}>
            <WheelMapSvg
              px={mapPixels(zoom)}
              picked={pickedIds}
              memory={memory}
              lang={lang}
              onTap={tapNode}
            />
          </div>
        </div>
      ) : null}

      {/* ── ПОЛОТНО ────────────────────────────────────────────────────── */}
      {mode === 'canvas' ? (
        <div className="bj-canvas">
          <div
            className="bj-canvas__pane"
            ref={canvasRef}
            data-testid="wheel-canvas"
            onPointerDown={panDown}
            onPointerMove={panMove}
            onPointerUp={panUp}
            onPointerLeave={panUp}
            onTouchMove={touchMove}
            onScroll={(e) => {
              setViewport(viewportRect(e.currentTarget));
            }}
          >
            <div style={{ width: MAP_SIZE * CANVAS_K, height: MAP_SIZE * CANVAS_K }}>
              <WheelMapSvg
                big
                px={MAP_SIZE * CANVAS_K}
                picked={pickedIds}
                memory={memory}
                lang={lang}
                onTap={tapNode}
              />
            </div>
          </div>

          <MiniMap viewport={viewport} />
        </div>
      ) : null}

      {/* ── СПИСОК ─────────────────────────────────────────────────────── */}
      {mode === 'list' ? (
        <div className="bj-list" data-testid="wheel-list">
          {list.map((cat) => (
            <div className="bj-list__cat" key={cat.id}>
              <button
                type="button"
                className={
                  cat.selected ? 'bj-list__head bj-list__head--on' : 'bj-list__head'
                }
                data-testid={`wheel-list-cat-${cat.id}`}
                onClick={() => {
                  tapNode(cat.id);
                }}
              >
                <span className="bj-list__dot" style={{ background: cat.dot }} />
                <span className="bj-list__name">{cat.label}</span>
                <span className="bj-list__count">{cat.count}</span>
              </button>

              {cat.subs.map((sub) => (
                <div className="bj-list__sub" key={sub.id}>
                  <button
                    type="button"
                    className={sub.selected ? 'bj-list__subname bj-list__subname--on' : 'bj-list__subname'}
                    onClick={() => {
                      tapNode(sub.id);
                    }}
                  >
                    {sub.label}
                  </button>

                  <div className="bj-list__chips">
                    {sub.chips.map((chip) => (
                      <button
                        type="button"
                        key={chip.id}
                        className={chip.selected ? 'bj-list__chip bj-list__chip--on' : 'bj-list__chip'}
                        data-testid={`wheel-list-chip-${chip.id}`}
                        aria-pressed={chip.selected}
                        {...(chip.border === null ? {} : { style: { borderColor: chip.border } })}
                        onClick={() => {
                          tapNode(chip.id);
                        }}
                      >
                        <span className="bj-list__chip-dot" style={{ background: chip.dot }} />
                        {chip.label}
                        {chip.remembered ? <span className="bj-list__chip-mem" /> : null}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      <div className="bj-wheel__hint">{hint}</div>

      {/* ── Подвал ─────────────────────────────────────────────────────── */}
      {editing && mode === 'drill' ? (
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
                      onClick={() => startRename(item.id, item.label)}
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
      ) : editing ? (
        /* Панель узла: та же вёрстка, что строка уровня, но про один узел —
           тот, по которому только что тапнули на карте, полотне или в списке. */
        <div className="bj-wheel__foot bj-wheel__foot--edit" data-testid="wheel-node-panel">
          {sel === null ? (
            <div className="bj-wheel__empty">{t.wheel_map_edit_hint}</div>
          ) : (
            <>
              <div className="bj-wheel__row">
                <span
                  className="bj-wheel__row-dot"
                  style={{ background: colOf(sel, undefined, ws) }}
                />
                {renaming === sel ? (
                  <>
                    <input
                      className="bj-wheel__row-input"
                      type="text"
                      autoFocus
                      aria-label={t.wheel_rename}
                      data-testid="wheel-node-rename-input"
                      value={renameVal}
                      onChange={(e) => setRenameVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitRename(sel);
                        if (e.key === 'Escape') setRenaming(null);
                      }}
                    />
                    <button
                      type="button"
                      className="bj-wheel__row-yes"
                      data-testid="wheel-node-rename-save"
                      onClick={() => submitRename(sel)}
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
                ) : hiding === sel ? (
                  <>
                    <span className="bj-wheel__row-name">{nameOf(sel, lang, ws)}</span>
                    <span className="bj-wheel__row-ask">{t.wheel_hide_q}</span>
                    <button
                      type="button"
                      className="bj-wheel__row-yes"
                      data-testid="wheel-node-hide-yes"
                      onClick={() => {
                        setHiding(null);
                        setSel(null);
                        void hideWheelNode(sel);
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
                    <span className="bj-wheel__row-name">{nameOf(sel, lang, ws)}</span>
                    <button
                      type="button"
                      className="bj-wheel__row-act"
                      aria-label={`${t.wheel_rename}: ${nameOf(sel, lang, ws)}`}
                      data-testid="wheel-node-rename"
                      onClick={() => startRename(sel, nameOf(sel, lang, ws))}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="bj-wheel__row-act"
                      aria-label={`${t.a11y_remove}: ${nameOf(sel, lang, ws)}`}
                      data-testid="wheel-node-hide"
                      onClick={() => {
                        setRenaming(null);
                        setHiding(sel);
                      }}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>

              {/* У листа внутренностей не бывает — ряда «+ ВНУТРЬ» у него нет. */}
              {(selKind === 'cat' || selKind === 'sub') && renaming !== sel && hiding !== sel ? (
                <div className="bj-wheel__addrow">
                  <input
                    className="bj-wheel__row-input"
                    type="text"
                    placeholder={t.bean_name}
                    aria-label={t.wheel_add_inside}
                    data-testid="wheel-node-add-input"
                    value={addVal}
                    onChange={(e) => setAddVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitAddInside();
                    }}
                  />
                  <button
                    type="button"
                    className="bj-wheel__addbtn"
                    data-testid="wheel-node-add-save"
                    onClick={submitAddInside}
                  >
                    {`+ ${t.wheel_add_inside}`}
                  </button>
                </div>
              ) : null}
            </>
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
