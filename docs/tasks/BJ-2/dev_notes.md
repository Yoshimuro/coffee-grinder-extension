# Заметки разработчика — BJ-2

Статус: зелёный. План S-1…S-6 выполнен целиком, `packages/core` и `apps/extension`
не менялись ни строкой.

## Карта файлов

Всё новое — внутри `apps/journal` (плюс два скрипта в корневом `package.json`).

### Конфигурация (S-1)

| Файл | Что |
|---|---|
| `apps/journal/package.json` | `@coffee/journal` 0.1.0; deps: react/react-dom 18.3.1, dexie 4.4.4, dexie-react-hooks 4.4.0, zustand 5.0.14, @fontsource/jetbrains-mono 5.3.0, `@coffee/core: *`; dev: vite 6.0.7, @vitejs/plugin-react 4.7.0, typescript 5.7.3, vitest 2.1.8, fake-indexeddb 6.2.5, @types/{node,react,react-dom} |
| `apps/journal/tsconfig.json` | наследует `tsconfig.base.json` (strict + `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`); добавлены `jsx: react-jsx` и `types: [node, vite/client, vitest/globals]` |
| `apps/journal/vite.config.ts` | плагин React, `base: './'`, `outDir: dist`, `target: es2022`, `assetsInlineLimit: 4096` |
| `apps/journal/vitest.config.ts` | `tests/unit/**`, `globals`, `environment: node`, `setupFiles: tests/setup.ts` |
| `apps/journal/index.html` | `lang="ru"`, `viewport-fit=cover`, `color-scheme=dark`, `theme-color #0C0C0C` |

### Токены (S-2)

`apps/journal/src/ui/tokens.css` — CSS-переменные + утилити-классы, значения
списаны из `design_handoff_brew_journal 3/README.md` §Токены дословно: палитра
(`#0C0C0C / #141413 / #191917 / #1E1E1C / #232321 / #2A2A28 / #575752 / #8C8C87 /
#B9B9B4 / #EDEDEB`, инверсная кнопка `#EDEDEB` на `#0C0C0C`), шкала (микро-лейбл
10px/ls 2px, техстрока 9–9.5px, body 12–13px, степпер 19–21px, результат 46px/300,
elapsed 74px/300, стадия 29px/700/ls 4px), сетка (4px, поля 20px, таргеты 48px,
степперы 42–56px, кнопка таймера 88px, `--radius: 0`), safe-area,
`font-variant-numeric: tabular-nums` на `body`, `color-scheme: dark`.

Диапазонные значения README (9–9.5, 12–13, 19–21) заведены двумя переменными
(`--fs-tech` / `--fs-tech-min` и т.п.), чтобы обе границы диапазона остались в коде.

### БД (S-3)

| Файл | Что |
|---|---|
| `apps/journal/src/db/schema.ts` | `BrewJournalDB`, `version(1).stores` ровно как в плане; типы записей по спеке §6 |
| `apps/journal/src/db/seed.ts` | `findSeedGrinder`, `toOwnGrinder`, `seed()` с guard'ом |

Схема v1 (контракт, дословно из S-3):

```
grinders: 'id'
beans:    'id, form'
devices:  'id'
entries:  'id, date, status, bean, mode'
settings: 'key'
```

### Навигация (S-4)

`apps/journal/src/app/nav.ts` — zustand-стор `{screen, stack, go, back, setTab}`,
union `Screen` из 17 имён, `TABS = ['home','shelf','log','more']`, предикат `isTab`.
Семантика ровно по component-report §1.3: `go` пушит текущий экран, `back` снимает
верх стека либо падает в `home`, `setTab` ставит экран и обнуляет стек.

### Экраны (S-5)

`src/ui/App.tsx`, `src/ui/screenMeta.ts`, `src/ui/components/{ScreenShell,TabBar,StubLinks}.tsx`,
`src/ui/screens/*.tsx` — 17 файлов (`Home` + 16 заглушек), `Home.css`, `StubLinks.css`.

### Тесты (S-6)

`tests/setup.ts`, `tests/unit/nav.test.ts`, `tests/unit/db.test.ts`.

### Корневой package.json

Добавлены две строки, `verify` не тронут:

```
"build:journal": "npm run build:data && npm run build -w @coffee/journal",
"dev:journal":   "npm run build:data && npm run dev -w @coffee/journal",
```

Корневые `typecheck` и `test` идут через `--workspaces --if-present`, поэтому
journal попал в них сам, без правок.

