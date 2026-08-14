/**
 * Мини-карта полотна (BJ-12).
 *
 * Панорама 2460×2460 показывает примерно треть колеса, и без обзорного окошка
 * человек теряет, где он находится. Здесь только категории — подкатегории и
 * листья на 64 пикселях слиплись бы в кашу, а вопрос у мини-карты один: «в
 * какой я стороне».
 *
 * Рамка видимой области приходит посчитанной (`viewportRect`), а сама карта
 * событий не ловит: тапать по ней нечего, полотно двигают самим полотном.
 */

import { lightnessFor } from '../../../data/wheel.js';
import { useWheel } from '../../../db/repo/wheel.js';
import { arcPath } from '../../../domain/geometry.js';
import { MINI_SIZE, type Viewport } from './map-view.js';
import './wheel.css';

export interface MiniMapProps {
  viewport: Viewport;
}

export function MiniMap({ viewport }: MiniMapProps) {
  const ws = useWheel();
  const n = ws.cats.length;

  return (
    <div className="bj-mini" aria-hidden="true">
      <svg className="bj-mini__svg" viewBox="0 0 80 80" width={MINI_SIZE} height={MINI_SIZE}>
        {ws.cats.map((cat, i) => {
          const step = (2 * Math.PI) / Math.max(1, n);
          const a0 = -Math.PI / 2 + i * step + 0.03;
          const a1 = -Math.PI / 2 + (i + 1) * step - 0.03;
          return (
            <path
              key={cat.id}
              className="bj-mini__arc"
              d={arcPath(40, 40, 15, 38, a0, a1)}
              fill={`oklch(${lightnessFor(0, i, n).toFixed(3)} ${cat.c} ${cat.h})`}
            />
          );
        })}
      </svg>

      <div
        className="bj-mini__vp"
        data-testid="wheel-minimap-vp"
        style={{
          left: `${viewport.left.toFixed(1)}px`,
          top: `${viewport.top.toFixed(1)}px`,
          width: `${viewport.width.toFixed(1)}px`,
          height: `${viewport.height.toFixed(1)}px`,
        }}
      />
    </div>
  );
}
