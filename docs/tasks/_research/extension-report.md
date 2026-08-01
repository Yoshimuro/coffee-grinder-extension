I have all the material needed. Now compiling the report.

---

# Отчёт: Chrome-расширение "Grind Converter" (coffee-grinder-extension)

## 1. Что расширение делает сегодня (user-facing)

Popup-расширение Chrome отвечает на один вопрос: «я мелю на 24 кликах на своей JX-Pro — на что поставить C40?» (README.md:3-4).

- Пользователь выбирает исходную кофемолку ("From"), крутит числовой степпер настройки, выбирает целевую кофемолку ("To") — расширение сразу показывает эквивалентную настройку (`src/ui/popup.ts:69-116`).
- Каталог из 134 кофемолок ищется через комбобокс с текстовым поиском (а не через `<select>`): можно набрать несколько символов бренда/модели, либо развернуть список по брендам (свёрнутым по умолчанию) (README.md:9-11, `src/ui/grinder-picker.ts`).
- Под результатом показывается «диапазон неопределённости» (band), сколько микрон приходится на одну засечку целевой кофемолки (`resolutionMicrons`), список подходящих методов заваривания (эспрессо/пуровер/…​), и текстовое предупреждение, если целевая кофемолка физически не может достичь запрошенного помола, либо если калибровка одной из машин — не более чем оценка ("estimated") (`src/ui/popup.ts:94-140`).
- Последние выбор источника/цели/настройки и до 5 последних использованных кофемолок сохраняются в `chrome.storage.local` и подставляются при следующем открытии попапа (README.md:296-300, `src/ui/prefs.ts`).
- Никакого бэкенда/сети: датасет зашит в бандл (permission в манифесте — только `"storage"`, `src/manifest.json:10`).

## 2. Карта архитектуры

### Точки входа
- **`src/manifest.json`** — MV3-манифест: `action.default_popup: popup.html`, единственное разрешение `storage`, `minimum_chrome_version: "116"`, зафиксированный dev-ключ `key` (комментарий `$key_comment`), который жёстко привязывает id распакованного расширения к `ciegkfflbbhhnikhadbgncefaenaflhg` — это нужно только для того, чтобы e2e-тесты могли адресоваться по `chrome-extension://` URL напрямую (`src/manifest.json:12`, `tests/e2e/fixtures.ts:10-32`).
- **`src/ui/popup.html`** — единственная HTML-страница попапа, подключает `popup.css` и модульный скрипт `popup.ts`.
- **`vite.config.ts`** — единственная точка входа сборки: `root: src/ui`, `rollupOptions.input.popup = popup.html`; после сборки плагин `manifestPlugin` копирует `src/manifest.json` в `dist/manifest.json` "as is" (без генерации) (vite.config.ts:13-21).

### Модули и их зоны ответственности

| Путь | Ответственность |
|---|---|
| `src/core/types.ts` | Доменные типы: `Grinder`, `Calibration` (`linear`/`anchors`), `GrinderScale`, `Confidence`, `BrewMethod`, `Dataset`, константа `CONFIDENCE_TOLERANCE`. Никакого DOM/Chrome. |
| `src/core/convert.ts` | Вся математика конвертации: `settingToMicrons`, `micronsToSetting`, `convert`, `resolutionMicrons`, `methodsFor`, `formatSetting`, `settingSteps`, приватная кусочно-линейная `interpolate`/`extend`. |
| `src/core/dataset.ts` | Доступ к зашитому датасету: `DATASET` (импорт `src/generated/dataset.json`), `allGrinders`, `grinderById`, `displayName`, `searchGrinders`, `groupByBrand`. |
| `src/ui/popup.ts` | Контроллер попапа: связывает DOM-элементы (через `data-testid`), степпер настройки, рендер результата/предупреждений, инициализация пикеров, персист в `chrome.storage`. |
| `src/ui/grinder-picker.ts` | Самодостаточный виджет комбобокса поиска/выбора кофемолки (кнопка + выпадающая панель с поиском и списком). |
| `src/ui/prefs.ts` | Обёртка над `chrome.storage.local`: `Prefs`, `loadPrefs`, `savePrefs`, чистая функция `pushRecent`. |
| `src/ui/popup.css` | Вся визуальная тема (строгая типографика, без теней/градиентов), включая стили пикера. |
| `src/generated/dataset.json` | Скомпилированный, закоммиченный в git бандл датасета (README.md:269, `data/grinders/* → сборка`). |

