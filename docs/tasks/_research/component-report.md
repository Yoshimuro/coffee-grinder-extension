# Brew Journal `.dc.html` — полная инвентаризация логики прототипа

Разбор файла `/Users/User/Projects/Personal/coffee-grinder-extension/design_handoff_brew_journal 3/Brew Journal.dc.html` (1355 строк) с опорой на `data.js`, `support.js`, `README.md`, `CLAUDE_CODE_TASK.md` из той же папки. Далее для краткости: **DC** = `Brew Journal.dc.html`, **D** = `data.js`.

---

## 1. Архитектура прототипа

### 1.1 Что такое `.dc.html`

Это формат «Deck / dc-runtime» — собственный рантайм-обвязка поверх React, реализованная в `support.js`.

- `DC:6` подключает `./support.js`; `DC:9` открывает корневой `<x-dc>`, внутри `<helmet>` (`DC:10-27`) — мета/шрифты/глобальный CSS/`@keyframes`.
- `DC:912` — `<script type="text/x-dc" data-dc-script data-props="…">`, внутри которого объявлен `class Component extends DCLogic` (`DC:913`). Рантайм требует именно такую сигнатуру: `support.js:1708` — `"<script data-dc-script> must define \`class Component extends DCLogic\`"`.
- `DCLogic` — это алиас `StreamableLogic` (`support.js:1896-1898`), базовый класс с `props`, `state`, `setState`, `forceUpdate`, `componentDidMount/DidUpdate/WillUnmount` и `renderVals()` (`support.js:816-840`). Логика исполняется через `evalDcLogic` (`new Function(...)`, `support.js:841-849`), React прокидывается в скоуп как `React` — поэтому в `wheelSvg`/`devSvg`/`qrSvg` доступен `React.createElement`.
- Ключевой контракт рендеринга: `support.js:1085` — `vals = { ...userProps, ...this.logic.renderVals() || {} }`. То есть **шаблон не имеет доступа к `this.state`**; всё, что рисуется, — это плоский объект, который возвращает `renderVals()` (`DC:1142-1351`). Обработчики кликов тоже приезжают оттуда как замыкания (`onClick="{{ openBrew }}"`).

### 1.2 Шаблонизация

Управляющие элементы (`support.js:487`, `DECK_CONTROL_FLOW_RE`): `sc-if`, `sc-for`, `sc-else`, `x-import`/`dc-import`.

- `<sc-if value="{{ isHome }}">` — условный блок; `hint-placeholder-val` нужен только редактору дизайна.
- `<sc-for list="{{ lastRows }}" as="r">` — итерация; внутри доступны поля элемента (`{{ r.title }}`, `{{ r.open }}`).
- `<x-import component-from-global-scope="IOSDevice" from="./ios-frame.jsx" …>` (`DC:42`) — рамка iPhone 393×852. Чистая обвязка прототипа, в прод не переносится (README:112).
- `<image-slot id="…" shape="rect" placeholder="…">` (`image-slot.js`) — слот под фото с drag&drop. Тоже обвязка.
- Инлайн-стили в шаблоне — строковые CSS, рантайм конвертирует их в объекты (`support.js:803`, `cssToObj`).

### 1.3 Навигация и состояние

Никакого роутера. Одно поле `state.screen` + ручной стек:

```
go(s, patch)  → DC:954  // stack.push(текущий screen), screen = s
back()        → DC:955  // screen = stack.pop() || 'home'
setTab(k)     → DC:956  // screen = k, stack = [], cmpMode=false, cmpSel=[]
```

Табы отображаются, только если `screen ∈ ['home','shelf','log','more']` (`DC:1146`, `DC:1221` — `showNav`, разметка `DC:898-905`).

Полный `state` — `DC:914-926`. Заметно, что `grinders` в начальном `state` **нет**: он появляется только в `componentDidMount` (`DC:928`) после динамического `import('./data.js')`, а `renderVals` до готовности возвращает заглушку (`DC:1143`).

### 1.4 Persistence

**Её нет вообще.** `grep localStorage|sessionStorage|indexedDB` по `DC`, `data.js`, `support.js`, `image-slot.js`, `ios-frame.jsx` — 0 совпадений. Данные приходят из `D.seedShelf() / D.seedJournal() / D.seedDevices()` (`DC:928`) и живут только в React-стейте: перезагрузка страницы всё сбрасывает. Продовое хранилище (Dexie/IndexedDB) — целиком новая работа, прототип не даёт по нему ни одной подсказки, кроме модели данных.

### 1.5 Пропсы прототипа

`DC:912`, `data-props`: `$preview` (640×1040), `homeVariant` — enum `['a','b','c']`, default **`'a'`**, `lang` — enum `['ru','en']`, default `'ru'`. Оба перекрываются локальным стейтом: `L()` = `state.langO ?? props.lang ?? 'ru'` (`DC:947`), `HV()` = `state.hvO ?? props.homeVariant ?? 'a'` (`DC:948`). Переключатели над рамкой: `ctrlHv` (`DC:1218`, разметка `DC:33-35`), `ctrlLang` (`DC:1219`, разметка `DC:37-39`, дубль в настройках `DC:836-838`).

---

## 2. Полный инвентарь экранов

Каждый экран — `sc-if` с `data-screen-label`. Флаги генерятся одной строкой `DC:1220` через `is = (k) => scr === k` (`DC:1145`).

| # | `screen` | `data-screen-label` | Строки | Назначение |
|---|---|---|---|---|
| 1 | `home` | Home | `DC:45-147` | Дом: карточка «оценка ждёт» + один из трёх вариантов A/B/C |
| 2 | `conv` | Converter | `DC:149-222` | Конвертер помола: база → своя молка, диапазон, калибровка |
| 3 | `shelf` | Shelf | `DC:224-248` | Полка: карточки пачек с фото 118px + кнопки добавления |
| 4 | `bean` | Bean | `DC:250-297` | Карточка пачки: фото столбцом, статы, заваривания, ЗАВАРИТЬ |
| 5 | `beanAdd` | Add pack | `DC:299-333` | Добавление пачки: форма/фото/дата обжарки/вес или штуки/имя |
| 6 | `devices` | Devices | `DC:335-355` | Список девайсов с мини-чертежами |
| 7 | `device` | Constructor | `DC:357-386` | Конструктор девайса: живой чертёж + 6 групп признаков |
| 8 | `brew` | Brew setup | `DC:388-500` | Сетап заваривания: зерно, девайс, клапан, помол, доза/вода/T/проливы |
| 9 | `timer` | Timer | `DC:502-529` | Таймер: elapsed 74px, сегменты, стадия, вода, ПАУЗА + главная кнопка |
| 10 | `rateLater` | Rate later | `DC:531-539` | Интерстишл «оценка позже»: ОЦЕНИТЬ СЕЙЧАС / ПОЗЖЕ |
| 11 | `diag` | Diagnostics | `DC:541-616` | Шаг А оценки: 4 шкалы 0–10, вход в колесо, заметка, микрофон, теги |
| 12 | `wheel` | Flavor wheel | `DC:618-651` | Шаг Б: SVG-колесо вкусов, крошки, выбранные теги |
| 13 | `log` | Log | `DC:653-700` | Журнал: фильтры-чипы, список, режим СРАВНИТЬ |
| 14 | `detail` | Brew detail | `DC:702-763` | Деталь записи: параметры, стадии, диагностика, теги, заметка, QR |
| 15 | `compare` | Compare | `DC:765-787` | Сравнение двух записей построчно |
| 16 | `more` | Settings | `DC:789-859` | Настройки: кофемолки CRUD, девайсы, язык, экспорт/импорт, спека |
| 17 | `spec` | Spec | `DC:861-896` | Дизайн-спецификация: палитра, типографика, сетка, компоненты |

