# Dev notes — BJ-3: порт ядра домена

Портированы реестры `data.js` и переносимая логика прототипа (`stagesFor`,
таймер, калибровка, конвертер-обёртка, `arcPath`). Экраны не трогались: домен
существует, но ни один экран к нему не подключён — это BJ-4/BJ-5. Dexie-схема
v1 не менялась.

## Карта модулей

| Файл | Что внутри | Первоисточник |
|---|---|---|
| `apps/journal/src/data/wheel.ts` | `WHEEL` (9/27/102) как `as const satisfies`, из него выведены типы `CategoryId`/`SubId`/`DescriptorId`; чистый билдер `buildDesc` + замороженный `DESC`; `descById`; `catColor`, `hueOf`, `colOf`, `lightnessFor` | `data.js:50-99`, component-report §8.1, `DC:962-963` |
| `apps/journal/src/data/traits.ts` | `TRAITS` (6 групп) с `satisfies TraitRegistry` — набор опций сверяется компилятором с `DeviceFlow`/`DeviceBottom`/… из Dexie-схемы; `TRAIT_KEYS`; `KNOWN_DEVICES` (3) | `data.js:102-114` |
| `apps/journal/src/data/strings.ts` | `STR.ru`/`STR.en`, типизированный union `StrKey` (выведен из `RU`, `EN` объявлен как `Record<StrKey, string>` — параллельность держит компилятор); `t`, `stageName`, `modeName` | `data.js:158-195` |
| `apps/journal/src/data/freshness.ts` | `ageDays(roast, today)` — «сегодня» параметром, `phaseOf`, `isoDate`, `isoTime` | `data.js:44-45` |
| `apps/journal/src/data/advice.ts` | `advice(diag, lang)` — портирована, к UI не подключается (D-6) | `data.js:145-155` |
| `apps/journal/src/data/seeds.ts` | `demoShelf`/`demoDevices`/`demoJournal`, `demoSeeds()` за `import.meta.env.DEV`, `EMPTY_DIAG` | `data.js:115-142` |
| `apps/journal/src/data/index.ts` | бочка реестров (без `seeds.ts` — демо тянут явно) | — |
| `apps/journal/src/domain/stages.ts` | `stagesFor` (5 веток) + `BrewPlan`, `HybridMode`, `plannedTotal`, `plannedWater`, `isMarker`, `STAGE_KEYS` | component-report §3, `DC:994-1002` |
| `apps/journal/src/domain/timer.ts` | чистый редьюсер `startTimer`/`pauseTimer`/`advanceTimer` (+`elapsed`, `stageElapsed`, `canPause`, `currentStage`), `makeEntry`, `logManual`, `PENDING_DIAG`, zustand-обёртка `useTimer` | component-report §4, `DC:1003-1032` |
| `apps/journal/src/domain/calibration.ts` | `applyCalib` (сдвиг lo/center/hi), `computeOffset`, `suggestCalibration`, `calibrationFrom`, `resetCalibration`, `hasCalibration` | component-report §5, `DC:1153,1245-1250` |
| `apps/journal/src/domain/convert.ts` | `toCoreGrinder` (Dexie-запись → каталожная), `convertGrind` — обёртка над `@coffee/core.convert` + `applyCalib` | спека §8, D-4 |
| `apps/journal/src/domain/format.ts` | `fmtT` с исправленной границей (D-3) | `data.js:46` |
| `apps/journal/src/domain/geometry.ts` | `arcPath` — дословно | component-report §8.2, `DC:1059-1064` |
| `apps/journal/src/domain/index.ts` | бочка домена | — |

Обновлён `apps/journal/src/README.md` (таблица раскладки: появились `data/` и
`domain/`). Больше ничего из BJ-2 не менялось.

## Разовая сверка порта против `data.js` (риск R-1)

Скрипт `verify-port.mjs` — одноразовый, лежит в scratchpad, **в репозиторий не
добавлен**. Он собирает `esbuild`'ом модули `src/data/*` в один ESM-файл,
импортирует рядом оригинальный `design_handoff_brew_journal 3/data.js` и
сравнивает **не только множества id и ключей, но и значения** — тройки
дескрипторов по порядку, содержимое `DESC`, обе таблицы `STR` дословно, `TRAITS`,
`KNOWN_DEVICES`, а также выходы `catColor`/`hueOf`/`colOf`/`stageName`/`modeName`/
`ageDays`/`phaseOf`/`advice` и демо-сиды. 105 проверок, расхождений нет.

Вывод (verbatim):