README явно фиксирует границу переиспользуемости: `src/core` не зависит от `chrome.*` или DOM и тестируется в чистом Node (README.md:293-294, `src/ui/prefs.ts:24-27` — единственная функция, которая условно проверяет `typeof chrome !== 'undefined'`).

### UI-структура (`src/ui/popup.html`)
`<main class="app">` содержит: заголовок с `dataset-meta`; секцию "From" (`from-grinder` — точка монтирования пикера, степпер `from-setting`/`setting-down`/`setting-up`, подсказка `from-hint`); разделительную линию; секцию "To" (`to-grinder`, `<output>` результата `result-value`/`result-unit`, `result-band`); футер с `microns`, списком `methods` (`<ul class="chips">`) и скрытым предупреждением `warning`. Все элементы адресуются через `data-testid`, что одновременно и контракт для e2e-тестов, и точка расширения виджета (`src/ui/popup.html:16-52`).

## 3. База данных кофемолок

### Файлы
- Исходники (reviewable, по одному файлу на бренд/источник): `data/grinders/{1zpresso,beeancoffee,comandante,electric,misc-manual,theweldercatherine,timemore}.json`.
- Метаданные: `data/dataset.meta.json` — `{ version: 2, updated: "2026-08-01" }` (data/dataset.meta.json:3-4).
- Методы заваривания: `data/methods.json`.
- Скомпилированный бандл, который реально грузится в расширение: `src/generated/dataset.json` (генерируется `scripts/build-dataset.mjs`, коммитится в git, CI сверяет актуальность через `npm run check:data`).

### Точная схема записи `Grinder` (`src/core/types.ts:61-78`)

```ts
interface Grinder {
  id: string;                 // kebab-case slug, напр. "1zpresso-jx-pro"
  brand: string;
  model: string;
  type: 'manual' | 'electric';
  burr: string;                // свободный текст: "conical", "flat", …
  scale: {
    min: number;
    max: number;
    step: number;
    unit: 'click' | 'number' | 'mark';
    clicksPerRotation?: number;  // только для отображения
  };
  calibration:
    | { kind: 'linear'; micronsPerStep: number; zeroOffsetMicrons: number }
    | { kind: 'anchors'; points: Array<{ setting: number; microns: number }> };
  confidence: 'manufacturer' | 'community' | 'estimated';
  sources: string[];           // обязателен минимум 1 URL
  aliases?: string[];
  note?: string;
}
```

Плюс верхнеуровневые: `BrewMethod { id, name, min, max }` и `Dataset { version, generatedAt, grinders, methods }` (`src/core/types.ts:80-95`).

### Количество записей (фактическая проверка на `src/generated/dataset.json`)
- **134 кофемолки**, ровно как заявлено в README и обещано в задаче.
- По файлам: `1zpresso.json` — 7, `beeancoffee.json` — 73, `comandante.json` — 2, `electric.json` — 4, `misc-manual.json` — 3, `theweldercatherine.json` — 41, `timemore.json` — 4 (сумма = 134).
- По типу калибровки: `linear` — 68, `anchors` — 66.
- По доверию: `manufacturer` — 11, `community` — 120, `estimated` — 3 (совпадает с числами в README.md:61).
- 8 методов заваривания (`data/methods.json`).

### id-конвенция
`^[a-z0-9]+(-[a-z0-9]+)*$` (строгий kebab-case, проверяется в `scripts/build-dataset.mjs:59`), уникальность обеспечивается тем же валидатором (`scripts/build-dataset.mjs:62-66`). Скрипт `import-csv.mjs` формирует id как `slug(brand-model)` (`scripts/import-csv.mjs:191`).

### Единицы измерения
- Микроны (µm) — универсальный "interchange format" для сравнения помолов (README.md:19-23).
- `scale.unit` — единица измерения дисплея кофемолки: `click` (ручные с кликами), `number` (произвольная шкала, напр. Baratza Encore 1-40), `mark` (десятичная шкала с точкой, напр. `0.1` шаг).
- `clicksPerRotation` — не влияет на расчёт, только на форматирование строки "rotations.clicks" (`src/core/convert.ts:119-127`).

### Ингестия (3 пути + маппинг, задокументировано в README.md:80-234)
Все пути сходятся в один и тот же CSV-формат, который понимает `import-csv.mjs`:

1. **`scripts/scrape-sheets.mjs`** (229 строк) — обходит блог-серию (`--index`+`--path-contains` либо `--urls`), находит вложенные Google Sheets через `scripts/lib/sheet-links.mjs` (регэкспы `PUBLISHED`/`DOC`, извлечение вкладок через `extractTabs`), скачивает каждую вкладку явно через `export?format=csv&gid=…` (без gid Google отдаёт только первую вкладку — задокументированная ловушка, README.md:127-130), различает HTML-заглушку логина от настоящего CSV (`scrape-sheets.mjs:191-195`). Может подключить Playwright (`--browser`) для клиентского рендеринга.
2. **`scripts/pdf-table-to-csv.mjs`** (266 строк) — восстанавливает таблицы из PDF через `pdftotext -bbox-layout`, читая координаты слов (`xMin/yMin/xMax/yMax`), а не текст `-layout`, потому что заголовки, разбитые на несколько строк, склеиваются poppler'ом в один блок (README.md:152-156). Скармливается затем `scripts/twc-table-to-csv.mjs`.
3. **`scripts/beeancoffee-harvest.mjs`** (216 строк) — «просвечивает» сторонний конвертер `converter.beeancoffee.com/api/widget/v1`, который сам не публикует микроны: подаёт на вход referenced-кофемолку (по умолчанию Timemore Chestnut C2, 33 µm/клик, `REFERENCE_STEP = 33`) на 12 сэмплах кликов, читает соответствующие настройки цели, отбрасывает точки за пределами реального диапазона дозволенной кофемолки (сервис экстраполирует, а не клэмпит — `beeancoffee-harvest.mjs:158-161`), делает МНК-фит `microns = intercept + slope * setting` (функция `fit`, `beeancoffee-harvest.mjs:107-117`) и решает linear-vs-anchors по `worst residual < 0.03`. 1Zpresso исключён как недостоверный источник (`UNTRUSTED_MAKE`, `beeancoffee-harvest.mjs:57`).

Общий сходящийся шаг — **`scripts/twc-table-to-csv.mjs`** (607 строк) превращает "grinder-per-column" таблицы (одна колонка = кофемолка, значение колонки Mazzer ZM в микронах служит абсолютной привязкой) в шаблон `import-csv.mjs`, поддерживает `--compare` для сверки нового источника с уже загруженным датасетом (по общим кофемолкам, соотношение "что у нас / что у источника", `twc-table-to-csv.mjs:407-413`).

Финально **`scripts/import-csv.mjs`** (220 строк) читает CSV с колонками `brand, model, type, burr, min, max, step, unit, microns_per_step, zero_offset` **или** `anchors` (формат `"1:300; 6:800; …"`), плюс опциональные `clicks_per_rotation, confidence, aliases, note, source`; строки без калибровки пропускаются (не угадываются) и логируются в `skipped` (`import-csv.mjs:171-174`). Записи по умолчанию помечаются `confidence: 'community'`.

Всё завершает **`scripts/build-dataset.mjs`** (230 строк) — не просто JSON-валидация, а проверка на инвертируемость: строгая монотонность anchors по обеим осям (`build-dataset.mjs:108-116`), что якоря должны покрывать весь `scale.min..max` (`build-dataset.mjs:117-126`), уникальность id, наличие минимум одного источника, и печатает бюджет размера (raw/gzip на кофемолку, проекция на 1000 записей).

## 4. Логика конвертации

Вся математика — в **`src/core/convert.ts`**.

### Формулы

**Linear-калибровка** (`src/core/convert.ts:36-38`, определение в `src/core/types.ts:14-17`):
```
microns = zeroOffsetMicrons + setting * micronsPerStep
```
Обратная функция (`src/core/convert.ts:47-48`):
```
exact = (microns - zeroOffsetMicrons) / micronsPerStep
```

**Anchors-калибровка** (`src/core/convert.ts:39, 50, 147-183`) — кусочно-линейная интерполяция по отсортированным точкам `{setting, microns}`, за пределами крайних точек продолжается наклон крайнего сегмента (экстраполяция, а не clamp) через функцию `extend`.

**Снэппинг на реальные засечки** (`src/core/convert.ts:53-61`):
```
snapped = clamp(min + round((clamp(exact, min, max) - min) / step) * step, min, max)
```
Сетка привязана к `scale.min`, а не к нулю — важно для шкал, начинающихся не с нуля (например `min: 1` у Baratza Encore) (комментарий `src/core/convert.ts:57-58`, тест `tests/unit/convert.test.ts:88-95`).