Плюс нижняя навигация (`DC:898-905`) — 4 таба `ГЛАВНЫЙ / ПОЛКА / ЖУРНАЛ / ЕЩЁ`.

### 2.1 Переключатель домашнего A/B/C

`hvA / hvB / hvC` (`DC:1224`) выбирают один из трёх блоков внутри одного экрана Home. Карточка pending (`DC:52-60`) находится **до** них и общая для всех вариантов.

- **A** (`DC:61-100`): большая инверсная плашка ЗАВАРИТЬ с подписью `ctaSub` (последняя done-заварка + помол + температура, `DC:1228`); строка КОНВЕРТЕР с `convHomeLine` (`DC:1229`, вида `C40 30 → S3 4.6`); строка ОЦЕНИТЬ ЧАШКУ; секция ПРОШЛЫЙ РАЗ (`lastRows` = `done.slice(0,2)`, `DC:1230`) с цветными точками дескрипторов; секция НА ПОЛКЕ (`shelfRows`, `DC:1231`).
- **B** (`DC:101-124`): герой-фото пачки 296px (`image-slot id="java-0"`), затем пара кнопок ЗАВАРИТЬ | КОНВЕРТЕР, ОЦЕНИТЬ ЧАШКУ, ПРОШЛЫЙ РАЗ на 1 строку.
- **C** (`DC:125-144`) — **финальный по README:25**: строка `[ЗАВАРИТЬ 60px, flex:1] + [квадрат 60×60 с «⇄» → конвертер]`; ниже ОЦЕНИТЬ ЧАШКУ (48px, вся ширина); ниже заголовок `t.log_title` («ЖУРНАЛ») и лента `feedRows` = `S.journal.slice(0, 5)` (`DC:1230`) — строки `дата · заголовок · тех-подстрока · оценка`, тап → `detail`. Никаких секций «полка»/«прошлый раз», никакого фото.

---

## 3. `stagesFor` — генератор стадий

`DC:994-1002`. Вход — объект `b` = `state.brew` (`{ bean, device, hyMode, grind, dose, water, temp, pours, valveAt }`, `DC:920`). Выход — массив троек `[stageKey, targetDurationSec, waterGrams]`.

```js
stagesFor(b) {
  const bean = this.bean(b.bean);
  if (bean.form === 'drip') { … }                                    // DC:996
  const dev = this.dev(b.device) || { flow: 'perc', bottom: 'cone' }; // DC:997
  const mode = dev.flow === 'hybrid' ? 'hy-' + b.hyMode : dev.flow;   // DC:997
  if (mode === 'perc' || mode === 'hy-perc') { … }                    // DC:998
  if (mode === 'imm')    return […];                                  // DC:999
  if (mode === 'hy-imm') return […];                                  // DC:1000
  return […];                                                         // DC:1001  (hy-mid)
}
```

### 3.1 Ветка `drip` (`DC:996`)

```js
const w = Math.round(b.water / b.pours / 5) * 5;   // вода на один пролив, округление до 5 г
for (let i = 0; i < b.pours; i++) {
  st.push(['pour', 30, w]);
  if (i < b.pours - 1) st.push(['steep', 30, 0]);
}
st.push(['drain', 30, 0]);
```
Итого `N` проливов, `N-1` настаиваний между ними, финальный дренаж. Все целевые длительности — 30 с. **Сумма воды `w*N` может не совпасть с `b.water`** из-за округления до 5 г (компенсации нет, в отличие от перколяции).

### 3.2 Ветка `perc` / `hy-perc` (`DC:998`)

```js
const n = Math.max(1, b.pours);
const bl = Math.round(b.dose * 3 / 5) * 5;        // вода смачивания = 3× доза, до 5 г
const rest = b.water - bl;
const per  = Math.round(rest / n / 5) * 5;
st = [['bloom', 45, bl]];
for (let i = 0; i < n; i++)
  st.push(['pour', 40, i === n - 1 ? rest - per * (n - 1) : per]);   // последний пролив добирает остаток
st.push(['drain', 50, 0]);
```
Целевые: bloom 45 с, каждый pour 40 с, drain 50 с. Сумма воды по стадиям **точно равна** `b.water` (последний пролив — арифметический остаток).

### 3.3 Ветка `imm` (`DC:999`)

```js
[['steep', 120, b.water], ['stir', 0, 0], [dev.bottom === 'cyl' ? 'press' : 'drain', 30, 0]]
```
Вся вода уходит в первую стадию. `stir` — маркер с нулевой длительностью; дно `cyl` (AeroPress) даёт `press`, иначе `drain`.

### 3.4 Ветка `hy-imm` (`DC:1000`)

```js
[['steep', 150, b.water], ['valve', 0, 0], ['drain', 60, 0]]
```

### 3.5 Ветка `hy-mid` — дефолтный `return` (`DC:1001`)

```js
[['steep', b.valveAt, b.water], ['valve', 0, 0], ['drain', 90, 0]]
```
Целевая длительность настаивания = момент открытия клапана `b.valveAt` (степпер 20…600 с шагом 10, `DC:1288`).

### 3.6 Ключи стадий и влияние N

Полный набор ключей: `bloom, pour, steep, stir, press, drain, valve` (+ `pause`, порождается только рантаймом таймера, `DC:1012`). Локализация — `D.stageName(k, lang)` = `STR[lang]['t_' + k]` (`data.js:194`).

Количество проливов `N = b.pours` влияет только на `drip` и `perc/hy-perc`. Поле «ПРОЛИВЫ» показывается по условию `DC:1299`:
```js
showPours: brewBean.form === 'drip' || (showDevice && brewDev && (brewDev.flow === 'perc' || (brewDev.flow === 'hybrid' && S.brew.hyMode === 'perc')))
```
Диапазон 1…6 (`DC:1299`).

Важно: если девайс не выбран (`b.device === null`, а `seedDevices()` возвращает `[]` — `data.js:115`), срабатывает фолбэк `{ flow: 'perc', bottom: 'cone' }` (`DC:997`), и заваривание считается перколяцией.

---

## 4. Движок таймера

### 4.1 Тик

`ensureIv()` (`DC:931-943`) — единственный `setInterval` на **250 мс**, ставится в `componentDidMount` (`DC:929`) и повторно в `startBrew` (`DC:1003`), защищён `if (this._iv) return`. Снимается в `componentWillUnmount` (`DC:944`).

Внутри тика (`DC:934-941`):
1. Ранний выход, если `!tm || !tm.run || !this.D`.
2. `el = this.tEl(tm) = (Date.now() - tm.t0)/1000` — общее время (`DC:945`); `sel = this.tSel(tm) = (Date.now() - tm.s0)/1000` — время текущей стадии (`DC:946`).
3. **Прямые записи в DOM** мимо React, по id: `#bj-el` ← `D.fmtT(el)` (`DC:937`, элемент `DC:509`); `#bj-left` ← отклонение (`DC:938`, элемент `DC:520`); `#bj-segs` — ширины заливок сегментов (`DC:940`, элемент `DC:511`).
4. `this.forceUpdate()` (`DC:941`) — и всё то же пересчитывается ещё раз в `renderVals` (`DC:1191-1209`). Прямые DOM-записи здесь — оптимизация плавности, продовой реализации достаточно обычного ререндера/RAF.

