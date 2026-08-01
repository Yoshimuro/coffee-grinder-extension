# Требования — BJ-3: порт ядра домена

## Контекст
После BJ-2. Спека §5 (структура `data/`, `domain/`), §7-8. Research-база (обязательна к прочтению дев-агентом): `docs/tasks/_research/data-js-report.md` (весь), `component-report.md` §3-6, §10.6, §11. Первоисточники: `design_handoff_brew_journal 3/data.js`, класс `Component` в `Brew Journal.dc.html`.

## В скоупе
`apps/journal/src/data/` — порт data.js:
- `wheel.ts`: WHEEL (9 категорий / 27 подкатегорий / 102 дескриптора — id, ru, en как readonly tuple), DESC строится чистой функцией + Object.freeze, `catColor`/`hueOf`/`colOf` (oklch; светлота уровней — формулы component-report §8.1).
- `traits.ts`: TRAITS (6 групп), KNOWN_DEVICES (3).
- `strings.ts`: STR ru/en (145/145, типизированный union ключей), `stageName`, `modeName` (mode-enum отдельно от TRAITS.flow!).
- `freshness.ts`: `ageDays(roast, today)` — today параметром, не константой; `phaseOf` (<4 degas, ≤21 peak, >21 fade).
- `seeds.ts`: демо-сиды за dev-флагом (в прод не попадают).
- `advice.ts`: порт advice() (использование решается Q-1 спеки §9 — портируем, не подключаем).

`apps/journal/src/domain/`:
- `stages.ts`: stagesFor — 5 веток дословно из component-report §3 (drip/perc/imm/hy-imm/hy-mid), НО в drip-ветке компенсация округления воды последним проливом как в perc (D-2).
- `timer.ts`: движок таймера как чистый редьюсер + zustand-стор: старт/advance/pause семантика component-report §4 (пауза закрывает стадию фактической длительностью, «стекание» → отдельная стадия `pause`, маркеры нулевой длительности проглатываются с записью в rec, пауза недоступна на последней стадии), `makeEntry` (фактический elapsed = total, списание остатка пачки), `logManual` из плановых стадий.
- `calibration.ts`: offset в шагах своей молки; `applyCalib` к center/lo/hi ПОСЛЕ инверсии; вычисление offset из «хорошей настройки» минус сырой центр; подсказка = лучшая done-запись по `diag.balance`; сброс.
- `convert.ts`: обёртка над `@coffee/core` convert + applyCalib (движок ядра, D-1 спеки; НЕ дублировать формулы).
- `format.ts`: `fmtT` с исправленным багом границы (`fmtT(119.6) === "2:00"`, D-3).
- `geometry.ts`: `arcPath(cx, cy, r0, r1, a0, a1)` — кольцевой сектор (component-report §8.2, дословно) + тест. Нужен и мини-колесу (BJ-4, диагностика), и полному колесу (BJ-5).

## Вне скоупа
UI-экраны (BJ-4/5), devSvg и wheelSvg-рендер (геометрия — в BJ-4/BJ-5 при вёрстке; здесь только данные/цвета).

## Критерии приёмки
- AC-1: vitest зелёный; покрыты: все 5 веток stagesFor (суммы воды, ключи, длительности; drip-компенсация), пауза+маркеры+завершение таймера, calibration round-trip, fmtT границы, convert-обёртка (center/lo/hi сдвигаются, um — нет).
- AC-2: тест-инварианты реестров: 9/27/102, дубликатов id нет, 145/145 ключей STR идентичны по множеству, DESC заморожен.
- AC-3: ключи стадий ровно `bloom|pour|drain|steep|stir|press|valve|pause`; Mode-тип = `perc|imm|hybrid|drip|cup` отдельно от TraitFlow.
- AC-4: ни одного дублирования формул конвертации (grep: `zeroOffset|micronsPerStep` в journal — только импорт из @coffee/core).
- AC-5: typecheck strict; корневой verify не сломан.