**Полная конвертация** `convert(from, fromSetting, to, methods)` (`src/core/convert.ts:65-99`):
1. `microns = settingToMicrons(from, fromSetting)`
2. `target = micronsToSetting(to, microns)`
3. Допуск объединяется **в квадратуре** (не суммой): `tolerance = Math.hypot(CONFIDENCE_TOLERANCE[from.confidence], CONFIDENCE_TOLERANCE[to.confidence])` (`src/core/convert.ts:77-80`).
4. Границы полосы вычисляются как повторное применение `micronsToSetting` к `microns * (1 ± tolerance)` (`src/core/convert.ts:82-83`) — то есть допуск выражен в **процентах от значения**, а не в абсолютных микронах.
5. `band = {low: min(...), high: max(...)}`, всегда включает `target.snapped`.

`CONFIDENCE_TOLERANCE` (`src/core/types.ts:39-43`): `manufacturer: 0.05`, `community: 0.12`, `estimated: 0.25` — относительные доли, а не абсолютное число микрон.

`resolutionMicrons(grinder, setting)` (`src/core/convert.ts:102-107`) — локальная ширина одного шага в микронах, вычисляется через разность `settingToMicrons` на `setting ± step/2`, что для anchors корректно отражает разный наклон в разных сегментах (тест `tests/unit/convert.test.ts:171-186` — 20 µm/шаг в мелком сегменте, 200 µm/шаг в грубом).

### Сравнение с заявленной моделью «µm = zero + step·value, диапазон ±12 µm»

- **Формула `µm = zero + step*value` совпадает** с реализованной linear-калибровкой (`zeroOffsetMicrons + setting * micronsPerStep`) — это ровно 68 из 134 записей (51%).
- **Anchors-калибровка (66 записей, 49%) этой формуле не соответствует вовсе** — там нет единого `zero`/`step`, вместо этого набор опорных точек и кусочно-линейная интерполяция/экстраполяция. Значит модель "zero+step*value" покрывает только половину каталога.
- **«Диапазон ±12 µm» как таковой в коде не встречается.** Ни константы, ни литерала `12` для допуска в `src/core` нет (grep не находит "12 µm"/"±12" ни в convert.ts, ни в types.ts). Вместо фиксированного абсолютного окна в микронах реализована модель **относительной погрешности** (`CONFIDENCE_TOLERANCE` — 5%/12%/25% от значения), комбинируемой геометрически (`Math.hypot`) и затем спроецированной обратно через инверсию калибровки в *позиции на шкале* (`band.low/high` — это setting-ы, а не микроны напрямую). Итоговая полоса в микронах, соответственно, не симметрична и зависит от конкретной пары кофемолок и величины помола, а не является константой ±12 µm.
- Единственное совпадение с числом "12" — это `CONFIDENCE_TOLERANCE.community = 0.12` (12%), но это доля, не абсолютные микроны, и относится к промежуточному, самому распространённому уровню доверия, а не к диапазону в принципе.

Вывод: базовая формула для linear-калибровки совпадает почти дословно, но (а) она покрывает не весь датасет, и (б) заявленный фиксированный симметричный допуск ±12 µm в коде отсутствует — там принципиально другая, относительная и квадратично комбинируемая модель погрешности.

## 5. Поисковый пикер и "3 recents"

Реализация — **`src/ui/grinder-picker.ts`** (298 строк), явно мотивирована тем, что нативный `<select>` не умеет ни typeahead по нескольким символам, ни схлопывать `<optgroup>` (комментарий в шапке файла, строки 1-9).