Обновлён `apps/journal/src/README.md` — он был плейсхолдером «Заполняется в BJ-2»
и после этой задачи врал бы; теперь там таблица фактической раскладки `src/`.

## Решения по конфигурации

- **React 18, не 19.** Спека §5 называет React 18; 18.3.1 — последний в линейке.
- **`base: './'`** — бандл должен открываться с `file://` внутри WebView (BJ-6);
  корне-абсолютные пути там не резолвятся.
- **Шрифт импортируется по подмножествам и весам** (`latin-{300,400,500,700}.css`
  + `cyrillic-{...}.css`, 8 файлов), а не через `index.css` пакета: баррель тянет
  веса 100–800 в обоих начертаниях по всем подмножествам — около сорока файлов,
  которые приложению не нужны (митигация R-2). В `dist` ровно 8 woff2 + 8 woff
  (второй формат — фолбэк из самих CSS фонтсорса, отдельными запросами он не
  качается: браузер берёт первый поддерживаемый `src`).
- **Таблицы Dexie присваиваются в конструкторе** (`this.grinders = this.table(...)`),
  а не объявляются через `grinders!: Table<...>`. При `target: ES2022`
  `useDefineForClassFields` включён по умолчанию, и голое объявление поля затёрло
  бы `undefined`-ом объекты таблиц, которые Dexie ставит в `super()`.
- **`settings` — key/value с типизированной картой** `SettingsValues` и хелперами
  `getSetting/putSetting`. Добавление настройки не требует миграции схемы.
- **`App.tsx` — `Record<Screen, ComponentType>`, а не `switch`.** План говорит
  «свитч по screen»; поведение идентичное, но запись через `Record` делает
  забытый экран ошибкой компиляции, тогда как `switch` поймал бы это только
  дополнительной never-проверкой. Считаю это уточнением, а не отступлением.
- **Vitest в `environment: node`** — тесты покрывают стор и схему, DOM не нужен;
  IndexedDB даёт `fake-indexeddb/auto` (D-5).

## Сид (исход D-2)

**Датасетного id `timemore-chestnut-s3` не существует.** В каталоге `@coffee/core`
(134 записи, version 2) Timemore Chestnut S3 лежит под id **`timemore-s3`**
(`packages/core/data/grinders/timemore.json`). Найден так, как предписано:
сначала `grinderById('timemore-chestnut-s3')`, при промахе —
`searchGrinders('timemore chestnut s3')`. Обе ветки оставлены в коде: если
каталог однажды переедет на длинное написание, сид продолжит работать.

Поиск нельзя брать «первым попавшимся»: `searchGrinders('timemore chestnut s3')`
возвращает **две** записи — `timemore-s3` (Chestnut S3) и `timemore-chestnut-s3-esp`
(Chestnut S3 ESP, другая молка с другими жерновами). Поэтому фильтр по точному
`model === 'chestnut s3'`.

Запись **linear**, так что ничего выдумывать не пришлось — все числа списаны из
каталога:

```
id: 'timemore-s3', datasetId: 'timemore-s3', name: 'Timemore Chestnut S3',
micronsPerStep: 86.7, zeroOffsetMicrons: 330,
scale: { min: 0, max: 9, step: 0.1, unit: 'mark' }
```

`id` записи равен `datasetId` — для молки, взятой из каталога, это делает связь
очевидной и сид идемпотентным; молки, созданные пользователем, будут получать
генерируемые id. `toOwnGrinder` возвращает `undefined` для `kind: 'anchors'`:
у якорной кривой нет единого «мкм/шаг», и подставить туда выдуманное число
значило бы показать пользователю фальшивку в техстроке конвертера.

Что ещё пишет сид: `lang: 'ru'`, `calib: {offset: 0, src: null}`, `recents: []`,
и последним — `seeded: true`. Флаг ставится последним и внутри той же транзакции,
поэтому падение на середине оставляет флаг непоставленным и следующий запуск
просто повторит сид. Полка, журнал и девайсы **не сидятся** (D-2): пустые экраны
приглашают заварить, а не показывают выдуманную историю.

Проверено на реальном бандле (preview + браузер): в IndexedDB `brew-journal`
пять стораджей, `settings` — четыре строки выше, `grinders` — одна запись выше,
`beans/entries/devices` пусты.

## Список тестов (19)

