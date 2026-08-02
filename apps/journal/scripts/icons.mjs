/**
 * Генератор иконок и сплэша (BJ-6, D-5).
 *
 * Иконка временная и осознанно минимальная: тёмный квадрат #0C0C0C и моно-глиф
 * «BJ» цветом текста. Дизайн-иконку заказывают отдельно — до тех пор в APK не
 * должно стоять ни логотипа Capacitor, ни белого квадрата, потому что первое
 * врёт про авторство, а второе бьётся с dark-only интерфейсом на первом же
 * кадре запуска.
 *
 * Почему скрипт, а не двадцать закоммиченных PNG «откуда-то». Бинарник в
 * репозитории без происхождения нельзя ни проверить, ни поправить: смена цвета
 * фона превратилась бы в ручную перерисовку двадцати файлов. Здесь источник —
 * этот файл, а PNG пересобираются `node scripts/icons.mjs`.
 *
 * Почему без зависимостей. PNG с фильтром 0 — это zlib поверх строк пикселей,
 * а zlib есть в Node. Тянуть в проект `sharp` или `canvas` ради заливки и
 * тридцати квадратиков — несоразмерно, тем более что обе библиотеки нативные.
 *
 * Растровая пятёрка на семь — не «шрифт», а сетка: буквы в макете моноширинные
 * и прямоугольные, и на 48 px иконки любой настоящий шрифт всё равно
 * превратится в такую же сетку, только с ошибками хинтинга.
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '..');
const RES = resolve(APP, 'android/app/src/main/res');
const PUBLIC = resolve(APP, 'public/icons');

/**
 * Палитра — `tokens.css`, дословно, обе темы (BJ-9).
 *
 * Тем две только у сплэша. Иконка лаунчера остаётся тёмной всегда и намеренно:
 * она живёт на чужой поверхности — на рабочем столе, — и должна быть узнаваема
 * независимо от того, что человек выбрал внутри приложения.
 */
const THEMES = {
  dark: { bg: [0x0c, 0x0c, 0x0c, 0xff], fg: [0xed, 0xed, 0xeb, 0xff] },
  light: { bg: [0xf7, 0xf7, 0xf4, 0xff], fg: [0x17, 0x17, 0x15, 0xff] },
};

const CLEAR = [0, 0, 0, 0];

/* ── Глиф ────────────────────────────────────────────────────────────────── */

const GLYPHS = {
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
};

const WORD = 'BJ';
const GLYPH_H = 7;
/** Ширина слова в клетках: буквы по пять плюс один пробел между ними. */
const GLYPH_W = WORD.length * 5 + (WORD.length - 1);

/** Клетки слова как множество координат `x,y`. */
function wordCells() {
  const cells = new Set();
  let ox = 0;
  for (const ch of WORD) {
    const rows = GLYPHS[ch];
    for (let y = 0; y < GLYPH_H; y++)
      for (let x = 0; x < 5; x++) {
        if (rows[y][x] === '1') cells.add(`${ox + x},${y}`);
      }
    ox += 6;
  }
  return cells;
}

const CELLS = wordCells();

/* ── Растр ───────────────────────────────────────────────────────────────── */

/**
 * Рисует картинку.
 *
 * `shape` — чем залит фон: квадратом целиком, вписанным кругом (round-иконка
 * Android) или ничем (foreground адаптивной иконки, где фон рисует система).
 * `cover` — какую долю меньшей стороны занимает слово: у адаптивной иконки
 * безопасная зона составляет 66 из 108, поэтому глиф в ней заметно мельче.
 * `theme` — какая из двух пар цветов берётся; по умолчанию тёмная, потому что
 * тёмной остаётся вся иконочная часть.
 */
function draw(width, height, { shape = 'square', cover = 0.46, theme = 'dark' } = {}) {
  const { bg: BG, fg: FG } = THEMES[theme];
  const px = Buffer.alloc(width * height * 4);
  const put = (x, y, rgba) => {
    const at = (y * width + x) * 4;
    px[at] = rgba[0];
    px[at + 1] = rgba[1];
    px[at + 2] = rgba[2];
    px[at + 3] = rgba[3];
  };

  const short = Math.min(width, height);
  const r = short / 2;
  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const inside =
        shape === 'square'
          ? true
          : shape === 'circle'
            ? (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r
            : false;
      put(x, y, inside ? BG : CLEAR);
    }

  // Клетка — целое число пикселей: дробная дала бы разную толщину штрихов у
  // соседних букв, что на 48 px видно сразу.
  const cell = Math.max(1, Math.floor((short * cover) / GLYPH_W));
  const left = Math.round((width - cell * GLYPH_W) / 2);
  const top = Math.round((height - cell * GLYPH_H) / 2);

  for (const key of CELLS) {
    const [gx, gy] = key.split(',').map(Number);
    for (let y = 0; y < cell; y++)
      for (let x = 0; x < cell; x++) {
        put(left + gx * cell + x, top + gy * cell + y, FG);
      }
  }

  return px;
}

