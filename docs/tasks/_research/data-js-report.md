# Отчёт по анализу `data.js` (design_handoff_brew_journal 3)

Файл: `/Users/User/Projects/Personal/coffee-grinder-extension/design_handoff_brew_journal 3/data.js`, 195 строк, целиком прочитан. Числовые утверждения ниже перепроверены выполнением кода файла в изолированном Node-контексте (без изменения файла).

## 1. Все top-level символы и их точная форма

| Символ | Строки | Тип | Форма |
|---|---|---|---|
| `TODAY` | `data.js:2` | `string` | ISO-дата `'2026-08-01'` |
| `GRINDERS` | `data.js:4-7` | `Record<string, GrinderEntry>` | ключи `c40`, `s3`; поля `name, unit:{ru,en}, step, zero, max, dp` |
| `GRINDER_DB` | `data.js:8-33` | `Array<GrinderDbEntry>` | 24 элемента; поля `id, short, name, step, zero, dp` |
| `UNCERT` | `data.js:34` | `number` (не экспортируется!) | `12` — модульная константа, не `export const` |
| `toUm` | `data.js:35` | `(g, v) => number` | `GRINDERS[g].zero + GRINDERS[g].step * v` |
| `fromUm` | `data.js:36` | `(g, um) => number` | `(um - GRINDERS[g].zero) / GRINDERS[g].step` |
| `convert` | `data.js:37-42` | `function(from, to, val, calib=0) => {um, center, lo, hi}` | см. п.7 |
| `ageDays` | `data.js:44` | `(roast, today=TODAY) => number` | дни между датами, округление |
| `phaseOf` | `data.js:45` | `(d) => 'degas'\|'peak'\|'fade'` | см. п.8 |
| `fmtT` | `data.js:46` | `(s) => string` | `M:SS` |
| `WHEEL` | `data.js:50-96` | `Array<Category>` | см. п.2 |
| `DESC` | `data.js:97-98` | `Record<string, {ru,en,cat,sub,h,c}>` | построен через `forEach`, побочный эффект инициализации модуля |
| `catColor` | `data.js:99` | `(cat, l=0.7, cMul=1, a=1) => string` | строка `oklch(...)` |
| `TRAITS` | `data.js:102-109` | `Record<string, {ru,en,opts}>` | 6 групп признаков девайса, см. п.5 |
| `KNOWN_DEVICES` | `data.js:110-114` | `Array<Device>` | 3 записи (`v60`, `switch`, `aero`) |
| `seedDevices` | `data.js:115` | `() => []` | всегда возвращает **пустой массив** |
| `seedShelf` | `data.js:118-122` | `() => Array<Bean>` | 3 демо-пачки |
| `seedJournal` | `data.js:125-142` | `() => Array<Entry>` | 6 демо-записей |
| `advice` | `data.js:145-155` | `(d, lang) => string[]` | правила-советы по диагностике |
| `STR` | `data.js:158-193` | `{ru: Record<string,string>, en: Record<string,string>}` | 145/145 ключей (см. п.4) |
| `stageName` | `data.js:194` | `(k, lang) => string` | `STR[lang]['t_' + k] || k` |
| `modeName` | `data.js:195` | `(m, lang) => string` | см. п.5 |

## 2. `WHEEL` — словарь колеса вкусов

Иерархия: **категория → подкатегория (`sub`) → дескриптор (`d`)**.

- Категория (`data.js:51,59,64,69,73,78,82,86,91`): `{ id, ru, en, h, c, sub: [...] }`
  - `h` — hue (°) для `oklch`, `c` — chroma (константа для всей категории, не по подкатегории/дескриптору)
  - `sub`: `{ id, ru, en, d: [...] }`
    - `d`: элементы — позиционные 3-tuple **`[id, ru, en]`** (не объект), напр. `['strawberry','Клубника','Strawberry']` (`data.js:52`)

Точные подсчёты (проверено программно):
- Категорий: **9** (`fruit, floral, sweet, nutty, spice, roast, green, ferment, other`)
- Подкатегорий: **27** (не 26 — см. п.10)
- Дескрипторов (листьев `d`): **102**, дубликатов id не найдено (`Duplicate descriptor ids: 0`)

Формат id дескриптора: короткий английский slug без разделителей, `camelCase`/`lowercase` строчными буквами, напр. `blackcurrant`, `scherry` (кисло-вишня), `dapricot` (курага), `cocoad` (какао как ингредиент, чтобы не путать с категорией `cocoa`/подкатегорией `cocoa`).