Флаг `tm.run` выставляется в `true` при старте и **никогда не сбрасывается** — «настоящей» паузы часов нет.

### 4.2 Модель таймера

```js
timer = { stages, idx, t0, s0, run: true, rec: [], paused: false }   // DC:1003
```
`rec` — накопитель **фактических** стадий той же формы `[key, actualSec, waterG]`.

### 4.3 ПАУЗА (`tPause`, `DC:1004-1008`)

```js
if (!t || t.paused || t.idx >= t.stages.length - 1) return;          // на последней стадии пауза недоступна
const rec = [...t.rec, [t.stages[t.idx][0], Math.round(this.tSel(t)), t.stages[t.idx][2]]];
this.setState({ timer: { ...t, rec, paused: true, s0: Date.now() } });
```
То есть: текущая стадия **закрывается фактической длительностью**, `idx` не меняется, счётчик стадии обнуляется. Экран в паузе (`DC:1200-1202`): номер стадии → `'· · ·'`, имя → `t.t_pause` («ПАУЗА»), строка воды → `'даём стечь'` / `'letting it drain'`, отклонение → `+ M:SS` (растущее). Кнопка ПАУЗА скрывается: `tPauseShow: !tm.paused && tm.idx < st.length - 1` (`DC:1205`).

### 4.4 Главная кнопка (`tAdv`, `DC:1009-1020`)

```js
const dur = Math.round(this.tSel(t));
if (t.paused) {
  const rec = [...t.rec, ['pause', dur, 0]];                          // «стекание» = отдельная стадия
  let idx = t.idx + 1;
  if (st[idx] && st[idx][1] === 0 && idx < st.length - 1) { rec.push([st[idx][0], 0, 0]); idx++; }
  this.setState({ timer: { ...t, rec, paused: false, idx, s0: Date.now() } }); return;
}
const rec = [...t.rec, [st[t.idx][0], dur, st[t.idx][2]]];
if (t.idx >= st.length - 1) { this.finishBrew(rec); return; }
let idx = t.idx + 1;
if (st[idx] && st[idx][1] === 0 && idx < st.length - 1) { rec.push([st[idx][0], 0, 0]); idx++; }
this.setState({ timer: { ...t, rec, idx, s0: Date.now() } });
```

Два важных правила:
- **Проглатывание маркеров.** Стадия с целевой длительностью `0` (`stir`, `valve`) не становится активной: она записывается в `rec` с длительностью 0 и индекс перескакивает дальше. Пользователю она видна только как **текст на главной кнопке**: `tBtnLabel` (`DC:1204`) при `nxt[1] === 0` показывает имя маркера (`РАЗМЕШАТЬ` / `ОТКРЫТЬ КЛАПАН`) вместо `ДАЛЬШЕ`.
- **Пауза как стадия.** `['pause', dur, 0]` попадает в `rec` между закрытой стадией и следующей — ровно как требует README:48.

### 4.5 Отображаемые значения (`DC:1191-1209`)

- `total = st.reduce((s,x) => s + x[1], 0)` — плановая длительность; `tTargetLine` = `цель M:SS` (`DC:1198`).
- `tSegs` (`DC:1199`): ширина сегмента `x[1] ? max(1.2, x[1]/total*100 - 0.6) : 1` (маркеры получают 1 %); заливка `i < idx ? 100 : i > idx ? 0 : paused ? 100 : x[1] ? min(100, sel/x[1]*100) : 0`.
- `cum = st.slice(0, tm.idx + 1).reduce((s,x) => s + x[2], 0)` (`DC:1195`) — **накопительная вода включая текущую стадию**; `tWaterLine` = `${cum} г из ${S.brew.water}` (`DC:1201`), при отсутствии воды — `'—'`.
- Отклонение `tStageLeft` (`DC:1202`): `sel <= cur[1] ? '− ' + fmtT(cur[1]-sel) : '+ ' + fmtT(sel-cur[1])`; для маркеров — пустая строка.
- `tNextLine` (`DC:1203`): `дальше: ИМЯ · N г` либо `последняя стадия`.
- `tBtnLabel` (`DC:1204`): в паузе — имя следующей стадии либо `t.t_finish`; вне паузы — `t.t_finish` на последней стадии, имя маркера если следующий с нулевой длительностью, иначе `t.t_next` («ДАЛЬШЕ»).
- `tCancel` (`DC:1206`): `timer: null, screen: 'brew'` — без работы со `stack`.
- `tBeanLine` (`DC:1207`): `имя пачки · девайс (с обрезкой «Hario ») · температура°`.

### 4.6 Завершение

`finishBrew(rec)` (`DC:1031`) → `makeEntry(rec, Math.round(this.tEl(timer)))`. **`total` записи — фактический elapsed**, а не сумма стадий.

`makeEntry` (`DC:1021-1030`):
- Строит запись: `id: 'j' + Date.now()`, `date: D.TODAY`, `time` из локального `new Date()`, `bean`, `device`, `devName`, `mode: bean.form === 'drip' ? 'drip' : (dev ? dev.flow : 'perc')`, `grind: bean.form === 'beans' ? brew.grind : null`, `dose: bean.form === 'drip' ? bean.dose : brew.dose`, `water`, `temp`, `total`, `stages` (это фактический `rec`), `status: 'pending'`.
- `pours` пишется для drip и perc (`DC:1026`); `valveAt` — только для гибрида в режиме `mid` (`DC:1027`).
- **Списывает остаток пачки** (`DC:1028`): drip → `leftCount - 1`, иначе `left - e.dose`, с зажимом по нулю.
- Далее `screen: 'rateLater', stack: [], timer: null`.

`logManual()` (`DC:1032`) — «ЗАПИСАТЬ БЕЗ ТАЙМЕРА»: создаёт ту же запись из **плановых** стадий и суммы плановых длительностей.

Экран `rateLater`: `rlNow` (`DC:1304`) сбрасывает на `home` и тут же вызывает `ratePending()`; `rlOk` — просто на `home`.

---

## 5. Калибровка

Хранение: два поля стейта — `calib: 0` и `calibSrc: null` (`DC:917`). Единица — **шаги целевой (своей) кофемолки**, знаковая.

Применение (`DC:981-986`):
```js
conv(fromId, toId, val, calib) {
  const f = this.G(fromId), tg = this.G(toId), U = 12;
  const um = f.zero + f.step * val;
  const r = (x) => Math.max(0, Math.round(x * 10) / 10);
  const inv = (u) => (u - tg.zero) / tg.step + calib;                 // offset прибавляется после инверсии
  return { um: Math.round(um), center: r(inv(um)), lo: r(inv(um - U)), hi: r(inv(um + U)) };
}
cv(raw) { return this.conv(this.state.convFrom, this.state.convTo, this.state.convVal, raw ? 0 : this.state.calib); }
```
Смещение применяется **ко всем трём точкам** (`lo`, `center`, `hi`), то есть весь диапазон едет целиком.

Вычисление офсета (`calApply`, `DC:1250`):
```js
const raw = this.cv(true);                                   // пересчёт без калибровки
const off = Math.round((S.calVal - raw.center) * 10) / 10;   // «реально хорошая настройка» − сырой центр
calibSrc = best && Math.abs(S.calVal - best.grind) < 0.05 ? 'log' : 'manual';
```
где `best` (`DC:1153`) — лучшая запись журнала:
```js
done.filter((j) => j.grind != null && j.diag).sort((a,b) => b.diag.balance - a.diag.balance)[0]
```
(сортировка по `diag.balance`, которая в UI подписана «СЛАДОСТЬ»).

