/**
 * Санбёрст целиком — рендер режимов КАРТА и ПОЛОТНО (BJ-12).
 *
 * Компонент глупый, как и `WheelSvg`: вся геометрия посчитана в `map-view.ts` и
 * покрыта тестом, здесь только раскладка. Заливка приходит атрибутом (её нет в
 * токенах — она вычислена), а швы, подписи и точки памяти задают классы:
 * `var()` в презентационном атрибуте SVG не разворачивается.
 *
 * Сектор — не `<button>`: HTML-кнопку в SVG не вложить. Роль, подпись и
 * клавиатура навешены руками, иначе карта была бы доступна только пальцу.
 */

import type { KeyboardEvent } from 'react';

import { STR } from '../../../data/strings.js';
import type { Lang } from '../../../db/schema.js';
import { useWheel } from '../../../db/repo/wheel.js';
import {
  CANVAS_K,
  MAP_R,
  MAP_SIZE,
  type MapArc,
  mapArcs,
} from './map-view.js';
import './wheel.css';

export interface WheelMapSvgProps {
  /** Полотно — та же картина втрое крупнее и без зума. */
  big?: boolean;
  /** Сторона в пикселях: у карты её задаёт зум, у полотна — коэффициент. */
  px: number;
  picked: ReadonlySet<string>;
  memory: ReadonlySet<string>;
  lang: Lang;
  onTap: (id: string) => void;
}

function activates(e: KeyboardEvent): boolean {
  return e.key === 'Enter' || e.key === ' ';
}

export function WheelMapSvg({ big = false, px, picked, memory, lang, onTap }: WheelMapSvgProps) {
  const ws = useWheel();
  const t = STR[lang];
  const k = big ? CANVAS_K : 1;
  const side = MAP_SIZE * k;
  const arcs: MapArc[] = mapArcs(ws, lang, { picked, memory, k });

  return (
    <svg
      className="bj-map__svg"
      viewBox={`0 0 ${String(side)} ${String(side)}`}
      width={px}
      height={px}
      role="group"
      aria-label={t.wheel_title}
    >
      {arcs.map((arc) => (
        <g key={arc.id}>
          <path
            className={
              picked.has(arc.id) ? 'bj-map__arc bj-map__arc--on' : 'bj-map__arc'
            }
            data-testid={`map-arc-${arc.id}`}
            d={arc.d}
            fill={arc.fill}
            strokeWidth={arc.stroke}
            role="button"
            tabIndex={0}
            aria-pressed={picked.has(arc.id)}
            aria-label={arc.mem ? `${arc.label.text} · ${t.wheel_mem}` : arc.label.text}
            onClick={() => {
              onTap(arc.id);
            }}
            onKeyDown={(e) => {
              if (!activates(e)) return;
              e.preventDefault();
              onTap(arc.id);
            }}
          />
          <text
            className="bj-map__label"
            x={arc.label.x}
            y={arc.label.y}
            fontSize={arc.label.size}
            fontWeight={arc.label.weight}
            textAnchor={arc.label.anchor}
            dominantBaseline="middle"
            transform={`rotate(${arc.label.rot.toFixed(1)} ${arc.label.x.toFixed(1)} ${arc.label.y.toFixed(1)})`}
          >
            {arc.label.text}
          </text>
          {arc.mem ? (
            <circle className="bj-map__mem" cx={arc.mem.cx} cy={arc.mem.cy} r={arc.mem.r} />
          ) : null}
        </g>
      ))}

      {/* Хаб не кнопка: на карте видно всё и подниматься некуда. */}
      <circle
        className="bj-map__hub"
        cx={side / 2}
        cy={side / 2}
        r={(MAP_R.hub - 8) * k}
        strokeWidth={k}
      />
      <text
        className="bj-map__root"
        x={side / 2}
        y={side / 2 + 3 * k}
        fontSize={9 * (big ? 2.7 : 1)}
        textAnchor="middle"
      >
        {t.wheel_root}
      </text>
    </svg>
  );
}