Экстра-поля — да, цветовая геометрия:
- `h` (hue, 0–360) — на уровне категории, у категорий `data.js:51-95`, ряд значений: fruit 20, floral 330, sweet 85, nutty 55, spice 45, roast 30, green 150, ferment 310, other 250.
- `c` (chroma для oklch) — тоже на уровне категории, 0.04–0.16.
- Подкатегории и дескрипторы своих `h`/`c` не имеют — цвет наследуется от родительской категории через `DESC[id].h/c` (см. п.3).

## 3. `DESC` — плоский индекс по WHEEL

`data.js:97-98`:
```js
export const DESC = {}; // id → {ru,en,cat,sub,h,c}
WHEEL.forEach((cat) => cat.sub.forEach((s) => s.d.forEach(([id, ru, en]) => { DESC[id] = { ru, en, cat: cat.id, sub: s.id, h: cat.h, c: cat.c }; })));
```
- Это денормализованная проекция всех листьев `WHEEL` в один плоский словарь `descriptorId → {ru, en, cat, sub, h, c}`.
- `cat`/`sub` — обратные ссылки на id родительской категории/подкатегории (для восстановления пути без обхода дерева).
- `h`/`c` скопированы из категории — таким образом каждый дескриптор несёт цвет своей категории, не имея собственного.
- Заполняется **побочным эффектом** при загрузке модуля (мутация `{}` в forEach), а не через `Object.fromEntries`/`map` — стоит учитывать при порте (см. п.11).
- Количество ключей `DESC` совпадает с числом дескрипторов WHEEL: **102** (программно подтверждено).
- Используется как источник истины для рендера тегов в журнале — `Entry.desc` (см. п.9) хранит **пары `[descriptorId, intensity]`**, а не копии `{ru,en}`, т.е. без `DESC` исторические записи журнала нельзя отобразить текстом.

## 4. `STR` — таблицы строк RU/EN

`data.js:158-193`. Структура: `{ ru: {...145 keys}, en: {...145 keys} }`, оба объекта плоские (без вложенности).

- Точное количество ключей: **145 в `ru` и 145 в `en`**, множества ключей идентичны (проверено программно), т.е. таблицы полностью параллельны — нет ни забытых переводов, ни лишних ключей в одном языке.
- Соглашение об именовании — префикс экрана/фичи + `_` + смысловое слово: `nav_*`, `home_*`, `conv_*`, `shelf_*`, `bean_*`, `dev_*`, `brew_*`, `t_*` (таймер/стадии), `rate_*`, `diag_*`, `wheel_*`, `log_*`, `set_*`, `note_*`, `spec_*`, `phase_*`, `form_*`; плюс горстка безпрефиксных общих ключей (`back`, `days`, `grams`, `pcs`).
- Распределение по префиксам (топ): `brew_` 17, `conv_` 15, `t_` 15, `bean_` 11, `log_` 11, `diag_` 10, `wheel_` 10, `set_` 10, `home_` 8, `shelf_` 6, `dev_` 6, `spec_` 5, `nav_` 4, `note_` 4, `phase_` 3, `form_` 3, `rate_` 3, плюс `back/days/grams/pcs` по 1.
- Поиск строки предполагается прямым доступом по свойству: `STR[lang][key]`. Единственный динамический паттерн в файле — `stageName`, где ключ **конструируется на лету** конкатенацией `'t_' + k` с фолбэком на сырой `k`, если ключа нет (`data.js:194`).

## 5. `TRAITS` — enum-признаки девайсов

`data.js:102-109`. Структура каждой группы: `{ ru, en, opts: { optKey: [ru, en], ... } }`.

6 групп признаков (`data.js:102-108`):
| Группа | Ключи `opts` |
|---|---|
| `flow` | `perc, imm, hybrid` |
| `bottom` | `cone, flat, basket, cyl` |
| `wall` | `ribs, spiral, petal, smooth` |
| `filter` | `pcone, wave, pflat, metal, cloth, built` |
| `material` | `ceramic, glass, plastic, metal` |
| `vol` | `s, m, l` (лейблы содержат числовой префикс `'01 · до 300 мл'` и т.п.) |

`KNOWN_DEVICES` (`data.js:110-114`) — 3 «известных» девайса-каталог (`v60`, `switch`, `aero`), каждый описан набором признаков-ключей из `TRAITS` (`flow, bottom, wall, filter, material, vol`) плюс `id, name` — форма совпадает с README-описанием Device.