Панель калибровки: открывается `toggleCal` (`DC:1247`), предустанавливая `calVal = best ? best.grind : c.center`; подсказка `calSuggestLine` (`DC:1248`) — `из журнала: баланс 7/10 при 4.6`; степпер ±0.1, минимум 0 (`DC:1249`).

Индикация и сброс: `hasCalib: S.calib !== 0`, `calibLine` = `калибровано +N · из журнала|вручную` (`DC:1245`), `calReset` → `{ calib: 0, calibSrc: null }` (`DC:1246`). Та же строка дублируется в настройках (`DC:826-828`).

---

## 6. Конвертер

### 6.1 Формулы

`data.js:34-42` содержит каноническую модель:
```js
const UNCERT = 12; // µm
toUm   = (g, v)  => GRINDERS[g].zero + GRINDERS[g].step * v;
fromUm = (g, um) => (um - GRINDERS[g].zero) / GRINDERS[g].step;
convert(from, to, val, calib = 0) → { um, center, lo, hi }
```
**Но `Component` их не вызывает** (проверено: `D.convert`, `D.toUm`, `D.fromUm` в DC — 0 совпадений). Вместо этого `DC:981` дублирует ту же математику, но через `this.G(id)` (`DC:978`), который ищет молку сначала в `state.grinders` (свои), потом в `D.GRINDER_DB`, потом фолбэк:
```js
G(id) { const gs = this.state.grinders || []; return gs.find(g => g.id === id) || (this.D && this.D.GRINDER_DB.find(g => g.id === id)) || gs[0] || { name:'—', step:1, zero:0, dp:0, unit:{ru:'',en:''} }; }
```
Причина расхождения: `data.js` `GRINDERS` — объект всего из двух записей (`c40`, `s3`, `data.js:4-7`), а `GRINDER_DB` — массив из 24 (`data.js:8-33`). В проде обе структуры нужно свести к одному адаптеру `{id, name, short, step, zero, dp}` (CLAUDE_CODE_TASK:17).

### 6.2 Экран

- Шапка: `dbCountLine` = `${D.GRINDER_DB.length} кофемолки · база` (`DC:1234`).
- **ОТКУДА** — пикер с поиском (`DC:158-174`): `gPickToggle` открывает/закрывает и чистит запрос (`DC:1235`); `setGQuery` (`DC:1236`); `dbRows` (`DC:1237`) фильтрует `D.GRINDER_DB` по `g.name.toLowerCase().includes(query.toLowerCase())`, показывает `name` и мету `${g.step} µm`, отмечает выбранную левой рамкой 2px `#EDEDEB`; тап → `convFrom = g.id`, пикер закрывается.
- Степпер значения: шаг зависит от разрядности исходной молки — `const step = fromG.dp ? 0.5 : 1` (`DC:1151`); `bumpConv` (`DC:1152`) зажимает снизу нулём и округляет до 0.1.
- Техстрока `convTech` = `${convVal} ${unitOf(fromG)} · ${c.um} µm` (`DC:1240`). `unitOf` (`DC:979`) берёт `g.unit[lang]`, а при отсутствии поля (все записи `GRINDER_DB` его не имеют) — `'кликов' / 'clicks'`.
- **КУДА** — только свои молки, перебор по тапу: `cycleTo → cycleG('convTo')` (`DC:987-993`). Функция **выходит сразу, если своих молок меньше двух** (`DC:989`), и пропускает молку, занятую в другом поле.
- **Главный результат — диапазон** (`DC:184-187`): `rangeLo—rangeHi` шрифтом 46px/300, единица = `unitOf(toG).toUpperCase()` (`DC:1241`).
- Полоса-шкала (`DC:188-192`): `win = Math.max(8, Math.ceil(c.hi * 1.4))` (`DC:1150`); `bandL = lo/win*100`, `bandW = (hi-lo)/win*100`, `centerPct = center/win*100`, подписи `0` и `win` (`DC:1243`).
- Второстепенная строка `centerLine` = `центр N · UM µm · STEP мкм/шаг` (`DC:1244`).
- **ВЗЯТЬ В ЗАВАРИВАНИЕ** (`useInBrew`, `DC:1251`):
```js
this.setState({ brew: { ...S.brew, grind: c.center }, screen: 'brew', stack: [...S.stack, 'conv'] })
```
переносится **откалиброванный центр** (не диапазон). Обратная связь на сетапе — `grindHint` (`DC:1294`): `конвертер: LO — HI · центр N`, пересчитанный из текущего состояния конвертера.

---

## 7. `devSvg` — генеративный чертёж девайса

`DC:1099-1129`. Сигнатура `devSvg(d, big)`; `d` — объект с признаками из `D.TRAITS` (`data.js:102-109`). Возвращает React-элемент `<svg viewBox="0 0 300 190">`, размер `big ? 276×175 : 58×37` (`DC:1128`).

### 7.1 Базовая геометрия

```js
const sc = { s: 0.82, m: 1, l: 1.15 }[d.vol] || 1;   // масштаб по объёму
const cx = 150, topY = 30;
if (d.bottom === 'cone')   { hb = 9;        by = 148; }   // полуширина дна, Y дна
else if (d.bottom === 'flat')   { hb = 42*sc; by = 136; }
else if (d.bottom === 'basket') { hb = 64*sc; by = 110; }
else /* cyl */                  { hb = 54*sc; by = 150; }
const ht = d.bottom === 'cyl' ? hb : 88 * sc;             // полуширина верха
L1=[cx-ht,topY]  L2=[cx-hb,by]  R1=[cx+ht,topY]  R2=[cx+hb,by]
```
Хелпер `ln(a, b, o)` (`DC:1109`) — `<line>` с дефолтами `stroke #D8D8D3`, `strokeWidth 1.4`, `strokeLinecap round`.

Скелет:
- Обод: `ln([cx-ht-9, topY], [cx+ht+9, topY], {w:1.8})` — свес 9px с каждой стороны, толще (`DC:1110`).
- Стенки: `ln(L1,L2)`, `ln(R1,R2)` (`DC:1111`).
- Дно: `if (d.bottom !== 'cone') ln(L2,R2)` (`DC:1112`).
- Линия стола: `ln([cx-102,174],[cx+102,174], {s:'#262624', w:1})` (`DC:1127`).

### 7.2 Толщина стенки по материалу (`DC:1113-1114`)

```js
const off = { ceramic: 5.5, glass: 2.5, plastic: 0, metal: 1.8 }[d.material] || 0;
if (off) {
  const dy = d.bottom === 'cone' ? 7 : 0;
  ln([L1[0]+off, topY], [L2[0]+off*0.7, by-dy], {w:1});          // внутренняя левая
  ln([R1[0]-off, topY], [R2[0]-off*0.7, by-dy], {w:1});          // внутренняя правая
  if (d.bottom !== 'cone')
    ln([L2[0]+off*0.7, by-off*0.9], [R2[0]-off*0.7, by-off*0.9], {w:1});  // внутреннее дно
}
```
Внутренний контур сходится к дну с коэффициентом 0.7; у конуса он не доводится до вершины (`dy = 7`). При `plastic` двойной стенки нет вовсе.

### 7.3 Текстуры стенки (`DC:1116-1119`)

Общий цвет текстур `tex = { s: '#6E6E68', w: 1 }`; хелпер интерполяции `P(a,b,t)` (`DC:1115`).