```
== WHEEL ==
OK   категорий
OK   подкатегорий
OK   дескрипторов
OK   категории [id,ru,en,h,c]
OK   подкатегории [id,ru,en]
OK   дескрипторы [id,ru,en] по порядку
OK   дублей id дескрипторов
== DESC ==
OK   ключей DESC
OK   порядок ключей DESC
OK   значения DESC
OK   DESC заморожен (оригинал: false)
== цвета ==
OK   catColor(fruit)
OK   catColor(fruit, .66, .92, .5)
OK   catColor(floral)
OK   catColor(floral, .66, .92, .5)
OK   catColor(sweet)
OK   catColor(sweet, .66, .92, .5)
OK   catColor(nutty)
OK   catColor(nutty, .66, .92, .5)
OK   catColor(spice)
OK   catColor(spice, .66, .92, .5)
OK   catColor(roast)
OK   catColor(roast, .66, .92, .5)
OK   catColor(green)
OK   catColor(green, .66, .92, .5)
OK   catColor(ferment)
OK   catColor(ferment, .66, .92, .5)
OK   catColor(other)
OK   catColor(other, .66, .92, .5)
OK   hueOf(blackcurrant)
OK   colOf(blackcurrant, 0.8)
OK   colOf(blackcurrant)
OK   hueOf(fruit)
OK   colOf(fruit, 0.8)
OK   colOf(fruit)
OK   hueOf(citrus)
OK   colOf(citrus, 0.8)
OK   colOf(citrus)
OK   hueOf(cocoad)
OK   colOf(cocoad, 0.8)
OK   colOf(cocoad)
OK   hueOf(нет-такого)
OK   colOf(нет-такого, 0.8)
OK   colOf(нет-такого)
== TRAITS / KNOWN_DEVICES ==
OK   TRAITS целиком
OK   групп TRAITS
OK   KNOWN_DEVICES целиком
OK   seedDevices() пуст
== STR ==
OK   ключей STR.ru
OK   множество ключей STR.ru
OK   значения STR.ru совпадают дословно
OK   ключей STR.en
OK   множество ключей STR.en
OK   значения STR.en совпадают дословно
OK   множества ключей ru/en идентичны
== stageName / modeName ==
OK   stageName(bloom,ru)
OK   stageName(bloom,en)
OK   stageName(pour,ru)
OK   stageName(pour,en)
OK   stageName(drain,ru)
OK   stageName(drain,en)
OK   stageName(steep,ru)
OK   stageName(steep,en)
OK   stageName(stir,ru)
OK   stageName(stir,en)
OK   stageName(press,ru)
OK   stageName(press,en)
OK   stageName(valve,ru)
OK   stageName(valve,en)
OK   stageName(pause,ru)
OK   stageName(pause,en)
OK   modeName(perc,ru)
OK   modeName(perc,en)
OK   modeName(imm,ru)
OK   modeName(imm,en)
OK   modeName(hybrid,ru)
OK   modeName(hybrid,en)
OK   modeName(drip,ru)
OK   modeName(drip,en)
OK   modeName(cup,ru)
OK   modeName(cup,en)
== freshness / advice ==
OK   ageDays(2026-07-27,2026-08-01)
OK   ageDays(2026-07-10,2026-08-01)
OK   ageDays(2026-08-01,2026-08-01)
OK   ageDays(2026-06-01,2026-08-01)
OK   phaseOf(0)
OK   phaseOf(3)
OK   phaseOf(4)
OK   phaseOf(21)
OK   phaseOf(22)
OK   phaseOf(100)
OK   advice({"acid":8,"bitter":3,"body":5,"balance":5},ru)
OK   advice({"acid":8,"bitter":3,"body":5,"balance":5},en)
OK   advice({"acid":3,"bitter":8,"body":2,"balance":4},ru)
OK   advice({"acid":3,"bitter":8,"body":2,"balance":4},en)
OK   advice({"acid":5,"bitter":5,"body":9,"balance":4},ru)
OK   advice({"acid":5,"bitter":5,"body":9,"balance":4},en)
OK   advice({"acid":5,"bitter":5,"body":5,"balance":8},ru)
OK   advice({"acid":5,"bitter":5,"body":5,"balance":8},en)
OK   advice({"acid":5,"bitter":5,"body":5,"balance":5},ru)
OK   advice({"acid":5,"bitter":5,"body":5,"balance":5},en)
OK   advice({"acid":9,"bitter":2,"body":2,"balance":3},ru)
OK   advice({"acid":9,"bitter":2,"body":2,"balance":3},en)
== демо-сиды (сверяются поля, общие со схемой Dexie) ==
OK   полка
OK   журнал: поля оригинала
     j1: добавлено ["diag","desc","note"]
     j5: добавлено ["devName","grind","stages"]
     j6: добавлено [], отброшено ["stirAt"]

ИТОГО: расхождений нет
```

## Инвентарь тестов