- **Структура**: `createGrinderPicker(options)` строит `div.picker` с `button.picker__button` (текущее значение) и `div.picker__panel` (скрыт по умолчанию), внутри — `input.picker__search` и `ul.picker__list[role=listbox]` (`grinder-picker.ts:47-79`).
- **Пустой запрос**: сначала секция "Recent" (максимум **`RECENTS_SHOWN = 3`**, `grinder-picker.ts:37`), затем по одной строке на бренд (`groupByBrand`), модели рендерятся только для развёрнутых брендов (`buildRows`, `grinder-picker.ts:139-176`). При открытии панели все группы принудительно схлопываются (`open()` вызывает `expanded.clear()`, `grinder-picker.ts:212-217`).
- **Непустой запрос**: используется `searchGrinders` из `src/core/dataset.ts` (все whitespace-разделённые термы должны совпасть, поиск по `brand+model+aliases`, регистронезависимый, `dataset.ts:27-35`); группы и Recent пропадают, показывается плоский список, либо строка "No grinders match".
- **Клавиатура**: `ArrowDown/ArrowUp` двигают `activeIndex` по `navigableRows()` (опции + групповые тумблеры), `aria-activedescendant` на поле поиска (фокус физически остаётся в `<input>`), `Enter` выбирает/раскрывает, `Escape`/клик снаружи закрывают (`document.addEventListener('click', …)` через `event.composedPath()`, с явным комментарием почему не `root.contains()` — раскрытие группы переpендеривает список во время всплытия клика и отсоединяет исходный узел, `grinder-picker.ts:272-282`).
- **Recents-логика**: хранится и обновляется через `pushRecent(recents, id, limit=5)` в **`src/ui/prefs.ts:56-58`** — держит историю **до 5** id (новый в начало, дубликаты убираются), но виджет **показывает только первые 3**, отфильтровав id, совпадающий с уже выбранным в этом же поле (`grinder-picker.ts:158-162`, комментарий поясняет: 3 показывается специально меньше 5, потому что текущий выбор поля выбрасывается из своего же списка recents, и "запас" из 5 используется, чтобы гарантированно осталось 3). Обе стороны ("From"/"To") используют общую (shared) историю recents (`popup.ts:167-173`).
- Отдельный коммит **`05eda8d`** ("offer three recents rather than the whole history") специально ограничил показ до 3, изменив только `grinder-picker.ts` (константа `RECENTS_SHOWN`) и добавив e2e-тест — вся история изменения задокументирована в git log, но НЕ отражена в дизайн-доке `docs/superpowers/specs/2026-08-01-grinder-picker-design.md` (см. пункт 9 ниже).

## 6. Тесты

### Vitest (unit), `vitest.config.ts` — `environment: 'node'`, паттерн `tests/unit/**/*.test.ts`
- **`tests/unit/convert.test.ts`** (20 `it`) — прямое покрытие формул: линейное масштабирование от нуля и с ненулевым `zeroOffsetMicrons`; интерполяция и экстраполяция anchors; инверсия linear/anchors; снэппинг на сетку, привязанную к `scale.min` (не к нулю); clamp вне диапазона + флаг `clamped`; round-trip `micronsToSetting(settingToMicrons(...))` по всем `settingSteps`; полный `convert()` — маппинг через микроны, `resolutionMicrons`, полоса всегда охватывает ответ, полоса шире для менее надёжной пары, симметричность конверсии туда-обратно, привязка к методам заваривания; `formatSetting` для rotations.clicks; `settingSteps` enumerates позиции.
- **`tests/unit/dataset.test.ts`** (14 `it`) — инварианты **над реальным зашитым датасетом** (`src/generated/dataset.json`, не моки): уникальность id, наличие `sources` у каждой записи, монотонность и неотрицательность микрон по всем `settingSteps` каждой кофемолки, "физически правдоподобный" верхний предел (400 < coarsest < 2500 µm, `dataset.test.ts:44-51`), покрытие эспрессо (300 µm) и пуровера (800 µm) хотя бы одной кофемолкой, минимум 5 позиций на шкале (`> 4`); плюс `searchGrinders`/`groupByBrand`/`displayName`/`grinderById`.
- **`tests/unit/prefs.test.ts`** (5 `it`) — только `pushRecent`: новый id первым, перемещение без дублирования, усечение по лимиту, пустая история, `DEFAULT_PREFS.recentIds === []`.
- **`tests/unit/sheet-links.test.ts`** (26 `it`, не читал целиком, но по сигнатуре покрывает `scripts/lib/sheet-links.mjs` — регэкспы извлечения ссылок на Google Sheets, вкладок, URL экспорта).

Итого юнит-тестов: **65** `it(...)`.

### Playwright (e2e), `playwright.config.ts` — `testDir: tests/e2e`, headless Chromium `channel: 'chromium'` (не `chromium_headless_shell`, который игнорирует `--load-extension`, README.md:259-262).
- **`tests/e2e/fixtures.ts`** — деривация id распакованного расширения из публичного ключа в манифесте (SHA-256 + маппинг нибблов на `a-p`, повторяет алгоритм Chrome, комментарий `fixtures.ts:10-17`); фикстуры `context`/`extensionId`/`popup`; хелпер `selectGrinder` (открывает пикер → печатает имя → кликает по строке).
- **`tests/e2e/converter.spec.ts`** — **18 тестов** (`test(...)`): загрузка одинакового каталога в оба пикера; сужение списка при вводе; "нет совпадений"; конверсия 24 клика JX-Pro → 10 кликов C40 с проверкой формулы (300 µm); классификация по методу заваривания при смене настройки; степпер двигается ровно на 1 засечку и клэмпится по краям; предупреждение о недостижимости цели; предупреждение об "estimated"-калибровке; более широкая полоса для менее надёжной пары; персист последних кофемолок/настройки между открытиями попапа; свёрнутые бренды до ввода текста; ввод текста заменяет группы на плоский список; recents показываются при повторном открытии (текущий выбор исключён из своих recents); recents скрыты при активном запросе; выбор клавиатурой без мыши; `Escape` закрывает панель и возвращает фокус на кнопку; стрелки разворачивают группу бренда; **не более 3 recents** (`shows at most three recents`, `converter.spec.ts:246-255`).