- `ribs` — 4 прямых ребра по долям ширины `[-0.62, -0.31, 0.31, 0.62]`: от `[cx + f*ht, topY+5]` до `[cx + f*hb, by-4]`.
- `spiral` — по обеим стенкам (`s = +1` слева, `−1` справа), в точках `t ∈ [0.18, 0.38, 0.58, 0.78]`: короткий наклонный штрих от `[px + s*3, py-4]` до `[px + s*14, py+5]`.
- `petal` — `t ∈ [0.15, 0.38, 0.61, 0.8]`, каждая — квадратичная кривая `M px+s*2 py-6 q s*9 7 0 13`, `fill:none`, `stroke #6E6E68`, `w:1`.
- `smooth` — ничего не рисуется.

### 7.4 Фильтр (`DC:1120-1122`)

```js
const dash = { pcone: '5 4', wave: '2 3', metal: '1 3', cloth: '7 3 2 3' }[d.filter];
if (dash) { // две пунктирные линии внутри стенок, stroke #8C8C87, w:1
  a1=P(L1,L2,0.14) b1=P(L1,L2,0.94)   →  ln([a1.x+13, a1.y], [b1.x+7, b1.y-4], {d:dash})
  a2=P(R1,R2,0.14) b2=P(R1,R2,0.94)   →  ln([a2.x-13, a2.y], [b2.x-7, b2.y-4], {d:dash})
}
if (d.filter === 'pflat') ln([cx-hb+8, by-9], [cx+hb-8, by-9], {s:'#8C8C87', w:1, d:'4 3'});  // горизонтальный диск
```
Вариант `built` (встроенный, `data.js:106`) визуально не отрисовывается вообще.

### 7.5 Поток: клапан и капли (`DC:1123-1125`)

- `hybrid`: стойка `ln([cx,by],[cx,by+9])`, **кружок клапана** `circle(cx, by+14, r=4.5)`, `fill:none`, `stroke #D8D8D3`, `w 1.4`; под ним черта сосуда `ln([cx-10,by+22],[cx+10,by+22])`.
- `perc`: пунктирная струя/капли `ln([cx,by+6],[cx,by+22], {s:'#6E6E68', w:1.2, d:'2 5'})`.
- `imm` и дно не `cyl`: глухая перемычка `ln([cx-13,by],[cx+13,by], {w:1.8})`.

### 7.6 Цилиндр = поршень (`DC:1126`)

Для `bottom === 'cyl'` добавляются три линии: диск поршня `ln([cx-hb+6,54],[cx+hb-6,54],{w:1.6})`, шток `ln([cx,54],[cx,36])`, ручка `ln([cx-16,36],[cx+16,36],{w:1.8})`.

### 7.7 Подписи

`devLine(d)` (`DC:1130`) собирает техстроку `поток · дно · стенка · фильтр · материал` из `D.TRAITS[…].opts[key][ru?0:1]` (объём в строку не входит). Плюс `draftNote` (`DC:1277`) — конкатенация двух локальных словарей, объявленных прямо в `renderVals`:
- `matNote` (`DC:1213`): ceramic/glass/plastic/metal — по фразе на RU/EN;
- `wallNote` (`DC:1214`): petal/ribs/spiral/smooth (у `flat` — пустая строка; ключа `flat` в `TRAITS.wall` нет — мёртвая ветка).

Использование: список девайсов `devRows` (`DC:1273`, маленький), пикер на сетапе `pickDevs` (`DC:1284`, маленький), конструктор `draftSvg` (`DC:1275`, `big = true`).

---

## 8. `wheelSvg` + `arcPath` — колесо вкусов

### 8.1 Уровни (`wheelItems`, `DC:1050-1058`)

Три уровня, состояние — `state.path` (массив id) и `state.dir` (±1 для анимации).

| `path.length` | Источник | `l` (lightness) | `leaf` |
|---|---|---|---|
| 0 | `D.WHEEL` — 9 категорий | `i % 2 ? 0.72 : 0.66` (через одну) | `false` |
| 1 | `cat.sub` — подкатегории | `0.6 + i * 0.22 / max(1, sub.length-1)` | `false` |
| 2 | `sub.d` — дескрипторы | `0.6 + i * 0.24 / max(1, d.length-1)` | `true` |

`h` и `c` на всех уровнях берутся **от категории** — оттенок фиксирован, глубина различается только светлотой. Подпись — `o.ru` / `o.en` (для листьев `d[1]` / `d[2]`).

### 8.2 `arcPath` (`DC:1059-1064`)

```js
arcPath(cx, cy, r0, r1, a0, a1) {
  const p = (r,a) => [cx + Math.cos(a)*r, cy + Math.sin(a)*r];
  const [x0,y0]=p(r1,a0), [x1,y1]=p(r1,a1), [x2,y2]=p(r0,a1), [x3,y3]=p(r0,a0);
  const lg = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${x0} ${y0} A ${r1} ${r1} 0 ${lg} 1 ${x1} ${y1} L ${x2} ${y2} A ${r0} ${r0} 0 ${lg} 0 ${x3} ${y3} Z`;
}
```
Кольцевой сектор: внешняя дуга по часовой (`sweep 1`), внутренняя обратно (`sweep 0`).

### 8.3 Геометрия и раскладка (`DC:1067-1090`)

```js
const cx = 175, cy = 175, r0 = 74, r1 = 170, g = 0.016;   // g — зазор между секторами в радианах
a0 = -π/2 + i*2π/n + g;   a1 = -π/2 + (i+1)*2π/n - g;      // старт с 12 часов, по часовой
```
- Заливка сектора: `oklch(${it.l.toFixed(3)} ${it.c} ${it.h})` (`DC:1074`).
- Обводка: выбранный лист — `#FFFFFF` шириной 2.5; иначе `#0C0C0C` шириной 1.5.
- Подпись (`DC:1075-1077`): в середине кольца `rm = (r0+r1)/2 + 2 = 124`, поворот на `am` градусов, **с доворотом на 180° в левой половине** (`if (Math.cos(am) < 0) rot += 180`); `fill #0D0D0B`, `fontWeight 600`, `textTransform: uppercase`, `pointerEvents: none`; кегль адаптивный: `n > 10 ? 8 : n > 6 ? 9 : 10`.
- **Точка памяти** (`DC:1078`): если `memHit(it)` — белый `circle` радиусом 2.3, `opacity 0.9`, на радиусе `r1 - 9 = 161` по средней оси сектора.
- **Центральная кнопка** (`DC:1080`): круг радиусом `r0 - 9 = 65`, `fill #0C0C0C`, `stroke #2A2A28`, `onClick → wheelUp()`, курсор `pointer` только при непустом `path`. Внутри (`DC:1082-1087`): при непустом `path` — стрелка `↑` (13px, `#8C8C87`) и имя текущего уровня (8.5px, ls 1.5, `#EDEDEB`, uppercase); при пустом — `t.wheel_root` («ВСЁ», 9px, ls 2, `#575752`).
- SVG: `viewBox '0 0 350 350'`, рендер 322×322 (`DC:1089`).

### 8.4 Анимация «приближения» (`DC:1088`)

```js
R('div', { key: path.join('/') || 'root',
           style: { animation: (dir > 0 ? 'whzin' : 'whzout') + ' .32s cubic-bezier(.22,.8,.24,1)' } }, svg)
```
Приём: **смена `key` пересоздаёт узел**, из-за чего CSS-анимация проигрывается заново. Кейфреймы (`DC:23-24`):
```css
@keyframes whzin  { from{transform:scale(.72); opacity:.25} to{transform:scale(1); opacity:1} }
@keyframes whzout { from{transform:scale(1.36);opacity:.25} to{transform:scale(1); opacity:1} }
```
`dir` ставится в `wheelTap` (`DC:1065`, `dir: 1` — вглубь), `wheelUp` (`DC:1066`, `dir: -1`) и в крошках (`DC:1210-1211`, `dir: -1`).

