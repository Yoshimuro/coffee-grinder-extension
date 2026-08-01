/**
 * Диагностика → подсказка «НА СЛЕДУЮЩИЙ РАЗ» (`data.js:145-155`).
 *
 * D-6: функция портирована, но к UI не подключается, пока не закрыт Q-1 спеки
 * §9 (в прототипе блок советов — мёртвый код). Формулировки плоские и без
 * энтузиазма — это авторский тон хендоффа, менять его здесь нельзя.
 */

import type { Diagnostics, Lang } from '../db/schema.js';

/**
 * Правила проверяются по порядку и накапливаются: сильная кислотность и слабое
 * тело дадут две строки. Если не сработало ни одно, отвечаем по балансу —
 * «повторить» при 7+ и «менять один параметр за раз» во всех прочих случаях,
 * то есть пустым список не бывает никогда.
 */
export function advice(d: Diagnostics, lang: Lang): string[] {
  const L = lang === 'ru';
  const out: string[] = [];
  if (d.acid >= 7 && d.bitter <= 4)
    out.push(L ? 'мельче на 0.5 · или горячее на 2°' : 'grind 0.5 finer · or 2° hotter');
  if (d.bitter >= 7 && d.acid <= 4)
    out.push(L ? 'крупнее на 0.5 · или холоднее на 2°' : 'grind 0.5 coarser · or 2° cooler');
  if (d.body <= 3) out.push(L ? 'дольше контакт · или мельче на 0.3' : 'longer contact · or 0.3 finer');
  if (d.body >= 8 && d.balance <= 5)
    out.push(L ? 'меньше доза · или крупнее на 0.3' : 'lower dose · or 0.3 coarser');
  if (!out.length && d.balance >= 7) out.push(L ? 'повторить без изменений' : 'repeat as is');
  if (!out.length) out.push(L ? 'менять один параметр за раз' : 'change one variable at a time');
  return out;
}
