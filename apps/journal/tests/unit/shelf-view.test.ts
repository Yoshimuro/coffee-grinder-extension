import { describe, expect, it } from 'vitest';

import {
  COUNT_RANGE,
  DRIP_DOSE,
  WEIGHT_RANGE,
  amountLabel,
  amountRange,
  amountUnit,
  beanGuard,
  beanStats,
  draftReady,
  makeBean,
  shelfCountLine,
  slotCount,
  slotPlaceholder,
} from '../../src/ui/screens/shelf/shelf-view.js';
import { defaultAmount } from '../../src/ui/screens/shelf/bean-add-store.js';
import type { BeanRecord } from '../../src/db/schema.js';

const TODAY = '2026-08-01';

describe('количество', () => {
  it('даёт дрипу штуки, остальному граммы', () => {
    expect(amountRange('drip')).toBe(COUNT_RANGE);
    expect(amountRange('beans')).toBe(WEIGHT_RANGE);
    expect(amountRange('ground')).toBe(WEIGHT_RANGE);

    expect(amountUnit('drip', 'ru')).toBe('шт');
    expect(amountUnit('beans', 'ru')).toBe('г');
    expect(amountLabel('drip', 'ru')).toBe('ШТУК В КОРОБКЕ');
    expect(amountLabel('beans', 'ru')).toBe('ВЕС');
  });

  it('держит шаги прототипа: ±25 г от 50 и ±1 шт от 1', () => {
    expect(WEIGHT_RANGE).toMatchObject({ min: 50, step: 25 });
    expect(COUNT_RANGE).toMatchObject({ min: 1, step: 1 });
  });

  it('меняет умолчание вместе с формой', () => {
    expect(defaultAmount('beans')).toBe(250);
    expect(defaultAmount('ground')).toBe(250);
    expect(defaultAmount('drip')).toBe(10);
  });
});

describe('shelfCountLine', () => {
  it('считает пачки', () => {
    expect(shelfCountLine(3, 'ru')).toBe('3 · пачки');
    expect(shelfCountLine(0, 'en')).toBe('0 · packs');
  });
});

describe('draftReady', () => {
  it('валидная дата и непустое имя — черновик готов', () => {
    expect(draftReady('27.07.2026', 'Ява')).toBe(true);
  });

  it('пустое имя держит кнопку выключенной', () => {
    expect(draftReady('27.07.2026', '')).toBe(false);
  });

  it('имя из одних пробелов не считается именем', () => {
    expect(draftReady('27.07.2026', '   ')).toBe(false);
  });

  it('недописанная дата держит кнопку выключенной', () => {
    expect(draftReady('25.07.', 'Ява')).toBe(false);
  });

  it('несуществующий день не проходит, хоть и прошёл по маске', () => {
    expect(draftReady('31.02.2026', 'Ява')).toBe(false);
  });

  it('обе беды разом — тоже не готов', () => {
    expect(draftReady('25.07.', '   ')).toBe(false);
  });
});

describe('makeBean', () => {
  it('заводит зерно непочатым: остаток равен весу', () => {
    const bean = makeBean(
      { form: 'beans', roast: '2026-07-27', amount: 250, name: 'Ява', photos: [] },
      'b1',
      'ru',
    );

    expect(bean).toMatchObject({
      id: 'b1',
      form: 'beans',
      name: 'Ява',
      roast: '2026-07-27',
      weight: 250,
      left: 250,
    });
    // Штучные поля зерну не ставятся вовсе.
    expect(bean.count).toBeUndefined();
    expect(bean.leftCount).toBeUndefined();
    expect(bean.dose).toBeUndefined();
  });

  it('заводит дрип штуками и с дозой производителя', () => {
    const bean = makeBean(
      { form: 'drip', roast: '2026-07-10', amount: 5, name: '', photos: [] },
      'b2',
      'ru',
    );

    expect(bean).toMatchObject({ count: 5, leftCount: 5, dose: DRIP_DOSE });
    expect(bean.weight).toBeUndefined();
    expect(bean.left).toBeUndefined();
  });

  it('подставляет имя, когда его не вписали', () => {
    const ru = makeBean(
      { form: 'beans', roast: '2026-07-27', amount: 250, name: '   ', photos: [] },
      'b3',
      'ru',
    );
    const en = makeBean(
      { form: 'beans', roast: '2026-07-27', amount: 250, name: '', photos: [] },
      'b4',
      'en',
    );

    expect(ru.name).toBe('Без названия');
    expect(en.name).toBe('Untitled');
  });

  it('копирует снимки, а не ссылается на черновик', () => {
    const photos = [{ path: 'opfs:a', thumb: 'data:a' }];
    const bean = makeBean(
      { form: 'beans', roast: '2026-07-27', amount: 250, name: 'X', photos },
      'b5',
      'ru',
    );

    photos.push({ path: 'opfs:b', thumb: 'data:b' });
    expect(bean.photos).toHaveLength(1);
  });
});

describe('карточка пачки', () => {
  const java: BeanRecord = {
    id: 'java',
    form: 'beans',
    name: 'Ява Золотая',
    roast: '2026-07-27',
    photos: [],
    weight: 250,
    left: 187,
  };

  it('показывает возраст, остаток и дату обжарки', () => {
    expect(beanStats(java, 'ru', TODAY)).toEqual([
      { label: 'ВОЗРАСТ', value: '5 дн · пик' },
      { label: 'ОСТАТОК', value: '187 г' },
      { label: 'ДАТА ОБЖАРКИ', value: '27.07.2026' },
    ]);
  });

  it('первый слот — лицо пачки, остальные — шов с датой', () => {
    expect(slotPlaceholder(0, 'ru')).toBe('лицо пачки');
    expect(slotPlaceholder(1, 'ru')).toBe('шов · дата обжарки');
    expect(slotPlaceholder(4, 'ru')).toBe('шов · дата обжарки');
  });

  it('держит минимум два слота и всегда один пустой в конце', () => {
    expect(slotCount([])).toBe(2);
    expect(slotCount(['a'])).toBe(2);
    expect(slotCount(['a', 'b'])).toBe(3);
    expect(slotCount(['a', 'b', 'c'])).toBe(4);
  });

  /*
   * Регрессия S-7. Карточка уходит назад, когда пачки нет, — и однажды уходила
   * до того, как база вообще ответила: `useBean` отдаёт `undefined` и на первом
   * кадре тоже. Здесь проигрывается сама последовательность кадров.
   */
  describe('сторож удалённой пачки', () => {
    it('не закрывает карточку, пока база ещё не ответила', () => {
      const first = beanGuard('java', undefined, false);
      expect(first.gone).toBe(false);
      expect(first.answered).toBe(false);
    });

    it('дожидается ответа и остаётся открытой', () => {
      let answered = false;

      // Кадр 1: запрос ушёл, ответа нет. Кадр 2: пачка приехала.
      for (const bean of [undefined, java]) {
        const guard = beanGuard('java', bean, answered);
        answered = guard.answered;
        expect(guard.gone).toBe(false);
      }

      expect(answered).toBe(true);
    });

    it('закрывает карточку, когда ответившая пачка исчезла', () => {
      const seen = beanGuard('java', java, false);
      expect(beanGuard('java', undefined, seen.answered).gone).toBe(true);
    });

    it('закрывает карточку, когда открывать нечего', () => {
      expect(beanGuard(null, undefined, false).gone).toBe(true);
      expect(beanGuard(null, java, true).gone).toBe(true);
    });
  });
});