### 8.5 Взаимодействие

```js
wheelTap(it) { if (it.leaf) { this.togglePick(it.id); return; } this.setState({ path: [...this.state.path, it.id], dir: 1 }); }  // DC:1065
wheelUp()    { const p = this.state.path; if (!p.length) return; this.setState({ path: p.slice(0,-1), dir: -1 }); }              // DC:1066
```
Только тап, никаких свайпов (README:60 — левый край iOS занят системным «назад»).

### 8.6 Крошки и «добавить отсюда» (`DC:1210-1211`, `DC:1321`)

```js
crumbs = [{ label: t.wheel_root, col: path.length ? '#575752' : '#EDEDEB', jump: () => setState({path: [], dir: -1}) },
          ...path.map((id, i) => ({ label: ' / ' + nameOf(id), col: i === path.length-1 ? '#EDEDEB' : '#575752',
                                    jump: () => setState({ path: path.slice(0, i+1), dir: -1 }) }))];
canAddHere: !!lastPath && !S.picked.some(p => p.id === lastPath)
addHere:    () => this.togglePick(lastPath)
```
То есть **остановиться можно на любом уровне**: кнопка `+ Фруктовое` добавляет саму категорию/подкатегорию как дескриптор.

### 8.7 Память (`memSet` / `memHit`, `DC:1048-1049`)

```js
memSet() { const m = new Set(); journal.forEach(j => { if (j.status === 'done' && j.desc) j.desc.forEach(([id]) => m.add(id)); }); return m; }
memHit(it) {
  if (this._mem.has(it.id)) return true;
  if (it.leaf) return false;
  for (const id of this._mem) { const d = D.DESC[id]; if (d && (d.cat === it.id || d.sub === it.id)) return true; }
  return false;
}
```
Union дескрипторов всех **done**-записей; для нелистовых секторов — «внутри есть хоть один запомненный». Кэш `this._mem` пересобирается на каждом `wheelSvg()` (`DC:1069`). Никаких счётчиков — только факт.

### 8.8 Цвет чипов и интенсивность

```js
hueOf(id)     → { h, c } из D.DESC[id], иначе из категории/подкатегории    // DC:962
colOf(id, a)  → `oklch(0.72 ${(c*0.92).toFixed(3)} ${h}${a ? ' / '+a : ''})` // DC:963
```
Чипы: рамка `colOf(id, 0.8)`, точки — `colOf(id)` (`DC:1042`). То есть у тегов светлота фиксирована 0.72, а chroma слегка приглушена (×0.92) — отдельно от логики секторов.

Интенсивность (`DC:1039-1046`): новый выбор всегда `int: 2`; `cycle` — `int % 3 + 1` (цикл 2→3→1→2); точки — `'●'.repeat(int) + '○'.repeat(3 - int)`; `remove` выкидывает из `picked`.

### 8.9 Мини-колесо (`miniWheelSvg`, `DC:1091-1098`)

9 категорий, `cx=cy=40`, `r0=15`, `r1=38`, зазор 0.03, заливка `oklch(${i%2?0.72:0.66} ${c.c} ${c.h})`, обводка `#0C0C0C` 1px, `viewBox '0 0 80 80'`, рендер 64×64. Рисуется только на экране диагностики (`DC:1312`) как единственное цветное пятно и вход в колесо.

---

## 9. Сравнение записей

Вход (`DC:1323-1329`): `toggleCmp` включает `cmpMode` и чистит `cmpSel`; тап по строке журнала в этом режиме — `[...S.cmpSel, e.id].slice(-2)` (`DC:1327`, всегда держим последние две); `cmpReady` при ровно двух; `openCompare` (`DC:1329`) сортирует пару по дате **по убыванию** (новая становится A) и уходит на `compare` через `go`.

Диффер (`DC:1167-1190`):
```js
const row = (label, va, vb) => {
  const df = String(va ?? '—') !== String(vb ?? '—');
  return { label, a: String(va ?? '—'), b: String(vb ?? '—'),
           ca: df ? '#EDEDEB' : '#6E6E68', cb: df ? '#EDEDEB' : '#6E6E68',
           wa: df ? 700 : 400,             wb: df ? 700 : 400 };
};
```
Сравнение — **строковое, после нормализации `null/undefined → '—'`**. Отличающиеся значения белые и жирные, совпадающие — приглушённые `#6E6E68` и обычной насыщенности (README:80 совпадает).

15 строк в фиксированном порядке (`DC:1174-1188`):
`ЗЕРНО` (имя пачки) · `ДЕВАЙС` (`devLabelOf`, `DC:969`) · `РЕЖИМ` (`D.modeName`) · `ПОМОЛ` · `ВЕС` (+ `г`) · `ВОДА` (+ `г`) · `ТЕМПЕРАТУРА` (+ `°`) · `ВРЕМЯ` (`D.fmtT(total)`) · `КЛАПАН` (`fmtT(valveAt)` или `'—'`) · `КИСЛОТНОСТЬ` · `ГОРЕЧЬ` · `ТЕЛО` · `СЛАДОСТЬ` · `ДЕСКРИПТОРЫ` (имена через запятую) · `ЗАМЕТКА`.

Заголовки колонок (`DC:1170`): `A · DD.MM[· помол]`, `B · DD.MM[· помол]`. Разметка — три колонки: подпись 86px + два flex-столбца (`DC:772-784`).

**Баг, который нельзя копировать:** `row(… this.bean(a.bean).name …)` (`DC:1174`) падает, если в паре есть запись `mode: 'cup'`, у которой `bean === null` (`DC:974`). При этом чашки доступны в фильтрах и в списке журнала, то есть выбрать их в сравнение можно.

---

## 10. Прочее несущее

### 10.1 QR (`qrSvg`, `DC:1131-1141`)

Это **не кодировщик QR**, а детерминированный визуальный шум:
```js
let h = 2166136261;
for (const c of seed) h = ((h ^ c.charCodeAt(0)) * 16777619) >>> 0;   // FNV-1a от id записи
const rnd = () => { h = (h * 1103515245 + 12345) >>> 0; return h / 4294967296; };  // LCG
const N = 21;
inF(x,y) = (x<8&&y<8) || (x>=N-8&&y<8) || (x<8&&y>=N-8);              // зоны финдеров пропускаются
… if (rnd() > 0.55) → тёмный модуль 1×1 fill '#111110'
F(fx,fy): 7×7 тёмный + 5×5 светлый '#EDEDEB' + 3×3 тёмный; вызывается для (0,0), (N-7,0), (0,N-7)
viewBox '-2 -2 25 25', 104×104, background '#EDEDEB'
```
Вызывается на детали записи: `bdQr: de ? this.qrSvg(de.id) : null` (`DC:1337`) с подписью `qrHint` (`DC:1338`). В проде нужен настоящий энкодер и осмысленный payload рецепта.

### 10.2 Голосовой ввод (`DC:1316-1318`)