`modeName` (`data.js:195`) читает `TRAITS.flow.opts[m]` для режимов `perc/imm/hybrid`, а `drip`/`cup` обрабатывает отдельными явными ветками — т.е. `Entry.mode` частично пересекается с `TRAITS.flow` opts, частично нет (см. п.11).

## 6. `GRINDER_DB` — база кофемолок

`data.js:8-33`, 24 записи. Схема каждой записи ровно 6 полей (проверено программно — форма одинакова у всех 24): `{ id, short, name, step, zero, dp }`.

- `id` — короткий slug (`c40`, `ek43`, `jmax`, …)
- `short` — короткое отображаемое имя (`'C40'`, `'EK43'`, …)
- `name` — полное название модели, иногда с уточнением в скобках (`'Mahlkönig EK43 ICON (coffee, dial 1-16)'`, `data.js:10`)
- `step` — µm на щелчок/деление (числа с плавающей точкой у части записей: `jmax` 8.8, `s3db` 8.7)
- `zero` — µm-смещение нулевой точки
- `dp` — decimal places для отображения (у большинства `0`, у `s3db` — `1`)

Единиц измерения (`unit`) в `GRINDER_DB` **нет** — в отличие от `GRINDERS` (см. п.10, противоречие с README).

Отдельно `GRINDERS` (`data.js:4-7`) — компактный словарь из **2** записей (`c40`, `s3`), с полями `name, unit:{ru,en}, step, zero, max, dp` (`max` — максимум делений шкалы, есть только здесь, в `GRINDER_DB` отсутствует).

## 7. Формулы конвертации помола (verbatim)

```js
const UNCERT = 12; // µm — пересчёт между жерновами приблизителен
export const toUm = (g, v) => GRINDERS[g].zero + GRINDERS[g].step * v;
export const fromUm = (g, um) => (um - GRINDERS[g].zero) / GRINDERS[g].step;
export function convert(from, to, val, calib = 0) {
  const um = toUm(from, val);
  const c = fromUm(to, um) + calib;
  const r = (x) => Math.max(0, Math.round(x * 10) / 10);
  return { um: Math.round(um), center: r(c), lo: r(fromUm(to, um - UNCERT) + calib), hi: r(fromUm(to, um + UNCERT) + calib) };
}
```
(`data.js:34-42`)

- `toUm(g, v)`: значение → µm по прямой линейной формуле `zero + step*v`.
- `fromUm(g, um)`: обратное преобразование µm → значение шкалы, `(um - zero) / step`.
- `convert(from, to, val, calib=0)`: from-грелка → µm через `toUm`, затем µm → to-грелка через `fromUm`, плюс калибровочный сдвиг `calib` (применяется **только** к `center/lo/hi`, но не к `um`, см. п.11).
- Диапазон ±12 µm: `UNCERT = 12` — не экспортируется из модуля (локальная константа), используется только внутри `convert` для расчёта `lo`/`hi` вокруг `um - UNCERT` / `um + UNCERT`.
- Округление: локальная функция `r = (x) => Math.max(0, Math.round(x * 10) / 10)` — всегда до 1 знака после запятой и floor-clamped на 0 снизу (нет отрицательных результатов). Поле `dp` кофемолки в этой функции **не используется** — `r()` жёстко округляет до 0.1 вне зависимости от `GRINDERS[to].dp`. `um` округляется отдельно через `Math.round(um)` (целое число микрон).
- Возвращаемая форма: `{ um: number, center: number, lo: number, hi: number }`.

## 8. Фазы свежести

`data.js:45`:
```js
export const phaseOf = (d) => (d < 4 ? 'degas' : d <= 21 ? 'peak' : 'fade');
```
Пороги (в днях от даты обжарки, вычисленных через `ageDays`, `data.js:44`):
- `d < 4` → `'degas'` (дегазация)
- `4 <= d <= 21` → `'peak'` (пик)
- `d > 21` → `'fade'` (спад)

Лейблы в `STR`: `phase_degas: 'дегазация'/'degassing'`, `phase_peak: 'пик'/'peak'`, `phase_fade: 'спад'/'fading'` (`data.js:162,179`).

`ageDays(roast, today=TODAY)` (`data.js:44`): `Math.round((new Date(today) - new Date(roast)) / 864e5)` — разница дат в мс, делённая на `864e5` (86 400 000 = мс/сутки), округлена до целого.

## 9. Демо-сиды

