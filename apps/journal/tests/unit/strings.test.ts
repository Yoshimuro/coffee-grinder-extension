import { describe, expect, it } from 'vitest';

import { STR, modeName, stageName, t } from '../../src/data/strings.js';
import { KNOWN_DEVICES, TRAITS, TRAIT_KEYS } from '../../src/data/traits.js';
import { STAGE_KEYS } from '../../src/domain/stages.js';

describe('STR — таблицы строк', () => {
  /*
   * 146 ключей — дословный порт `data.js` (не 145, как называют data-js-report
   * §4 и требования BJ-3: это ошибка счёта, проверено сверкой с первоисточником,
   * dev_notes). Остальное добавлено в BJ-4 под текст, который прототип держал
   * прямо в коде (`entryTitle`/`entrySub`/`entryMark`), в шаблоне конвертера
   * (`dbCountLine`, `calSuggestLine`) и тернарниками `ru ? … : …` по экранам
   * журнала. Число зафиксировано, чтобы новая строка не проехала молча:
   * поднимать его — часть работы, а не помеха ей.
   *
   * Последний подъём — S-6 (интеграция): 201 → 225. Группы G1 и G4 работу не
   * сдали, и текст полки, конструктора девайсов, настроек и домашнего экрана
   * переносился здесь же.
   */
  it('содержит 225 ключей в каждом языке', () => {
    expect(Object.keys(STR.ru)).toHaveLength(225);
    expect(Object.keys(STR.en)).toHaveLength(225);
  });

  it('множества ключей ru и en идентичны', () => {
    expect(Object.keys(STR.ru).sort()).toEqual(Object.keys(STR.en).sort());
  });

  it('не содержит пустых значений', () => {
    for (const lang of ['ru', 'en'] as const)
      for (const [key, value] of Object.entries(STR[lang])) {
        expect(value, `${lang}.${key}`).toBeTruthy();
      }
  });

  it('заморожен', () => {
    expect(Object.isFrozen(STR)).toBe(true);
    expect(Object.isFrozen(STR.ru)).toBe(true);
    expect(Object.isFrozen(STR.en)).toBe(true);
  });

  it('t() достаёт строку по ключу', () => {
    expect(t('nav_home', 'ru')).toBe('ГЛАВНЫЙ');
    expect(t('nav_home', 'en')).toBe('HOME');
  });
});

describe('stageName', () => {
  it('переводит все восемь ключей стадий', () => {
    for (const k of STAGE_KEYS) {
      expect(stageName(k, 'ru')).toBeTruthy();
      expect(stageName(k, 'en')).toBeTruthy();
    }
    expect(stageName('bloom', 'ru')).toBe('СМАЧИВАНИЕ');
    expect(stageName('drain', 'en')).toBe('DRAWDOWN');
    expect(stageName('pause', 'ru')).toBe('ПАУЗА');
    expect(stageName('valve', 'en')).toBe('OPEN VALVE');
  });
});

describe('modeName', () => {
  it('берёт три режима из TRAITS.flow, а drip и cup — из своих веток', () => {
    expect(modeName('perc', 'ru')).toBe('Пролив');
    expect(modeName('imm', 'en')).toBe('Immersion');
    expect(modeName('hybrid', 'ru')).toBe('Гибрид · клапан');
    expect(modeName('drip', 'ru')).toBe('ДРИП-ПАКЕТ');
    expect(modeName('drip', 'en')).toBe('DRIP BAG');
    expect(modeName('cup', 'ru')).toBe('Дегустация');
    expect(modeName('cup', 'en')).toBe('Tasting');
  });
});

describe('TRAITS и KNOWN_DEVICES', () => {
  it('описывают шесть групп признаков', () => {
    expect(TRAIT_KEYS).toEqual(['flow', 'bottom', 'wall', 'filter', 'material', 'vol']);
    expect(Object.keys(TRAITS.flow.opts)).toEqual(['perc', 'imm', 'hybrid']);
    expect(Object.keys(TRAITS.bottom.opts)).toHaveLength(4);
    expect(Object.keys(TRAITS.wall.opts)).toHaveLength(4);
    expect(Object.keys(TRAITS.filter.opts)).toHaveLength(6);
    expect(Object.keys(TRAITS.material.opts)).toHaveLength(4);
    expect(Object.keys(TRAITS.vol.opts)).toHaveLength(3);
  });

  it('каждая опция — пара [ru, en]', () => {
    for (const key of TRAIT_KEYS)
      for (const [opt, label] of Object.entries(TRAITS[key].opts)) {
        expect(label, `${key}.${opt}`).toHaveLength(2);
        expect(label[0]).toBeTruthy();
        expect(label[1]).toBeTruthy();
      }
  });

  it('каталог из трёх девайсов ссылается только на существующие опции', () => {
    expect(KNOWN_DEVICES.map((d) => d.id)).toEqual(['v60', 'switch', 'aero']);
    for (const d of KNOWN_DEVICES)
      for (const key of TRAIT_KEYS) {
        expect(Object.keys(TRAITS[key].opts), `${d.id}.${key}`).toContain(d[key]);
      }
  });
});