Полная имитация:
```js
micGo: () => { if (S.listening) return; this.setState({ listening: true });
  setTimeout(() => {
    const tr = ru ? 'черника и мёд, чище на остывании' : 'blueberry and honey, cleaner as it cools';
    this.setState({ note: (note ? note + ' ' : '') + tr, listening: false,
                    sug: ['blueberry','honey'].filter(id => !picked.some(p => p.id === id)) });
  }, 1600); }
```
Признак записи: рамка `#EDEDEB`, точка `#EDEDEB` с `animation: blink 0.9s infinite` (`DC:25`, `DC:1317`). Распознанные дескрипторы **предлагаются чипами**, а не проставляются: `sugChips` (`DC:1318`) — `+ Черника`, тап добавляет `{ id, int: 2 }` в `picked` и убирает из `sug`. Это ровно то поведение, которое README:53 требует сохранить.

### 10.3 Фото

Только `image-slot` с идентификаторами: `java-0` (герой варианта B, `DC:103`), `${s.id}-0` (карточки полки, `DC:1253`), `${bn.id}-${i}` для `i < (bn.photos || 1)` (карточка пачки, `DC:1259`), `new-pack` (добавление, `DC:312`). `bn.photos` — **число** (счётчик слотов), не массив. Открытия на весь экран нет; кнопка `+ ЕЩЁ ФОТО` (`DC:262`) без обработчика.

### 10.4 Карточка «оценка ждёт»

`pendingE = S.journal.find(j => j.status === 'pending')` (`DC:1148`) — первая по порядку (журнал хранится новыми вперёд). Рендерится на Home **вне** блоков A/B/C (`DC:52-60`), значит есть во всех вариантах.
- `pendingTitle` = `entryTitle(e)` + помол, `pendingWhen` = `сегодня|DD.MM · HH:MM` (`DC:1225`).
- `ratePending()` (`DC:1033`) сбрасывает `diag` в `{acid:5,bitter:5,body:5,balance:5}`, `note`, `picked`, `sug`, `path` и уходит на `diag` со `stack: [текущий]`.

`entryTitle` / `entrySub` / `entryMark` (`DC:970`, `DC:971`, `DC:977`): заголовок `Пачка · Девайс` (для `cup` — `title` или «Чашка»); подстрока `помол N · доза г · вода г · T° · M:SS` (для `cup` — «дегустация · без рецепта»); оценка — `С N` / `S N` из `diag.balance`.

### 10.5 Дегустация «вне журнала» (`openTaste`, `DC:972-976`)

Создаёт запись `{ mode: 'cup', bean: null, device: null, status: 'pending' }`, сразу открывает `diag` c пустым `tasteName`. На экране диагностики появляется поле имени (`DC:550-555`, `isTasting` — `DC:1307`), `diagSubLine` меняется на «что в чашке — по ощущению» (`DC:1306`). При сохранении `title` записывается только для `cup` (`DC:1036`).

### 10.6 Диагностика (`DC:1311`, `saveDiag` `DC:1034-1038`)

4 шкалы с 11 ячейками (0…10): `bg: i <= S.diag[k] ? '#EDEDEB' : '#141413'`, тап ставит значение `i`. Ключи и подписи (`DC:1163`): `acid → КИСЛОТНОСТЬ`, `bitter → ГОРЕЧЬ`, `body → ТЕЛО`, **`balance → СЛАДОСТЬ`** (имя поля и подпись расходятся намеренно — сохранять как есть).

`saveDiag`: патчит запись по `rateId` — `diag`, `note`, `desc: picked.map(p => [p.id, p.int])`, `status: 'done'`, для `cup` ещё `title`; затем `screen: 'home', stack: [], cmpSel: []`.

### 10.7 Фильтры журнала (`DC:1164-1165`)

```js
filters = [{k:'all'}, ...S.shelf.map(s => ({ k: s.id, label: s.name.split(' ·')[0].split(' (')[0] })),
           {k:'m-perc'}, {k:'m-imm'}, {k:'m-hybrid'}, {k:'m-drip'}, {k:'m-cup'}];
logEntries = S.journal.filter(e => S.logFilter === 'all' ? true
                                 : S.logFilter.startsWith('m-') ? e.mode === S.logFilter.slice(2)
                                 : e.bean === S.logFilter);
```
Подпись пачки обрезается по ` ·` и ` (`. Активный чип — рамка/текст `#EDEDEB`, остальные `#2A2A28`/`#8C8C87` (`DC:1325`).

### 10.8 Настройки — CRUD кофемолок (`DC:1339-1345`)

- Список — **только свои** `S.grinders`, мета `${unitOf(g)} · ${g.step} µm`.
- Удаление с подтверждением: `ask → gDelId = g.id`; появляется строка `УДАЛИТЬ? [ДА] [✕]` (`DC:799-803`); `yes` фильтрует список и, **если удаляемая была выбрана как `convTo`, переводит `convTo` на `gs[0].id`**; `no` сбрасывает `gDelId`.
- `canDel: S.grinders.length > 1 && S.gDelId !== g.id` — последнюю удалить нельзя.
- Добавление (`DC:813-825`, `DC:1341-1345`): имя + степпер шага µm (±0.5, зажим `[0.5, 40]`, дефолт 10). `gSave` создаёт `{ id: 'g'+Date.now(), name: gName || 'Grinder', step, zero: 300, dp: 1, unit: { ru:'кликов', en:'clicks' } }` — **`zero` и `dp` захардкожены**.
- Ниже: `МОИ ДЕВАЙСЫ` со счётчиком (`DC:1346`), переключатель языка, ЭКСПОРТ, ИМПОРТ, СПЕЦИФИКАЦИЯ, подвал `{{ t.set_offline }} · v0.1` (`DC:856`).

### 10.9 Экспорт / импорт

`exportTap: () => this.setState({ exported: true })` (`DC:1347`) — только флаг, после которого показывается строка `база записана в файл brew-journal.json` (`DC:845-847`). Реального файла нет. **У строки ИМПОРТ (`DC:848-851`) нет `onClick` вообще** — она нефункциональна.

### 10.10 Конструктор девайсов (`DC:1273-1280`)

- `devRows` (`DC:1273`): открытие копирует девайс в `draft` и ставит `devId`.
- `newDev` (`DC:1274`): дефолтный черновик `{ name:'', flow:'perc', bottom:'cone', wall:'petal', filter:'pcone', material:'plastic', vol:'m' }`.
- `traitRows` (`DC:1279`): генерируются из `Object.entries(D.TRAITS)` — 6 групп, чипы из `tr.opts`; тап патчит `draft[key]`, чертёж перерисовывается мгновенно.
- `saveDev` (`DC:1280`): имя по умолчанию `'Custom'`; обновление по `devId` или добавление с `id: 'd'+Date.now()`; возврат на предыдущий экран из `stack`; **если вернулись на `brew` и девайс был новым — он автоматически выбирается** в `brew.device`.

### 10.11 Сетап заваривания — сводка ограничений

| Поле | Условие показа | Шаг | Диапазон | Строка |
|---|---|---|---|---|
| ПОМОЛ | `brewBean.form === 'beans'` | ±0.1 (+ текстовый ввод) | `[0, 36]` | `DC:1289-1293` |
| ВЕС (доза) | `form !== 'drip'` | ±0.5 | `[8, 40]` | `DC:1295-1296` |
| ВОДА | всегда | ±10 | `[80, 900]` | `DC:1297` |
| ТЕМПЕРАТУРА | всегда | ±1 | `[70, 100]` | `DC:1298` |
| ПРОЛИВЫ | `drip` \| `perc` \| `hybrid+perc` | ±1 | `[1, 6]` | `DC:1299` |
| КЛАПАН | `hybrid` и `hyMode === 'mid'` | ±10 | `[20, 600]` | `DC:1287-1288` |

