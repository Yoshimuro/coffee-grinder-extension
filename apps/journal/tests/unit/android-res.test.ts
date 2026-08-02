/**
 * Ресурсы Android, которые проверяются только на gradle.
 *
 * BJ-9 потратил два прогона CI на две ошибки в каталоге `res/`, и обе прошли
 * мимо всего остального: `npm run verify` зелёный, e2e зелёные, APK не
 * собирается. Причина у обеих одна — эти правила знает `aapt`, а не TypeScript,
 * и узнаёт он их на шаге `mergeResources`, до которого в контейнере без Android
 * SDK не доходит никто.
 *
 * Тест повторяет ровно те два правила, и стоит он один `readdir` и один разбор
 * XML на файл.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

const RES = join(dirname(fileURLToPath(import.meta.url)), '../../android/app/src/main/res');

const dirs = readdirSync(RES, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

const xmlFiles = dirs.flatMap((dir) =>
  readdirSync(join(RES, dir))
    .filter((f) => f.endsWith('.xml'))
    .map((f) => `${dir}/${f}`),
);

describe('имена каталогов ресурсов', () => {
  /*
   * Порядок квалификаторов фиксирован спецификацией: ориентация идёт раньше
   * `night`, плотность — позже. `drawable-night-port-xhdpi` не «хуже
   * читается», а невалиден, и gradle падает с «Invalid resource directory
   * name».
   */
  it('`night` стоит после ориентации и перед плотностью', () => {
    const wrong = dirs.filter((d) => /^drawable-night-(port|land)-/.test(d));
    expect(wrong).toEqual([]);
  });

  it('каждый ночной каталог сплэша имеет дневного близнеца', () => {
    const night = dirs.filter((d) => d.includes('-night-') || d === 'drawable-night');
    const missing = night.filter(
      (d) => !dirs.includes(d === 'drawable-night' ? 'drawable' : d.replace('-night', '')),
    );
    expect(missing).toEqual([]);
  });
});

describe('XML ресурсов', () => {
  it('есть что проверять', () => {
    // Иначе тест выше молча зеленеет на пустом списке.
    expect(xmlFiles.length).toBeGreaterThan(0);
  });

  /*
   * XML запрещает две чёрточки подряд внутри комментария. Имена CSS-токенов
   * (`--bg`, `--text`) в пояснениях к палитре нативной оболочки нарушают это
   * буквой в букву, а `aapt` не предупреждает, а роняет сборку.
   */
  it('в комментариях нет двух чёрточек подряд', () => {
    const offenders = xmlFiles.filter((rel) => {
      const text = readFileSync(join(RES, rel), 'utf8');
      return [...text.matchAll(/<!--([\s\S]*?)-->/g)].some((m) => (m[1] ?? '').includes('--'));
    });
    expect(offenders).toEqual([]);
  });
});