### Покрытие логики конвертации
Покрытие формул конвертации хорошее и целенаправленное: юнит-тесты `convert.test.ts` бьют по каждой ветке (`linear` vs `anchors`, снэппинг, clamp, экстраполяция, полоса неопределённости, симметричность), плюс `dataset.test.ts` добавляет sanity-инварианты по всему реальному датасету (не просто по синтетическим фикстурам), а e2e (`converter.spec.ts:56-145`) проверяет численный пример «24 клика × 12.5 µm = 300 µm → 10 кликов на C40 (30 µm/клик)» и полосы неопределённости сквозь реальный UI. `npm run verify` последовательно гоняет `check:data → typecheck → test (vitest) → build → test:e2e` (package.json:21), и это же воспроизведено в CI (`.github/workflows/ci.yml`).

## 7. `docs/` — обзор

`docs/` содержит:
- **`docs/screens/*.png`** — 10 скриншотов (5 сценариев × light/dark), генерируются `scripts/screenshot.mjs` через реальный headless Chromium с загруженным unpacked-расширением; сценарии: эспрессо JX-Pro→C40, filter C40→K-Plus, out-of-range C40→Timemore C2, estimated-калибровка JX-Pro→Hario Slim, electric anchors J-Max→Fellow Ode Gen2 (`screenshot.mjs:30-36`).
- **`docs/superpowers/specs/2026-08-01-grinder-picker-design.md`** — дизайн-спека пикера (см. ниже).
- **`docs/superpowers/plans/2026-08-01-grinder-picker.md`** — пошаговый implementation-план того же пикера (см. ниже).

### Дизайн-спека пикера (`2026-08-01-grinder-picker-design.md`)
Формулирует проблему (176 строк в двух `<select>`, ни группировки, ни multi-char typeahead у нативного select), цели/не-цели (никакого fuzzy-матчинга, никаких избранных/пиннинга — recents закрывают эту потребность), рассматривает и отклоняет 2 альтернативы (`<input list>+<datalist>` — нет группировки/recents/стилизации и неоднозначный маппинг display→id при 134 похожих записях; поиск над нативным select — `<optgroup>` не сворачивается). Специфицирует markup, поведение открытой/закрытой панели, полную таблицу горячих клавиш, поведение recents (**"up to 5"** — расходится с финальным `RECENTS_SHOWN=3` в коде, см. п.9), обработку ошибок (пустой поиск / удалённый из датасета id / недоступный `chrome.storage`), план тестирования.

### Implementation-план (`2026-08-01-grinder-picker.md`)
Разбит на 6 задач под `superpowers:subagent-driven-development`: (1) `pushRecent` в `prefs.ts`; (2) сам виджет + замена `<select>` на mount-points + переписывание e2e с `.selectOption()` на open→type→click; (3) свёрнутые группы брендов; (4) секция Recent; (5) клавиатурная навигация и ARIA; (6) обновление скриншотов и README. Каждая задача включает конкретный код "как есть" (иногда с более старой версией виджета — например, в задаче 2 план даёт `renderList()` **без** групп/recents, они добавляются задачами 3-4 инкрементально), команды запуска тестов, критерии прохождения и текст коммита. Заканчивается self-review-таблицей покрытия требований спеки и разделом "Known gap": усечение `pushRecent` по лимиту 5 проверено только юнит-тестом, не e2e (что логично — 3 из 5 записей это внутренний лимит хранения истории, отдельно от UI-предела в 3, добавленного позже отдельным коммитом).

Оба документа датированы 2026-08-01 и соответствуют цепочке коммитов `3c105b8 → 05eda8d` (10 коммитов), которая полностью реализует и потом дорабатывает описанный пикер.

## 8. Переиспользуемость для мобильного приложения

### Соответствие интерфейсу адаптера `{id, name, short, step, zero, dp}`
**Не соответствует напрямую.** Фактическая схема `Grinder` (`src/core/types.ts:61-78`) существенно отличается:

| Поле адаптера | Есть в схеме? | Комментарий |
|---|---|---|
| `id` | Да | `Grinder.id`, kebab-case slug. |
| `name` | Нет, но выводимо | Схема хранит `brand`+`model` раздельно; `name` собирается функцией `displayName(grinder) = \`${brand} ${model}\`` (`dataset.ts:19-21`), а не хранится как поле. |
| `short` | Нет | Такого поля нет вообще (ни короткого имени, ни аббревиатуры) — ближе всего `aliases?: string[]`, но это список альтернативных строк для поиска, а не единственное "короткое" имя. |
| `step` | Частично | Есть **два разных** "step": `scale.step` (шаг **на самом диске**, в единицах кофемолки — кликах/номерах/метках) и `calibration.micronsPerStep` (шаг **в микронах**, только у `linear`-калибровки). Ни один из них не соответствует единому "step" адаптера один-к-одному. |
| `zero` | Частично | `calibration.zeroOffsetMicrons` существует **только для `kind: 'linear'`** (68/134 записей). У `kind: 'anchors'` (66/134, 49%) нет ни `zero`, ни `step` — вместо этого произвольный массив `points`. |
| `dp` (decimal places?) | Нет | Такого поля нет вообще; округление зашито в код константами (`roundTo(setting, 4)` для snapped-значения, `roundTo(x, 2)` для `formatSetting`, `roundTo(microns, 1)` для итоговых микрон — `src/core/convert.ts:61,123,93`), а не хранится per-grinder. |

**Вывод:** адаптер `{id, name, short, step, zero, dp}`, судя по всему, рассчитан на упрощённую линейную модель (как в задаче: «µm = zero + step*value»). Он покрыл бы буквально только `linear`-подмножество (51% каталога) при условии переименования полей (`brand+model→name`, `micronsPerStep→step`, `zeroOffsetMicrons→zero`) и добавления `short`/`dp` как новых данных, которых сейчас в датасете нет. Половина каталога (`anchors`) в эту модель не укладывается вообще — потребуется либо расширение адаптера под кусочно-линейные калибровки, либо downsampling anchors в приближённый linear (потеря точности) на этапе адаптации.

### Что переносимо as-is
- **`src/core/*` (types.ts, convert.ts, dataset.ts)** — явно спроектировано без DOM/`chrome.*` (README.md:293-294 подтверждает это дизайн-решением, а не случайностью). Вся математика конвертации, поиск, группировка — чистые TS-функции над плоскими объектами и JSON. Это прямой кандидат на общий модуль (npm-пакет/shared lib) для мобильного клиента — там же лежит валидируемый JSON `src/generated/dataset.json` (86.3 KB raw / 9.5 KB gzip на 134 записи, README.md:56-66), который тоже переносим без изменений — это чистые данные.
- **`data/`** и весь конвейер сборки датасета (`scripts/build-dataset.mjs`, `import-csv.mjs`) — платформонезависимые Node-скрипты, не завязаны на Chrome; переносимы для генерации того же `dataset.json`, который будет грузить мобильное приложение.
- Скрипты сбора данных (`scrape-sheets.mjs`, `pdf-table-to-csv.mjs`, `twc-table-to-csv.mjs`, `beeancoffee-harvest.mjs`) — тоже платформонезависимы (Node + опционально Playwright), актуальны для поддержки/роста каталога вне зависимости от целевой платформы.

### Что специфично для Chrome и потребует замены
- **`src/manifest.json`** — MV3-манифест, не имеет аналога вне расширений браузера.
- **`src/ui/prefs.ts`** — использует `chrome.storage.local` (с проверкой `hasStorage()` через `typeof chrome !== 'undefined'`, `prefs.ts:24-27`); для мобильного приложения нужен другой слой персистентности (AsyncStorage/UserDefaults/SharedPreferences и т.п.), но публичный контракт (`Prefs`, `pushRecent`) чисто функционален и переносим.
- **`src/ui/popup.html` / `popup.css` / `popup.ts` / `grinder-picker.ts`** — весь UI-слой на голом DOM API (`document.createElement`, `querySelector`), рассчитан на попап 340×~460px в Chrome и на события мыши/клавиатуры браузера; для мобильного приложения это придётся переписать под нативный/React Native/Flutter слой, хотя *логика поведения* (сворачивание групп по бренду, top-3 recents, live-поиск по подстроке) может служить прямой спецификацией поведения — сама реализация не переносима.
- **`tests/e2e/*`** — завязаны на `@playwright/test` + `chromium.launchPersistentContext` + деривацию id расширения из ключа манифеста; не переносимы напрямую, хотя описываемые сценарии (что должно происходить) переносимы как чек-лист приёмочных тестов.
- **`scripts/screenshot.mjs`** — то же самое, специфично для расширения.