- **Кофемолки**: отдельной seed-функции нет — роль «сида» играют сами `GRINDERS` (2 записи, статичны) и `GRINDER_DB` (24 записи, статичный каталог, не функция).
- **Девайсы**: `seedDevices()` (`data.js:115`) — **пустой массив всегда**, т.е. у демо-пользователя нет «своих» девайсов по умолчанию; каталог «известных» девайсов лежит отдельно в `KNOWN_DEVICES`.
- **Полка (бины)**: `seedShelf()` (`data.js:118-122`) — 3 записи, 3 разные формы (`form`):
  - `java` (`form:'beans'`) — поля `weight, left` (граммы)
  - `drip1` (`form:'drip'`) — поля `count, leftCount, dose` (штуки + фикс.доза)
  - `kenya` (`form:'ground'`) — поля `weight, left` (граммы)
  - Общие поля: `id, form, name, roaster, roast, photos` (у всех — `photos` целое число-счётчик, см. п.10).
- **Журнал**: `seedJournal()` (`data.js:125-142`) — 6 записей `j1..j6`. Одна запись `pending` без диагностики (`j1`, `status:'pending'`, нет `diag`/`desc`), пять — `done` с полными `diag:{acid,bitter,body,balance}` и `desc:[[id,intensity], ...]`. У `j2` (hybrid) есть `valveAt`, у `j6` (imm/AeroPress) — `stirAt` и `grind: null`, у `j5` (drip) вместо `stages` — `pours: 3`. Все `stages` — массивы триплетов `[key, durationSec, waterG]`.

## 10. Расхождения с «Модель данных» из `README.md`

README (`README.md:86-92,65`) заявляет:

1. **Число подкатегорий WHEEL.** README: *«9 категорий → 26 подкатегорий → ~100 дескрипторов»* (`README.md:65`). Фактически: 9 категорий — верно; но подкатегорий **27**, не 26 (пересчитано программно и вручную по `data.js:50-96`); дескрипторов 102, что укладывается в «~100».
2. **Форма `GrinderDB`.** README: *«**Grinder** (своя): {id, name, step µm/клик, zero µm, unit}. **GrinderDB**: то же + short»* (`README.md:87`) — то есть подразумевается, что GrinderDB-запись включает `unit`. Фактически записи `GRINDER_DB` (`data.js:9-32`) **не содержат `unit`** вообще — только `id, short, name, step, zero, dp`. Поле `dp` в README не упомянуто вовсе (ни для Grinder, ни для GrinderDB).
3. **Несовпадение id одной и той же кофемолки.** `GRINDERS` использует ключ `s3` (`data.js:6`), а `GRINDER_DB` для той же модели (Timemore Chestnut S3) использует id `s3db` (`data.js:18`). README нигде не отмечает существование двух разных идентификаторных пространств для одной физической кофемолки.
4. **`photos` — не массив.** README: *«**Bean**: {..., photos[], ...}»* (`README.md:88`), явно подразумевая массив. В `seedShelf()` (`data.js:119-121`) `photos` — это просто число-счётчик (`photos: 2`, `photos: 1`), а не массив фото.
5. **`max` в `GRINDERS` не задокументирован.** Поле `max` (`data.js:5-6`, дисковый предел прибора) отсутствует в описании модели Grinder в README.
6. **`UNCERT`/структура результата `convert()` не описаны в разделе модели данных.** README упоминает «диапазон» только описательно в UI-разделе (`README.md` ближе к строке про конвертер), но в разделе «Модель данных» не фиксирует форму `{um, center, lo, hi}` и константу ±12 µm.
7. **`KNOWN_DEVICES` не упомянут** в разделе модели данных вовсе (только форма `Device` через `TRAITS`, `README.md:89`) — не оговорено, что помимо пользовательских устройств есть встроенный каталог из 3 записей.
8. **Вспомогательные функции** `advice()`, `stageName()`, `modeName()`, `catColor()` в README не упомянуты (README описывает их эффект в других разделах текстом — напр. про советы в диагностике, — но не как программные сущности `data.js`).

Что **совпадает** с README и подтверждено: 9 категорий WHEEL, форма `Device` (`id,name,flow,bottom,wall,filter,material,vol`), список стадийных ключей `bloom, pour, drain, steep, stir, press, valve, pause` (соответствует `t_*`-ключам `STR`, `data.js:167,184`), формат `Entry.desc` как пары `[descriptorId, intensity]`, `mode` включая `cup`.

## 11. Заметки к порту на TypeScript