`tests/unit/nav.test.ts` (9):
1. в union ровно 17 экранов и все различны;
2. старт — `home` с пустым стеком;
3. `go()` пушит покидаемый экран;
4. `back()` разматывает стек по одному;
5. `back()` на пустом стеке уходит в `home`;
6. `back()` из `home` с пустым стеком — no-op;
7. `setTab()` обнуляет стек (после него `back()` даёт `home`);
8. `go()` на экран, уже лежащий в стеке, работает (дубли допустимы);
9. `isTab()` истинен ровно для четырёх табов.

`tests/unit/db.test.ts` (10):
1. база открывается на `verno === 1` с пятью контрактными таблицами;
2. индексы `entries` = `bean,date,mode,status`, `beans` = `form`, primKey `settings` = `key`;
3. запись заваривания ходит туда-обратно, включая тройки стадий и `pause`;
4. `getSetting/putSetting` типизированно читают и пишут;
5. `findSeedGrinder()` резолвит именно `timemore-s3` (Timemore / Chestnut S3);
6. `toOwnGrinder()` отказывается плющить `anchors`-калибровку;
7. первый запуск пишет `lang: ru`, `calib`, ровно одну свою молку с числами каталога;
8. сид не кладёт ничего в полку, журнал и девайсы;
9. повторный сид — no-op и не затирает изменённые пользователем `lang` и молки;
10. переоткрытие базы новым соединением: второй запуск не добавляет ничего
    (1 молка, 4 настройки).

## Хвосты проверок (verbatim)

`npm install` (корень):

```
up to date, audited 130 packages in 2s

19 packages are looking for funding
  run `npm fund` for details

5 vulnerabilities (3 moderate, 1 high, 1 critical)
```

(Уязвимости — в дереве до BJ-2, состав зависимостей journal их не добавляет;
`npm audit` не входит в приёмку.)

`npm run -w @coffee/journal typecheck`:

```
> @coffee/journal@0.1.0 typecheck
> tsc --noEmit
```

`npm run -w @coffee/journal test`:

```
 RUN  v2.1.8 /Users/User/Projects/Personal/coffee-grinder-extension/apps/journal

 ✓ tests/unit/nav.test.ts (9 tests) 9ms
 ✓ tests/unit/db.test.ts (10 tests) 63ms

 Test Files  2 passed (2)
      Tests  19 passed (19)
   Start at  01:18:11
   Duration  1.05s (transform 203ms, setup 128ms, collect 287ms, tests 72ms, environment 0ms, prepare 383ms)
```

`npm run -w @coffee/journal build`:

```
dist/assets/jetbrains-mono-latin-400-normal-6-qcROiO.woff       27.50 kB
dist/assets/jetbrains-mono-latin-700-normal-D3wTyLJW.woff       28.21 kB
dist/assets/jetbrains-mono-latin-500-normal-CJOVTJB7.woff       28.21 kB
dist/assets/jetbrains-mono-latin-300-normal-BYcAiAh2.woff       28.28 kB
dist/assets/index-BshoeDyQ.css                                   6.27 kB │ gzip:  1.69 kB
dist/assets/index-DwtxdYfG.js                                  335.60 kB │ gzip: 92.37 kB
✓ built in 1.26s
```

Корневой `npm run verify` — exit 0. Секция journal внутри него:

```
> @coffee/journal@0.1.0 test
> vitest run


 RUN  v2.1.8 /Users/User/Projects/Personal/coffee-grinder-extension/apps/journal

 ✓ tests/unit/nav.test.ts (9 tests) 7ms
 ✓ tests/unit/db.test.ts (10 tests) 61ms

 Test Files  2 passed (2)
      Tests  19 passed (19)
```

и хвост всей цепочки (e2e расширения):

```
  ✓  14 tests/e2e/converter.spec.ts:198:1 › hides recents while a query is active (802ms)
  ✓  15 tests/e2e/converter.spec.ts:206:1 › selects with the keyboard alone (674ms)
  ✓  16 tests/e2e/converter.spec.ts:215:1 › Escape closes the panel and returns focus to the button (754ms)
  ✓  17 tests/e2e/converter.spec.ts:225:1 › arrow keys expand a brand group (749ms)
  ✓  18 tests/e2e/converter.spec.ts:233:1 › shows at most three recents (940ms)

  18 passed (23.1s)
```

## Грep по dist на внешние URL

`grep -RE "https?://" apps/journal/dist` даёт совпадения — **ни одного шрифтового
или CDN-запроса среди них**. Все 27 уникальных URL разбиты по происхождению:

1. **Шрифты — чисто.** В `dist/assets/*.css` все восемь `@font-face` ссылаются
   относительно: `src:url(./jetbrains-mono-latin-300-normal-DuMDZskh.woff2)` и т.д.
   В `dist/index.html` — только `./assets/…`.
2. **XML-неймспейсы** (`http://www.w3.org/2000/svg`, `.../1999/xhtml`,
   `.../1999/xlink`, `.../1998/Math/MathML`, `.../XML/1998/namespace`) — из
   react-dom. Это идентификаторы неймспейсов, по ним ничего не качается.
3. **Строки сообщений об ошибках библиотек** — три штуки:
   `https://reactjs.org/docs/error-decoder.html?invariant=` (React),
   `https://tinyurl.com/y2uuvskb` (Dexie, «IndexedDB API missing»),
   `http://bit.ly/2kdckMn` (Dexie, «Transaction committed too early»).
   Текст в исключениях, не запросы.
4. **Остальные 19 — поле `sources` записей каталога `@coffee/core`**
   (honestcoffeeguide, 1zpresso.coffee, timemore.cn, theweldercatherine.ru и пр.).
   Это цитирование происхождения чисел, требование самого каталога («no uncited
   entries»). Они попали в бандл потому, что `seed.ts` импортирует `@coffee/core`,
   а тот тянет `DATASET` целиком — это же и есть причина 335 КБ бандла (92 КБ gzip).
   В BJ-3 датасет понадобится конвертеру по-настоящему, так что вес ожидаемый.

Ни одна из четырёх категорий не порождает сетевого запроса; приложение полностью
офлайновое.

## Отступления и уточнения

1. **id молки `timemore-s3` вместо `timemore-chestnut-s3`** — см. раздел «Сид».
   D-2 называет несуществующий id; фактический найден поиском, как предписано
   заданием.
2. **Пустое состояние журнала — «пока пусто — заварите первую чашку»** (строка из
   задания), а не прототипное `home_empty: 'Журнал пуст. Заварить первую чашку'`.
   Взял формулировку задания: она плоская и без восклицания, как требует тон
   README. Полный словарь строк RU/EN всё равно портируется в BJ-3 — там эта
   строка и получит окончательный ключ.
3. **Кнопка «←» — 48×48, в прототипе 44×40** (`DC:152`). Жёсткое правило задания
   «тач-таргеты ≥48px» победило пиксель прототипа. Отмечаю явно: при пиксельной
   сверке в BJ-7 это единственное известное расхождение геометрии шапки.
4. **Заглушки содержат кнопки переходов** (`StubLinks`), а не только лейбл.
   Без них AC-2 недостижим: `bean`, `beanAdd`, `device`, `timer`, `rateLater`,
   `wheel`, `detail`, `compare`, `spec` иначе не имеют ни одного входа, а
   критерий требует достижимости всех 17 и возврата по стеку. Компонент и его
   CSS вынесены отдельными файлами и удаляются одним движением в BJ-4.
5. **Заголовки экранов `bean`, `timer`, `detail`** взяты как «ПАЧКА», «ТАЙМЕР»,
   «ЗАПИСЬ»: в `STR.ru` прототипа для них нет ключа-заголовка (их шапки
   собираются из контента, которого у заглушек ещё нет). Остальные 14 — дословно
   из `STR.ru` (`conv_title`, `shelf_title`, `shelf_add`, `dev_title`, `dev_edit`,
   `brew_title`, `rate_later_t`, `diag_title`, `wheel_title`, `log_title`,
   `set_title`, `spec_title`, `nav_home`, `log_compare` → «СРАВНЕНИЕ»).
6. **Версия IndexedDB в браузере показывается как 10, а не 1.** Это конвенция
   Dexie (`version(N)` → IDB-версия `N*10`), не расхождение: `db.verno === 1`,
   что и проверяет тест.
7. **`assetsInlineLimit` оставлен дефолтным (4096)** — шрифты крупнее и остаются
   отдельными файлами. Инлайн их в data-URI раздул бы CSS за мегабайт и убил
   пофайловое кеширование.

## Что осталось за скоупом (по плану)

`src/domain/`, `src/data/` (порт `data.js`) — BJ-3; контент экранов — BJ-4/BJ-5;
`src/platform/` и Capacitor — BJ-6. Каталогов под них намеренно не создавал:
пустые директории в git всё равно не живут.