## 9. Неожиданное / недокументированное

- **Расхождение README/design-спеки с фактическим поведением recents.** И README (README.md:11: "the grinders you reached for last sit at the top"), и `docs/superpowers/specs/2026-08-01-grinder-picker-design.md:123` ("up to 5") не отражают, что финальный UI показывает **ровно 3** recents (`RECENTS_SHOWN = 3`, `grinder-picker.ts:37`), в то время как `pushRecent`'s хранит историю из **5**. Это сделано отдельным более поздним коммитом (`05eda8d`) уже **после** написания дизайн-спеки и README (которое, впрочем, было обновлено позже, `b1a7a04`, и говорит нейтрально "the grinders you reached for last", без числа) — сама спека осталась не синхронизирована.
- **В README есть намеренная опечатка/несоответствие числа**: заголовок задачи ("3 recents feature") подтверждён кодом и тестом `shows at most three recents` (converter.spec.ts:246), но нигде в тексте кода не объяснено пользователю в UI, почему их именно 3, а не 5 — это чисто внутренний implementation detail, видимый только по комментарию в `grinder-picker.ts:30-37`.
- **Отсутствие абсолютного допуска в микронах.** Как отмечено в п.4, ожидаемая моделью задачи формула допуска "±12 µm" в коде не реализована — там принципиально другая (относительная, в квадратуре) модель. Это не баг, а осознанный дизайн (обоснование в комментарии `convert.ts:74-76`: "summing would overstate the band badly for two manufacturer-grade entries"), но стоит явно зафиксировать при портировании на мобильную платформу, если ожидается именно фиксированный ±12 µm.
- **`scale.step` может быть дробным** (`0.1` для decimal-марок, `0.25` в тестах) — юнит-тесты явно проверяют это (`convert.test.ts:82-95`), и валидатор (`build-dataset.mjs:80-81`) требует `step > 0` и `step <= max - min`, но не требует целочисленности — потенциальная ловушка при портировании на числовые типы со строгой дискретизацией.
- **`beeancoffee-harvest.mjs` жёстко исключает целый бренд** (`UNTRUSTED_MAKE = /^1Zpresso$/i`, `beeancoffee-harvest.mjs:57`) с комментарием, что показания стороннего сервиса по 1Zpresso расходятся и с производителем, и с ситовым замером, причём **в противоположных направлениях** — довольно специфичный edge-case, зафиксированный только в комментарии кода, не в README.
- **Датасет валидирует "физическую правдоподобность" эмпирически, а не декларативно**: `dataset.test.ts:44-51` жёстко зашивает границы `400 < coarsest < 2500 µm` как magic numbers прямо в тесте (не в схеме/константе `src/core`), обоснование этому — только комментарий, ссылающийся на прошлые баги импорта (README.md:229-233: реальный кейс — экстраполированная кривая давала −126 µm на нуле, другая — 3288 µm на потолке).
- **Ключ манифеста — не секрет и не signing key**, а исключительно техническое решение для стабильного extension ID в e2e-тестах; это явно прокомментировано прямо в манифесте (`$key_comment`, `src/manifest.json:12`) — предупреждение полезно, чтобы не спутать с реальным ключом подписи при портировании/публикации в Web Store (Chrome Web Store назначит свой собственный ключ при загрузке).
- **`data/raw/` содержит уже закоммиченные примеры сырых данных** (`data/raw/twc/*.csv`, `grinders-api.json`, `manifest.json`, `pdf/*.csv`), несмотря на то что `.gitignore` явно исключает `data/raw/` (.gitignore:5) — то есть в репозитории физически лежат файлы, которые должны были быть проигнорированы (возможно, добавлены до того, как правило `.gitignore` было введено, либо намеренно как fixtures/пример для скриптов twc-table-to-csv). Это стоит перепроверить перед тем, как полагаться на README-утверждение "data/raw/ deliberately not committed" (README.md:287-289).
- **e2e-тесты читают "сырой" `src/generated/dataset.json` напрямую с диска** для построения поисковых запросов (`fixtures.ts:87-95`, `screenshot.mjs:21-23`) — то есть корректность e2e-тестов зависит от актуальности сгенерированного бандла, а не от `data/`; расхождение здесь замаскировано тем, что CI гоняет `check:data` первым шагом (`.github/workflows/ci.yml`, комментарий "everything downstream is built from this data").