`apps/journal/tests/unit/` — 10 новых файлов, 111 тестов (плюс 19 от BJ-2:
`nav.test.ts`, `db.test.ts`). Итого по воркспейсу — 130.

**`wheel.test.ts` (13)** — WHEEL: содержит 9/27/102 · не содержит дублей id ни на
одном уровне · хранит квирки прототипа (`scherry`/`dapricot`/`cocoad`) · у каждой
категории есть тон и цветность. DESC: покрывает 102 · несёт обратные ссылки и цвет
категории · заморожен (мутация бросает) · строится чистой функцией · на неизвестный
id отвечает `undefined`. Цвета: `catColor` (альфа только когда < 1) · `hueOf` на
всех трёх уровнях · `colOf` (0.72 / ×0.92) · `lightnessFor` по уровням.

**`strings.test.ts` (10)** — 146 ключей в каждом языке · множества ключей ru/en
идентичны · нет пустых значений · заморожен · `t()` · `stageName` переводит все
восемь ключей стадий · `modeName` (три режима из `TRAITS.flow`, `drip`/`cup` —
отдельно) · TRAITS: шесть групп, каждая опция — пара `[ru, en]`, каталог из трёх
девайсов ссылается только на существующие опции.

**`freshness.test.ts` (12)** — `ageDays` (дни, «сегодня» параметром, обжарка в
будущем) · `phaseOf` (пороги 4 и 21) · `isoDate`/`isoTime` (локальные, не UTC) ·
`advice`: шесть правил, накопление, «никогда не пусто» (перебор 6⁴ комбинаций).

**`seeds.test.ts` (6)** — три пачки по формам · своих девайсов нет · шесть записей,
одна pending · ссылочная целостность (дескрипторы, ключи стадий, пачки) · свежие
объекты на каждый вызов · `demoSeeds` только в dev-сборке.

**`stages.test.ts` (19)** — ключи стадий: ровно восемь `bloom|pour|drain|steep|stir|press|valve|pause`. Табличные 12 кейсов с точными ожидаемыми массивами
`[key, sec, water]`: drip 180/3, drip 200/3 (D-2), drip 200/1, drip 250/6, perc без
девайса, perc 3 пролива, perc 18 г/1 пролив, hy-perc, imm cyl (press), imm cone
(drain), hy-imm, hy-mid. Плюс: вода сходится во всех ветках · только объявленные
ключи стадий и никакого `pause` · форма пачки важнее девайса · молотый идёт как
зерно · `pours = 0` не ломает арифметику · `plannedTotal`.

**`timer.test.ts` (19)** — старт и часы · перколяция с паузой посреди пролива
(полный `rec` из пяти стадий, включая `['pause', 15, 0]`, и `total` = фактический
elapsed) · пауза в паузе — no-op · пауза на последней стадии запрещена (возвращает
тот же объект) · неизменяемость состояния · иммерсия: `stir` проглатывается ·
гибрид mid: `valve` проглатывается · маркер проглатывается и на выходе из паузы ·
одностадийный план · `makeEntry`: перколяция (поля + списание граммов), дрип (доза
производителя, `leftCount − 1`, `grind: null`, `device: null`), молотый, гибрид mid
(`valveAt`) vs hybrid perc (без `valveAt` и без `pours`), без девайса — всё равно
`perc`, зажим остатка нулём, пачка без учёта остатка · `logManual` (плановые стадии
и сумма плановых длительностей) · `useTimer`: заваривание от старта до записи,
безопасные действия без таймера, `cancel`.

**`calibration.test.ts` (13)** — `applyCalib` двигает все три точки, только
округляет при нуле, не уводит в минус, сохраняет порядок · `computeOffset` и
round-trip · `suggestCalibration` (лучшая по `diag.balance`, игнорирует pending и
записи без помола, не мутирует журнал, `undefined` на пустом) ·
`calibrationFrom`/`resetCalibration`/`hasCalibration`.

**`convert.test.ts` (9)** — `toCoreGrinder` (числа из своей записи, доверие из
каталога, «оценка» для ручной молки, правленые числа побеждают каталог) ·
`convertGrind` (точные `microns/center/lo/hi/resolution`, калибровка двигает
center/lo/hi и **не** трогает микроны, зажим нулём, диапазон охватывает центр,
пересчёт на саму себя, флаг выхода за шкалу).

**`format.test.ts` (5)** — `M:SS`, граница D-3 (`fmtT(119.6) === '2:00'`), границы
минут/часов, знак отклонения, `NaN`/`Infinity`.

**`geometry.test.ts` (5)** — золотая строка сектора колеса (cx 175, r 74…170,
зазор 0.016), четверть кольца, флаг большой дуги, ровно полукруг, структура пути.

## Отклонения и решения

