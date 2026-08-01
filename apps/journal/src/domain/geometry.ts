/**
 * Геометрия колеса — `arcPath` (component-report §8.2, `DC:1059-1064`).
 *
 * Нужна дважды: мини-колесу на диагностике (BJ-4) и полному колесу вкусов
 * (BJ-5), поэтому живёт в домене, а не рядом с экраном.
 */

/**
 * Кольцевой сектор как SVG-путь: внешняя дуга радиуса `r1` по часовой стрелке,
 * внутренняя радиуса `r0` — обратно, затем `Z`.
 *
 * Углы в радианах, ноль — на три часа, рост по часовой стрелке (ось Y в SVG
 * смотрит вниз). Флаг «большой дуги» поднимается, когда сектор шире полукруга.
 */
export function arcPath(
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  a0: number,
  a1: number,
): string {
  const p = (r: number, a: number): [number, number] => [
    cx + Math.cos(a) * r,
    cy + Math.sin(a) * r,
  ];
  const [x0, y0] = p(r1, a0);
  const [x1, y1] = p(r1, a1);
  const [x2, y2] = p(r0, a1);
  const [x3, y3] = p(r0, a0);
  const lg = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${x0} ${y0} A ${r1} ${r1} 0 ${lg} 1 ${x1} ${y1} L ${x2} ${y2} A ${r0} ${r0} 0 ${lg} 0 ${x3} ${y3} Z`;
}
