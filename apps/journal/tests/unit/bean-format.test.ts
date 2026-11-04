import { describe, expect, it } from 'vitest';

import {
  ageLabel,
  beanName,
  beanTech,
  beanTechWithForm,
  formLabel,
  leftLabel,
  longDate,
  maskDate,
  parseDate,
  shortDate,
} from '../../src/ui/bean-format.js';
import type { BeanRecord } from '../../src/db/schema.js';

const java: BeanRecord = {
  id: 'java',
  form: 'beans',
  name: 'Ява Золотая',
  roast: '2026-07-27',
  photos: [],
  weight: 250,
  left: 187,
};

const drip: BeanRecord = {
  id: 'drip1',
  form: 'drip',
  name: 'Дрип · Колумбия Уила',
  roast: '2026-07-10',
  photos: [],
  count: 5,
  leftCount: 3,
  dose: 12,
};

const TODAY = '2026-08-01';

describe('formLabel', () => {
  it('называет три формы кофе', () => {
    expect(formLabel('beans', 'ru')).toBe('зерно');
    expect(formLabel('ground', 'ru')).toBe('молотый');
    expect(formLabel('drip', 'ru')).toBe('дрип-пакет');
    expect(formLabel('beans', 'en')).toBe('beans');
  });
});

describe('leftLabel', () => {
  it('считает дрип штуками, остальное граммами', () => {
    expect(leftLabel(java, 'ru')).toBe('187 г');
    expect(leftLabel(drip, 'ru')).toBe('3 шт');
    expect(leftLabel(java, 'en')).toBe('187 g');
  });

  it('пустой остаток читает нулём, а не прочерком', () => {
    // Ключа нет вовсе — так выглядит запись, приехавшая импортом из чужой
    // сборки. `exactOptionalPropertyTypes` не даст подставить сюда undefined.
    const { left: _left, ...noLeft } = java;
    const { leftCount: _count, ...noCount } = drip;

    expect(leftLabel(noLeft, 'ru')).toBe('0 г');
    expect(leftLabel(noCount, 'ru')).toBe('0 шт');
  });
});

describe('ageLabel / beanTech', () => {
  it('собирает возраст, фазу и остаток', () => {
    expect(ageLabel(java, 'ru', TODAY)).toBe('5 дн · пик');
    expect(beanTech(java, 'ru', TODAY)).toBe('5 дн · пик · 187 г');
    expect(beanTechWithForm(java, 'ru', TODAY)).toBe('зерно · 5 дн · пик · 187 г');
  });

  it('ставит фазу по возрасту, а не по форме', () => {
    // 22 дня от 10.07 — уже спад (порог 21).
    expect(beanTechWithForm(drip, 'ru', TODAY)).toBe('дрип-пакет · 22 дн · спад · 3 шт');
    expect(ageLabel({ ...java, roast: '2026-07-30' }, 'ru', TODAY)).toBe('2 дн · дегазация');
  });

  it('зависит от переданного «сегодня», а не от системных часов', () => {
    expect(ageLabel(java, 'ru', '2026-07-27')).toBe('0 дн · дегазация');
    expect(ageLabel(java, 'ru', '2026-09-01')).toBe('36 дн · спад');
  });
});

describe('beanName', () => {
  it('заменяет пустое имя прочерком', () => {
    expect(beanName(java, 'ru')).toBe('Ява Золотая');
    expect(beanName({ ...java, name: '' }, 'ru')).toBe('—');
    expect(beanName(null, 'ru')).toBe('—');
    expect(beanName(undefined, 'ru')).toBe('—');
  });
});

describe('даты', () => {
  it('режет ISO в DD.MM и DD.MM.YYYY', () => {
    expect(shortDate('2026-08-01')).toBe('01.08');
    expect(longDate('2026-07-27')).toBe('27.07.2026');
  });

  it('разбирает DD.MM.YYYY обратно в ISO', () => {
    expect(parseDate('27.07.2026')).toBe('2026-07-27');
    expect(parseDate('1.8.2026')).toBe('2026-08-01');
    expect(parseDate('  27.07.2026  ')).toBe('2026-07-27');
    expect(parseDate('27/07/2026')).toBe('2026-07-27');
    expect(parseDate('27-07-2026')).toBe('2026-07-27');
  });

  it('отбивает то, что датой не является', () => {
    expect(parseDate('')).toBeNull();
    expect(parseDate('27.07')).toBeNull();
    expect(parseDate('27.07.26')).toBeNull();
    expect(parseDate('вчера')).toBeNull();
    expect(parseDate('00.07.2026')).toBeNull();
    expect(parseDate('27.13.2026')).toBeNull();
  });

  it('отбивает несуществующий день, прошедший по маске', () => {
    expect(parseDate('31.02.2026')).toBeNull();
    expect(parseDate('31.04.2026')).toBeNull();
    // 2028 — високосный, 29 февраля в нём есть.
    expect(parseDate('29.02.2028')).toBe('2028-02-29');
    expect(parseDate('29.02.2026')).toBeNull();
  });

  it('переживает круговой обход ISO → строка → ISO', () => {
    for (const iso of ['2026-01-01', '2026-12-31', '2026-08-09']) {
      expect(parseDate(longDate(iso))).toBe(iso);
    }
  });
});

describe('maskDate', () => {
  it('расставляет точки по мере посимвольного набора «25072026»', () => {
    // Каждый шаг — то, что реально приходит в поле: предыдущая маска плюс
    // символ, который человек только что нажал.
    const keys = ['2', '5', '0', '7', '2', '0', '2', '6'];
    const states: string[] = [];
    let value = '';
    for (const key of keys) {
      value = maskDate(value + key, value);
      states.push(value);
    }

    expect(states).toEqual([
      '2',
      '25.',
      '25.0',
      '25.07.',
      '25.07.2',
      '25.07.20',
      '25.07.202',
      '25.07.2026',
    ]);
  });

  it('ставит точку сразу после полных двух цифр дня и месяца', () => {
    expect(maskDate('2')).toBe('2');
    expect(maskDate('25')).toBe('25.');
    expect(maskDate('2507')).toBe('25.07.');
    expect(maskDate('25072')).toBe('25.07.2');
    expect(maskDate('25072026')).toBe('25.07.2026');
  });

  it('вставка из буфера обмена: с точками и голыми цифрами — один результат', () => {
    expect(maskDate('27.07.2026')).toBe('27.07.2026');
    expect(maskDate('27072026')).toBe('27.07.2026');
  });

  it('естественный backspace стирает точку вместе с цифрой под ней', () => {
    expect(maskDate('25.07', '25.07.')).toBe('25.0');
    expect(maskDate('25', '25.')).toBe('2');
  });

  it('отбрасывает всё нецифровое', () => {
    expect(maskDate('25a07')).toBe('25.07.');
  });

  it('режет ввод длиннее восьми цифр', () => {
    expect(maskDate('270720261999')).toBe('27.07.2026');
  });

  it('пустая строка остаётся пустой', () => {
    expect(maskDate('')).toBe('');
  });
});