/* ── PNG ─────────────────────────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const body = Buffer.concat([head.subarray(4), data]);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([head, data, tail]);
}

/** RGBA8 без интерлейса, фильтр 0 на каждой строке. */
function png(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // бит на канал
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function emit(path, width, height, options) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, png(width, height, draw(width, height, options)));
  return `${path.replace(APP + '/', '')}  ${width}×${height}`;
}

/* ── Что именно генерируется ─────────────────────────────────────────────── */

const DENSITIES = [
  ['mdpi', 48, 108],
  ['hdpi', 72, 162],
  ['xhdpi', 96, 216],
  ['xxhdpi', 144, 324],
  ['xxxhdpi', 192, 432],
];

/**
 * Ночной двойник каталога ресурсов.
 *
 * Порядок квалификаторов в имени каталога фиксирован спецификацией Android:
 * `night` идёт перед ориентацией и плотностью, поэтому вставляется сразу после
 * `drawable`, а не приписывается в конец.
 */
function nightDir(dir) {
  return dir === 'drawable' ? 'drawable-night' : dir.replace('drawable-', 'drawable-night-');
}

/** Сплэш: размеры ровно те, что создал `cap add android`. */
const SPLASH = [
  ['drawable', 480, 320],
  ['drawable-port-mdpi', 320, 480],
  ['drawable-port-hdpi', 480, 800],
  ['drawable-port-xhdpi', 720, 1280],
  ['drawable-port-xxhdpi', 960, 1600],
  ['drawable-port-xxxhdpi', 1280, 1920],
  ['drawable-land-mdpi', 480, 320],
  ['drawable-land-hdpi', 800, 480],
  ['drawable-land-xhdpi', 1280, 720],
  ['drawable-land-xxhdpi', 1600, 960],
  ['drawable-land-xxxhdpi', 1920, 1280],
];

const written = [];

for (const [density, legacy, foreground] of DENSITIES) {
  written.push(emit(`${RES}/mipmap-${density}/ic_launcher.png`, legacy, legacy));
  written.push(
    emit(`${RES}/mipmap-${density}/ic_launcher_round.png`, legacy, legacy, { shape: 'circle' }),
  );
  written.push(
    emit(`${RES}/mipmap-${density}/ic_launcher_foreground.png`, foreground, foreground, {
      shape: 'none',
      // 66 из 108 — безопасная зона адаптивной иконки; глиф занимает её часть.
      cover: 0.3,
    }),
  );
}

/*
 * Сплэш рисуется дважды. Тёмный уезжает в `-night`, светлый — в безымянный
 * каталог: так устроен сам Android, «день» безымянен.
 *
 * Квалификатор `night` здесь следует НЕ системной теме телефона, а выбору
 * приложения — потому что тот выбор сообщается системе через
 * `UiModeManager#setApplicationNightMode` (`ShellThemePlugin`). Ровно это и
 * убирает тёмный кадр при холодном старте у человека со светлой темой.
 * Разнимать пару «night-ресурсы + setApplicationNightMode» нельзя: сами по себе
 * ресурсы начнут следовать телефону и разойдутся с выбором.
 */
for (const [dir, w, h] of SPLASH) {
  // На сплэше глиф мелкий: это не логотип во весь экран, а метка запуска.
  written.push(emit(`${RES}/${dir}/splash.png`, w, h, { cover: 0.13, theme: 'light' }));
  written.push(
    emit(`${RES}/${nightDir(dir)}/splash.png`, w, h, { cover: 0.13, theme: 'dark' }),
  );
}

for (const size of [192, 512]) {
  written.push(emit(`${PUBLIC}/icon-${size}.png`, size, size));
}

console.log(`Нарисовано ${written.length} файлов:`);
for (const line of written) console.log('  ' + line);