Текстовый ввод помола (`DC:1291`) принимает запятую (`replace(',', '.')`), держит «сырой» текст в `state.grindText` до `onBlur` (`DC:1292`), а числовое значение зажимает в `[0, 36]`. `ratioLine` в шапке — `1:${(water/dose).toFixed(1)}` (`DC:1281`), где для дрипа `dose` берётся из пачки (`DC:1160`).

Инлайн-добавление пачки (`addSave`, `DC:1271`): парсит `dd.mm.yyyy` в ISO, для дрипа хардкодит `dose: 12`, и **если пришли с `brew` — возвращается туда с уже выбранной новой пачкой**.

---

## 11. Расхождения прототипа с README и внутренние несогласованности

### 11.1 Прототип ýже README (не реализовано)

1. **Персистентность отсутствует полностью** — ни `localStorage`, ни IndexedDB. README:14 и CLAUDE_CODE_TASK:10 требуют Dexie; прототип не даёт по этому ничего.
2. **Импорт не подключён** (`DC:848-851` без обработчика), **экспорт — фиктивный флаг** (`DC:1347`). README:84 и DoD п.3 требуют рабочего цикла.
3. **QR — декоративный шум**, не кодировщик (`DC:1131-1141`), хотя README:81 называет его «QR рецепта».
4. **Голос — `setTimeout` на 1600 мс с зашитой фразой** (`DC:1316`).
5. **Keep-awake не реализован** — только статичная надпись `t.t_awake` («экран не гаснет», `DC:507`). Локальных уведомлений (README:106) нет.
6. **Пустого состояния журнала нет** — строка `home_empty` в `STR` не используется (README:29 требует «пустой журнал приглашает заварить»).
7. **Блок «НА СЛЕДУЮЩИЙ РАЗ» отсутствует**: функция `advice(d, lang)` (`data.js:145-155`) — мёртвый код, `t.diag_advice` не используется. README:53 описывает диагностику без него, но строка и функция в пакете есть — решение по проду нужно принять явно.
8. **Фото пачек не открываются на весь экран** (README:70), `+ ЕЩЁ ФОТО` не работает.
9. **`seedDevices()` возвращает `[]`** (`data.js:115`), а `KNOWN_DEVICES` (`data.js:110-114`) не используется нигде. Из-за этого при первом заваривании девайс не выбран и `stagesFor` молча считает перколяцию (`DC:997`), а `makeEntry` пишет `mode: 'perc'` (`DC:1025`).
10. **`cycleTo` не работает при одной своей молке**: `if (gs.length < 2) return` (`DC:989`), а стартовый набор — ровно одна (`s3`, `DC:928`). README:32 обещает «тап перебирает свои».
11. **База 24 молки вместо 134** (`data.js:8-33`) — ожидаемо, README:32 это оговаривает.
12. Неиспользуемые строки `STR` (кандидаты на удаление либо на реализацию): `back`, `home_pending`, `home_pending_sub`, `home_empty`, `conv_range`, `conv_resolves`, `dev_hint`, `brew_ratio`, `brew_suggest`, `brew_no_grind`, `t_done`, `t_water_total`, `rate_ok`, `diag_advice`, `diag_to_wheel`, `diag_skip`, `wheel_up`, `wheel_mem`, `wheel_prev`, `log_param`. Также не используются экспорты `catColor`, `convert`, `toUm`, `fromUm`, `KNOWN_DEVICES`, `advice` и поле `stirAt` в сиде `j6` (`data.js:139`).

### 11.2 Прямые противоречия README

13. **Толщина стенки по материалу.** README:75: «керамика 5.5 > цилиндр-металл > стекло > пластик 0». Код (`DC:1113`): `{ ceramic: 5.5, glass: 2.5, plastic: 0, metal: 1.8 }` — **стекло толще металла**, порядок обратный описанному.
14. **Диапазон светлоты колеса.** README:63 и `specWheelNote` (`DC:1349`) заявляют `0.60–0.78`. Фактически: уровень 1 даёт максимум `0.6 + 0.22 = 0.82` (`DC:1055`), уровень 2 — `0.6 + 0.24 = 0.84` (`DC:1057`). Категории при этом ходят только по 0.66/0.72 (`DC:1053`).
15. **Кнопка завершения таймера.** README:50 говорит «ГОТОВО». Код использует `t.t_finish` = «ЗАВЕРШИТЬ» (`DC:1204`), а `t_done` = «ГОТОВО» не задействован; «ГОТОВО» в интерфейсе — это `t.wheel_done` в шапке колеса (`DC:623`).
16. **`Bean.photos` — число, а не массив.** README:88 описывает `photos[]`; в сидах и в `addSave` это счётчик (`data.js:119`, `DC:1259`, `DC:1271`).
17. **Интенсивность стартует с 2, а не с 1.** README:53 говорит «тап циклит 1–3»; код добавляет с `int: 2` и циклит `2→3→1` (`DC:1039`, `DC:1044`).
18. **Дефолт `homeVariant` в прототипе — `'a'`** (`DC:912`), а реализовывать надо `C` (README:25, CLAUDE_CODE_TASK:3). При этом C — самый бедный вариант: в нём нет ни секции «НА ПОЛКЕ», ни `ctaSub`, ни `convHomeLine`, ни цветных точек дескрипторов в ленте (`DC:125-144` против `DC:61-100`). Стоит явно подтвердить, что эти элементы в продe не нужны.
19. **Фильтр `built`** объявлен в `TRAITS.filter` (`data.js:106`), но `devSvg` его никак не рисует (`DC:1120-1122`) — девайс со встроенным фильтром визуально неотличим от девайса без фильтра.
20. **`wallNote` содержит ключ `flat`**, которого нет в `TRAITS.wall` (`DC:1214` против `data.js:105`) — мёртвая ветка.

### 11.3 Дефекты и хардкоды, которые нельзя переносить дословно

21. **Падение сравнения на дегустациях**: `this.bean(a.bean).name` при `bean === null` (`DC:1174`).
22. **Дата захардкожена в двух местах**: `todayLine: '01.08.2026'` (`DC:1216`) и `TODAY = '2026-08-01'` (`data.js:2`), от которой считается `ageDays`/`phaseOf` и проставляется `date` новых записей (`DC:1025`).
23. **Дубль формулы конвертации** в `DC:981` и `data.js:37` с независимой константой `U = 12` / `UNCERT = 12`. В проде — один модуль.
24. **Хардкоды при создании сущностей**: новая молка получает `zero: 300, dp: 1` (`DC:1345`); новая дрип-пачка — `dose: 12` (`DC:1271`); новая пачка — `photos: 1`.
25. **Пауза недоступна на последней стадии** (`DC:1005`, `t.idx >= t.stages.length - 1`) — во время финального дренажа паузу не поставить. Скорее всего намеренно (дренаж и есть «стекание»), но это надо зафиксировать как правило, а не как случайность.
26. **Вода в дрип-рецепте может не сойтись** с заданной (`DC:996`, округление до 5 г без компенсации), тогда как в перколяции остаток добирается последним проливом (`DC:998`).
27. **Прямые манипуляции DOM по id** в тике таймера (`DC:937-940`) — артефакт прототипа; в React/Preact-проде это заменяется обычным состоянием и, при необходимости, `requestAnimationFrame`.
28. **`total` записи и сумма стадий не совпадают по определению**: `total` = фактический elapsed (`DC:1031`), сумма `stages` = сумма фактических длительностей без «хвостов» между нажатиями. В `logManual` (`DC:1032`) они, наоборот, равны по построению.