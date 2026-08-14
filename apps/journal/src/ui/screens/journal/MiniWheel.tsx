/**
 * Мини-колесо (component-report §8.9, `DC:1091-1098`) — девять категорий
 * кольцом, 64×64.
 *
 * Единственное цветное пятно приложения. Оно не украшение: интерфейс весь
 * серый, поэтому цвет здесь работает указателем — «отсюда начинается колесо
 * вкусов», и никакая другая кнопка на цвет не претендует.
 *
 * Геометрия — `arcPath` из домена (BJ-3), цвет — `catColor`/`lightnessFor`
 * оттуда же: светлота чередуется через одну, чтобы соседние сектора
 * различались, а обводка цветом фона превращает зазор в шов.
 */

import { catColor, lightnessFor } from '../../../data/wheel.js';
import { useWheel } from '../../../db/repo/wheel.js';
import { arcPath } from '../../../domain/geometry.js';
import './journal.css';

/* Числа прототипа: центр 40, кольцо от 15 до 38, зазор 0.03 радиана. */
const CX = 40;
const CY = 40;
const R0 = 15;
const R1 = 38;
const GAP = 0.03;
const TOP = -Math.PI / 2;

export interface MiniWheelProps {
  /** Сторона в пикселях. Прототип рисует 64 при viewBox 80. */
  size?: number;
}

export function MiniWheel({ size = 64 }: MiniWheelProps) {
  const { cats } = useWheel();
  const n = cats.length;

  return (
    <svg
      className="jr-mini"
      viewBox="0 0 80 80"
      width={size}
      height={size}
      // Смысл несёт соседний текст «ДЕСКРИПТОРЫ · колесо вкусов»; для
      // скринридера картинка — шум.
      aria-hidden="true"
      focusable="false"
    >
      {cats.map((cat, i) => (
        <path
          key={cat.id}
          d={arcPath(CX, CY, R0, R1, TOP + (i * 2 * Math.PI) / n + GAP, TOP + ((i + 1) * 2 * Math.PI) / n - GAP)}
          fill={catColor(cat, lightnessFor(0, i, n))}
          strokeWidth={1}
        />
      ))}
    </svg>
  );
}
