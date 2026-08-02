/**
 * Колесо — рендер уровня, посчитанного в `wheel-view.ts` (§8.3).
 *
 * Компонент, как и чертёж девайса, глупый: он не знает ни про путь целиком, ни
 * про стор, а получает готовый список секторов и два множества — выбранное и
 * память — и раскладывает их по дугам. Всё, что считается, посчитано рядом и
 * покрыто тестом.
 *
 * Цвет сектора приходит атрибутом: он вычислен из данных, и в токенах его нет.
 * Всё остальное — обводки, подписи, центральная кнопка — задают классы, потому
 * что это палитра приложения (`stroke="var(--bg)"` в атрибуте SVG не
 * разворачивается).
 *
 * Сектор — не `<button>`: вложить HTML-кнопку в SVG нельзя. Роль, подпись и
 * клавиатура навешены руками, иначе колесо было бы доступно только пальцу.
 */

import type { KeyboardEvent } from 'react';

import { STR } from '../../../data/strings.js';
import { nameOf } from '../../../data/wheel.js';
import type { Lang } from '../../../db/schema.js';
import { arcPath } from '../../../domain/geometry.js';
import {
  CX,
  CY,
  HUB_R,
  LABEL_R,
  MEM_DOT,
  MEM_R,
  R0,
  R1,
  SIZE,
  VIEW_BOX,
  type WheelItem,
  type WheelPath,
  fillOf,
  labelFontSize,
  labelRotation,
  memoryHit,
  polar,
  sectorAngles,
} from './wheel-view.js';
import './wheel.css';

export interface WheelSvgProps {
  items: readonly WheelItem[];
  /** Текущий путь: от него зависят подпись центра и активность кнопки. */
  path: WheelPath;
  /** Уже выбранные id — обводка листа. */
  picked: ReadonlySet<string>;
  /** Дескрипторы, выбиравшиеся раньше, — точки памяти. */
  memory: ReadonlySet<string>;
  lang: Lang;
  onTap: (item: WheelItem) => void;
  onUp: () => void;
}

/** Пробел и Enter на элементе с ролью кнопки обязаны делать то же, что тап. */
function activates(e: KeyboardEvent): boolean {
  return e.key === 'Enter' || e.key === ' ';
}

export function WheelSvg({ items, path, picked, memory, lang, onTap, onUp }: WheelSvgProps) {
  const t = STR[lang];
  const n = items.length;
  const fontSize = labelFontSize(n);
  const level = path[path.length - 1];

  return (
    <svg
      className="bj-wheel__svg"
      viewBox={VIEW_BOX}
      width={SIZE}
      height={SIZE}
      role="group"
      aria-label={t.wheel_title}
    >
      {items.map((item, i) => {
        const { a0, a1, am } = sectorAngles(i, n);
        const label = polar(LABEL_R, am);
        const dot = polar(MEM_R, am);
        const on = item.leaf && picked.has(item.id);
        const remembered = memoryHit(memory, item);

        return (
          <g key={item.id}>
            <path
              className={on ? 'bj-wheel__sector bj-wheel__sector--on' : 'bj-wheel__sector'}
              data-testid={`wheel-sector-${item.id}`}
              d={arcPath(CX, CY, R0, R1, a0, a1)}
              fill={fillOf(item)}
              role="button"
              tabIndex={0}
              aria-label={remembered ? `${item.label} · ${t.wheel_mem}` : item.label}
              {...(item.leaf ? { 'aria-pressed': on } : {})}
              onClick={() => {
                onTap(item);
              }}
              onKeyDown={(e) => {
                if (!activates(e)) return;
                e.preventDefault();
                onTap(item);
              }}
            />
            <text
              className="bj-wheel__label"
              x={label.x}
              y={label.y}
              fontSize={fontSize}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${labelRotation(am).toFixed(1)} ${label.x.toFixed(1)} ${label.y.toFixed(1)})`}
            >
              {item.label}
            </text>
            {remembered ? (
              <circle
                className="bj-wheel__mem"
                data-testid={`wheel-mem-${item.id}`}
                cx={dot.x}
                cy={dot.y}
                r={MEM_DOT}
              />
            ) : null}
          </g>
        );
      })}

      {/* Центр — кнопка «наверх». На корне ей некуда вести. */}
      <circle
        className={level === undefined ? 'bj-wheel__hub' : 'bj-wheel__hub bj-wheel__hub--live'}
        data-testid="wheel-up"
        cx={CX}
        cy={CY}
        r={HUB_R}
        role="button"
        tabIndex={level === undefined ? -1 : 0}
        aria-label={t.wheel_up}
        aria-disabled={level === undefined}
        onClick={onUp}
        onKeyDown={(e) => {
          if (!activates(e)) return;
          e.preventDefault();
          onUp();
        }}
      />

      {level === undefined ? (
        <text className="bj-wheel__root" x={CX} y={CY + 3} textAnchor="middle">
          {t.wheel_root}
        </text>
      ) : (
        <>
          <text className="bj-wheel__arrow" x={CX} y={CY - 7} textAnchor="middle">
            ↑
          </text>
          <text className="bj-wheel__level" x={CX} y={CY + 12} textAnchor="middle">
            {nameOf(level, lang)}
          </text>
        </>
      )}
    </svg>
  );
}
