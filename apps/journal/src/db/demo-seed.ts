/**
 * Демо-сид для разработки — `?seed=demo` (S-6).
 *
 * Продакшен сеет только настройки (`seed.ts`, D-2): пустые экраны приглашают
 * заварить первую чашку, а не притворяются чужой историей. Но
 * смотреть вёрстку на пустой базе нельзя — не видно ни ленты, ни фильтров, ни
 * сравнения, — поэтому три пачки и шесть записей прототипа заезжают по явному
 * запросу в адресной строке и только в dev-сборке.
 *
 * Данные лежат в `data/seeds.ts` за `import.meta.env.DEV`, так что в проде
 * `demoSeeds()` возвращает `null` и сборщик выкидывает их из бандла целиком.
 */

import { demoSeeds } from '../data/seeds.js';
import { type BrewJournalDB, db } from './schema.js';

/** Параметр адресной строки, включающий демо-данные. */
export const DEMO_QUERY = 'seed';
export const DEMO_VALUE = 'demo';

/** Просили ли демо-данные этим URL. */
export function wantsDemo(search: string): boolean {
  return new URLSearchParams(search).get(DEMO_QUERY) === DEMO_VALUE;
}

/**
 * Кладёт демо-набор в базу. Возвращает, было ли что-то записано.
 *
 * Идемпотентность держится на `bulkPut` по тем же идентификаторам (`java`,
 * `j1`…): повторная перезагрузка с `?seed=demo` переписывает те же строки, а не
 * плодит копии. Правки, сделанные руками поверх демо-записи, при этом
 * откатываются — это ровно то, чего от кнопки «показать демо» и ждут.
 *
 * Пустой набор (прод-сборка) не пишет ничего.
 */
export async function seedDemo(database: BrewJournalDB = db): Promise<boolean> {
  const data = demoSeeds();
  if (data === null) return false;

  await database.transaction(
    'rw',
    database.beans,
    database.devices,
    database.entries,
    database.grinders,
    async () => {
      await database.beans.bulkPut(data.beans);
      await database.devices.bulkPut(data.devices);
      await database.entries.bulkPut(data.entries);
      await database.grinders.bulkPut(data.grinders);
    },
  );

  return true;
}
