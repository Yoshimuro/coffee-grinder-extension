/**
 * Чертёж девайса — рендер геометрии из `dev-geometry.ts`.
 *
 * Компонент намеренно глупый: он не знает ни про признаки, ни про масштаб, а
 * только раскладывает готовые формы. Всё, что можно посчитать, посчитано и
 * покрыто тестом рядом; здесь остаётся то, что тестом не проверишь.
 *
 * Цвет задают классы, а не атрибуты `stroke`: палитра живёт в токенах, а
 * `stroke="var(--text)"` в атрибуте SVG не разворачивается.
 */

import { BIG_SIZE, SMALL_SIZE, type Shape, VIEW_BOX, devShapes } from './dev-geometry.js';
import type { DeviceTraits } from './dev-geometry.js';
import './devices.css';

export interface DevSvgProps {
  device: DeviceTraits;
  /** Крупный чертёж конструктора. По умолчанию мелкий — для строк списка. */
  big?: boolean;
  /** Описание для скринридера: та же тех-строка, что подписана под чертежом. */
  title?: string;
}

function Primitive({ shape }: { shape: Shape }) {
  const cls = `bj-dev__${shape.role}`;

  if (shape.kind === 'circle')
    return (
      <circle
        className={cls}
        cx={shape.cx}
        cy={shape.cy}
        r={shape.r}
        strokeWidth={shape.w}
        fill="none"
      />
    );

  if (shape.kind === 'path')
    return <path className={cls} d={shape.d} strokeWidth={shape.w} fill="none" />;

  return (
    <line
      className={cls}
      x1={shape.x1}
      y1={shape.y1}
      x2={shape.x2}
      y2={shape.y2}
      strokeWidth={shape.w}
      {...(shape.dash === undefined ? {} : { strokeDasharray: shape.dash })}
    />
  );
}

export function DevSvg({ device, big = false, title }: DevSvgProps) {
  const size = big ? BIG_SIZE : SMALL_SIZE;
  const shapes = devShapes(device);

  return (
    <svg
      className="bj-dev__svg"
      viewBox={VIEW_BOX}
      width={size.width}
      height={size.height}
      role={title === undefined ? 'presentation' : 'img'}
      {...(title === undefined ? { 'aria-hidden': true } : {})}
    >
      {title === undefined ? null : <title>{title}</title>}
      {shapes.map((shape, i) => (
        // Формы — позиционный список без собственных ключей: он целиком
        // пересобирается на каждое изменение признака, порядок и есть личность.
        <Primitive key={i} shape={shape} />
      ))}
    </svg>
  );
}