1. **STR: 146 ключей, а не 145.** Требования BJ-3 и `data-js-report` §4 называют
   145/145 — это ошибка счёта в отчёте: в самом `data.js` ровно **146** ключей в
   каждой таблице (проверено разовой сверкой: количества и значения совпадают с
   первоисточником). Порт дословный, инвариант-тест зафиксирован по факту (146/146,
   множества ключей идентичны). Отчёт не правил — это не мой артефакт.
2. **D-2 (drip, компенсация воды)** — реализовано: последний пролив добирает
   остаток (`water − per*(n−1)`), как в перколяции. Тест-кейс «drip 200/3» пинает
   именно это место: прототип дал бы 195 г вместо 200.
3. **D-3 (`fmtT`)** — минуты и секунды считаются от одного округлённого значения;
   `fmtT(119.6) === '2:00'`. Дополнительно: отрицательный вход сохраняет знак
   (`-0:05`), нечисловой даёт `0:00` — в прототипе это были `NaN:NaN`-строки.
4. **D-4 (`UNCERT`)** — не портирован; `lo/hi` приходят из confidence-полосы ядра.
   Формул конвертации в journal нет: `domain/convert.ts` вызывает
   `@coffee/core.convert` и накладывает калибровку.
5. **D-6 (`advice`)** — портирована и покрыта тестами, к UI не подключена.
6. **Калибровка: `src` — id записи, а не литерал.** В прототипе `calibSrc` был
   `'log' | 'manual'`; Dexie-схема v1 хранит `Calibration.src` как «id записи, из
   которой взято смещение». Порт кладёт туда `best.id` (при совпадении настройки с
   помолом лучшей записи с точностью 0.05) либо `null`. Строку «из журнала /
   вручную» экран получит проверкой `src !== null`.
7. **Приведение сидов к схеме v1.** `photos` — массив (BJ-2 D-3), поэтому у
   демо-пачек он пустой (счётчик прототипа 2/1/1 не переносится). Поле `stirAt`
   записи `j6` отброшено — в схеме его нет, момент размешивания живёт внутри
   `stages`. Обязательные `diag`/`desc`/`note` у pending-записи заполняются нулевой
   диагностикой, пустым списком и пустой строкой (`PENDING_DIAG` в `timer.ts`,
   `EMPTY_DIAG` в `seeds.ts` — константы намеренно не общие, чтобы `data/` не
   зависел от `domain/`). `devName` без девайса — пустая строка, а не `undefined`.
8. **Списание остатка** трогает поле, только если оно задано: `undefined − dose`
   дало бы `NaN` у пачки без учёта остатка. Зажим нулём — как в прототипе.
9. **`pours = 0`** в drip-ветке приведён к `Math.max(1, pours)` — так же, как это
   уже делала перколяция. Прототип на нуле делил на ноль (UI туда не пускает,
   диапазон 1…6); защита не меняет поведение на валидных входах.
10. **`toCoreGrinder`** синтезирует каталожную запись из пользовательской: числа —
    всегда из записи (её мог править пользователь), `confidence` — из каталога по
    `datasetId`, а для молки, заведённой руками, `estimated`. Это влияет только на
    ширину полосы.
11. **AC-4, грep `zeroOffset|micronsPerStep`** даёт три файла: `domain/convert.ts`
    и `db/seed.ts` — оба импортируют `@coffee/core`; третий, `db/schema.ts`, — это
    объявление полей `GrinderRecord` из BJ-2 (формул там нет, импорта ядра тоже —
    файл-контракт Dexie). Дублирования формул в journal нет; расхождение с буквой
    грепа — наследство BJ-2, трогать контрактный файл не стал.
12. **Мини-колесо/полное колесо/devSvg** не рисуются — в скоупе только данные,
    цвета и `arcPath` (BJ-4/BJ-5).

## Хвосты проверок

```
npm run -w @coffee/journal typecheck
> tsc --noEmit                       # без вывода — чисто

npm run -w @coffee/journal test
 Test Files  12 passed (12)
      Tests  130 passed (130)

npm run -w @coffee/journal build
 dist/assets/index-BshoeDyQ.css   6.27 kB │ gzip:  1.69 kB
 dist/assets/index-DwtxdYfG.js  335.60 kB │ gzip: 92.37 kB
 ✓ built in 1.39s

npm run verify        # exit=0
 @coffee/core       Test Files  3 passed (3)   Tests  60 passed (60)
 @coffee/extension   Test Files  1 passed (1)   Tests   5 passed (5)
 @coffee/journal     Test Files 12 passed (12)  Tests 130 passed (130)
 playwright          18 passed (54.3s)
```

Демо-данные в прод-бандл не попадают: `grep 'Ява Золотая' apps/journal/dist/assets/*.js` — 0 совпадений.