**Инварианты, которые нельзя нарушать:**
- **Id дескрипторов WHEEL/DESC** — это внешний ключ, на который ссылаются исторические записи журнала (`Entry.desc: [[id, intensity], ...]`, `data.js:130` и др.) как на голые строки, без копии `{ru,en}`. Порт должен относиться к множеству id как к append-only контракту: переименование/переиспользование id задним числом «сломает» уже сохранённые записи. То же — для ключей `TRAITS[group].opts` (используются как значения полей `Device`/`Entry.mode`) и для id `GRINDER_DB`.
- **Асимметрия `calib` в `convert()`**: `calib` прибавляется к `center/lo/hi`, но не к `um` (`data.js:38-41`) — при типизации сигнатуры это стоит явно задокументировать (JSDoc/комментарий), иначе легко случайно «выровнять» все 4 поля и получить регрессию.
- **Несовпадение id `s3` vs `s3db`** между `GRINDERS` и `GRINDER_DB` нужно устранить осознанно (выбрать единый canonical id) при объединении этих двух структур в один реестр.

**Подводные камни типизации:**
- Дескрипторные тройки `[id, ru, en]` (`data.js:52` и далее) и опции `TRAITS[...].opts[key]: [ru, en]` (`data.js:103-108`) — позиционные tuple-литералы; при ручном наборе типов легко перепутать порядок `ru`/`en`. Нужен строгий tuple-тип (`readonly [string, string, string]`), а не widening до `string[]`.
- Поле `dp` у кофемолок сейчас **не используется** внутри `data.js` — функция округления `r()` в `convert()` жёстко зашивает 1 знак после запятой (`data.js:40`) независимо от `dp`. При переносе стоит явно решить: `dp` — это только про форматирование отображения (отдельный слой), либо `convert()` должен фактически учитывать его — сейчас это несостыковка/недописанная связь, которую легко унаследовать как баг.
- `fmtT` (`data.js:46`) смешивает округление: `Math.floor(s / 60)` берёт **неокруглённое** `s`, а секунды считаются от `Math.round(s) % 60`. Подтверждено экспериментально: `fmtT(119.6)` даёт `"1:00"` вместо ожидаемых `"2:00"` — пограничный баг, который нужно осознанно воспроизвести или исправить при порте, задокументировав решение.
- `modeName()` (`data.js:195`) объединяет два разных enum-пространства: `Entry.mode` (`perc|imm|hybrid|drip|cup`) частично совпадает с ключами `TRAITS.flow.opts` (`perc|imm|hybrid`), а `drip`/`cup` — отдельные литералы вне `TRAITS`. При типизации не сводить `Mode` и `TRAITS.flow` opts-ключи к одному типу.
- `DESC` строится императивным `forEach`-побочным эффектом на этапе загрузки модуля (`data.js:97-98`), а не чистым `Object.fromEntries`/`reduce` — в ESM-модуле это исполнится один раз при импорте, но при переносе стоит сделать построение явной чистой функцией и заморозить результат (`Object.freeze`), чтобы исключить случайную мутацию в рантайме.
- `UNCERT` не экспортируется (`data.js:34`, обычный `const`, без `export`) — при разбиении на модули её либо нужно явно экспортировать из модуля с `convert`, либо она должна остаться приватной деталью реализации именно этого модуля.

**Предлагаемое разбиение на модули** (по естественным секциям-комментариям самого файла: `data.js:1,48,101,117,124,144,157`):
- `grinders.ts` — `GRINDERS`, `GRINDER_DB`, `toUm`, `fromUm`, `convert`, `UNCERT` (чистые числовые функции, легко unit-тестируемы отдельно).
- `freshness.ts` — `TODAY`, `ageDays`, `phaseOf`.
- `format.ts` — `fmtT` (и, вероятно, budущие форматтеры).
- `wheel.ts` — `WHEEL`, `DESC`, `catColor`.
- `devices.ts` — `TRAITS`, `KNOWN_DEVICES`, `seedDevices`.
- `diagnostics.ts` — `advice`.
- `strings/{ru,en,index}.ts` — `STR`, `stageName`, `modeName` (двум последним нужен импорт и из `strings`, и из `devices` — возможен риск циклического импорта между `strings` и `devices`, стоит явно спроектировать направление зависимости).
- `seeds/*.ts` — `seedShelf`, `seedJournal` (демо-данные для разработки; вероятно, должны быть исключены из production-бандла или спрятаны за флагом).