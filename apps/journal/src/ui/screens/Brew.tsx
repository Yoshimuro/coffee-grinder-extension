/**
 * Сетап заваривания — единственный экран, где рецепт задаётся целиком.
 *
 * Состав полей и их зажимы — component-report §10.11 дословно; правила показа и
 * все строки живут в `brewing/brew-view.ts`, экран только раскладывает
 * результат. Состояние — `brewing/brew-store.ts`: его читает таймер, в него
 * пишут конвертер («ВЗЯТЬ В ЗАВАРИВАНИЕ») и деталь записи («ПОВТОРИТЬ»).
 *
 * Два выхода вниз равноправны по смыслу, но не по весу: «СТАРТ» уводит в таймер
 * (инверсная кнопка), «ЗАПИСАТЬ БЕЗ ТАЙМЕРА» открывает панель, где заваривание
 * вписывается как есть (рамка). Обе списывают остаток пачки — одной транзакцией
 * в репозитории.
 */

import { useEffect, useState } from 'react';

import { useNav } from '../../app/nav.js';
import { isoDate } from '../../data/freshness.js';
import { STR } from '../../data/strings.js';
import { useBeans } from '../../db/repo/beans.js';
import { useDevices } from '../../db/repo/devices.js';
import { saveEntryWithDecrement } from '../../db/repo/entries.js';
import { useOwnGrinders } from '../../db/repo/grinders.js';
import { useLang, useSettings } from '../../db/repo/settings.js';
import type { BeanRecord, DeviceRecord, Stage } from '../../db/schema.js';
import { plannedTotal } from '../../domain/stages.js';
import { logManual, useTimer } from '../../domain/timer.js';
import { Chip, EmptyState, InverseButton, ScreenHeader, Stepper, Tag } from '../components/index.js';
import { DevSvg } from './devices/DevSvg.js';
import { useBrewSetup } from './brewing/brew-store.js';
import {
  DOSE_RANGE,
  GRIND_RANGE,
  MANUAL_TIME_RANGE,
  POURS_RANGE,
  TEMP_RANGE,
  VALVE_RANGE,
  WATER_RANGE,
  beanTech,
  brewPlan,
  brewSetup,
  effectiveDose,
  formLabel,
  grindHint,
  grindSpan,
  isHybrid,
  manualTimeLabel,
  plannedLine,
  ratioLine,
  recipeStages,
  showDevice,
  showDose,
  showGrind,
  showPours,
  showValve,
  valveLabel,
} from './brewing/brew-view.js';
import {
  RECIPE_DUR_STEP,
  RECIPE_WATER_STEP,
  addPour,
  bumpStageDuration,
  bumpStageWater,
  recipeRows,
  recipeTotalLine,
  recipeWaterNote,
  removeStage,
} from './brewing/recipe.js';
import './brewing/brewing.css';

export function Brew() {
  const go = useNav((s) => s.go);
  const lang = useLang();
  const t = STR[lang];

  const beans = useBeans();
  const devices = useDevices();
  const grinders = useOwnGrinders();
  const settings = useSettings();

  const setup = useBrewSetup();
  const { setBean, setDevice, setHyMode, setField } = setup;

  /* Полка может быть пустой, может пополниться, а выбранную пачку могли стереть
     на соседнем экране. Во всех трёх случаях сетап встаёт на первую пачку — так
     он никогда не показывает поля несуществующего кофе. */
  useEffect(() => {
    if (!beans) return;
    if (setup.bean !== null && beans.some((b) => b.id === setup.bean)) return;
    const first = beans[0]?.id ?? null;
    if (first !== setup.bean) setBean(first);
  }, [beans, setup.bean, setBean]);

  const bean: BeanRecord | null = beans?.find((b) => b.id === setup.bean) ?? null;
  const device: DeviceRecord | null = devices?.find((d) => d.id === setup.device) ?? null;
  const form = bean?.form ?? 'beans';

  const dose = effectiveDose(bean, setup.dose);
  const today = isoDate(new Date());

  /* Подсказка под помолом — ответ конвертера: присланный кнопкой «ВЗЯТЬ В
     ЗАВАРИВАНИЕ» или посчитанный из его же сохранённого состояния (D-9). */
  const hint = grindHint(grindSpan(grinders ?? [], settings, setup.span), lang);

  /* План заваривания: правленый рецепт, если он есть, иначе авто-пересчёт.
     Из него живут и таймер, и запись, и весь блок РЕЦЕПТ ниже. */
  const stages: Stage[] = bean ? recipeStages(setup, bean, device) : [];

  /* Любая правка стадии материализует копию плана: с этого момента параметры
     сетапа на стадии не влияют (README:37). */
  const editRecipe = (next: Stage[]): void => {
    setup.setRecipe(next);
  };

  const start = () => {
    if (!bean) return;
    useTimer.getState().start(stages);
    go('timer');
  };

  /*
   * «ЗАПИСАТЬ БЕЗ ТАЙМЕРА» больше не пишет запись по тапу.
   *
   * Раньше тап сразу сохранял заваривание, подставляя ему плановые стадии и их
   * сумму, — то есть числа, которых никто не засекал, — и уводил на оценку.
   * Человек нажимал «вписать как есть» и обнаруживал, что вписывать уже нечего:
   * приложение всё придумало за него. Теперь тап открывает панель, где он
   * называет единственный известный ему факт — сколько это шло, — и только
   * «СОХРАНИТЬ» пишет запись.
   */
  const [manualOpen, setManualOpen] = useState(false);
  const [manualTotal, setManualTotal] = useState(0);

  const planned = plannedTotal(stages);

  const saveManual = async () => {
    if (!bean) return;
    const { entry } = logManual({
      setup: brewSetup(setup, bean, device),
      bean,
      // Стадии уходят в запись только когда их набрал человек: авто-план
      // никто не засекал (BJ-8), а правленый рецепт — факт его решения.
      ...(setup.recipeTouched ? { stages } : {}),
      total: manualTotal,
      now: new Date(),
    });
    // На полке лежит несписанная пачка — её и передаём: списывает транзакция.
    // Копия из `logManual` уже списана и вычла бы дозу второй раз.
    await saveEntryWithDecrement(entry, bean);
    setManualOpen(false);
    setManualTotal(0);
    go('rateLater');
  };

  return (
    <section className="screen" data-screen="brew">
      <ScreenHeader title={t.brew_title} right={ratioLine(setup.water, dose, lang)} />

      <div className="screen__body">
        {/* ── Кофе ─────────────────────────────────────────────────────── */}
        <div className="bj-brew__group" data-hint="brew-beans">
          <div className="micro">{t.brew_bean}</div>
          <div className="bj-brew__list">
            {(beans ?? []).map((b) => (
              <button
                key={b.id}
                type="button"
                className={b.id === setup.bean ? 'bj-brew__pick bj-brew__pick--on' : 'bj-brew__pick'}
                data-testid="brew-bean"
                onClick={() => setBean(b.id)}
              >
                <span className="bj-brew__pick-main">
                  <span className="bj-brew__pick-name">{b.name || t.entry_none}</span>
                  <span className="bj-brew__pick-tech">{beanTech(b, lang, today)}</span>
                </span>
                <Tag label={formLabel(b.form, lang)} />
              </button>
            ))}
            <EmptyState text={t.brew_add_bean} onClick={() => go('beanAdd')} />
          </div>
          {form === 'drip' ? <div className="bj-brew__note">{t.brew_drip_note}</div> : null}
        </div>

        {/* ── Тип заваривания ──────────────────────────────────────────── */}
        {showDevice(form) ? (
          <div className="bj-brew__group" data-hint="brew-devices">
            <div className="micro">{t.brew_device}</div>
            <div className="bj-brew__list">
              {(devices ?? []).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={
                    d.id === setup.device
                      ? 'bj-brew__pick bj-brew__pick--dev bj-brew__pick--on'
                      : 'bj-brew__pick bj-brew__pick--dev'
                  }
                  onClick={() => setDevice(d.id)}
                >
                  <span className="bj-brew__glyph">
                    <DevSvg device={d} />
                  </span>
                  <span className="bj-brew__pick-name">{d.name}</span>
                </button>
              ))}
              <EmptyState text={t.brew_add_device} onClick={() => go('device')} />
            </div>
            {/* D-3 задачи: расчёт переживает невыбранный девайс, но молчать о
                подставленной перколяции экран не должен. */}
            {device === null ? <div className="bj-brew__note">{t.brew_no_device}</div> : null}
          </div>
        ) : null}

        {/* ── Клапан гибрида ───────────────────────────────────────────── */}
        {isHybrid(form, device) ? (
          <div className="bj-brew__group">
            <div className="micro">{t.brew_valve}</div>
            <div className="bj-brew__row">
              <Chip
                label={t.brew_hy_imm}
                grow
                active={setup.hyMode === 'imm'}
                onClick={() => setHyMode('imm')}
              />
              <Chip
                label={t.brew_hy_perc}
                grow
                active={setup.hyMode === 'perc'}
                onClick={() => setHyMode('perc')}
              />
              <Chip
                label={t.brew_hy_mid}
                grow
                active={setup.hyMode === 'mid'}
                onClick={() => setHyMode('mid')}
              />
            </div>
            <div className="bj-brew__hint">{t.brew_valve_hint}</div>
            {showValve(form, device, setup.hyMode) ? (
              <Stepper
                {...VALVE_RANGE}
                value={setup.valveAt}
                unit={t.unit_sec}
                format={(v) => valveLabel(v, lang)}
                onChange={(v) => setField('valveAt', v)}
              />
            ) : null}
          </div>
        ) : null}

        {/* ── Помол ────────────────────────────────────────────────────── */}
        {/* Якорь подсказки ставится только когда диапазон реально пришёл с
            конвертера: без него объяснять нечего, и шаг ждёт своего случая. */}
        {showGrind(form) ? (
          <div className="bj-brew__group" {...(hint === undefined ? {} : { 'data-hint': 'brew-grind-hint' })}>
            <Stepper
              {...GRIND_RANGE}
              label={t.brew_grind}
              size="lg"
              input
              value={setup.grind}
              onChange={(v) => setField('grind', v)}
              {...(hint === undefined ? {} : { hint })}
            />
          </div>
        ) : null}

        {/* ── Числа ────────────────────────────────────────────────────── */}
        <div className="bj-brew__grid">
          {showDose(form) ? (
            <Stepper
              {...DOSE_RANGE}
              label={t.brew_dose}
              value={setup.dose}
              unit={t.grams}
              onChange={(v) => setField('dose', v)}
            />
          ) : null}

          <Stepper
            {...WATER_RANGE}
            label={t.brew_water}
            value={setup.water}
            unit={t.grams}
            onChange={(v) => setField('water', v)}
          />

          <Stepper
            {...TEMP_RANGE}
            label={t.brew_temp}
            value={setup.temp}
            unit={`${t.deg}C`}
            onChange={(v) => setField('temp', v)}
          />

          {showPours(form, device, setup.hyMode) ? (
            <Stepper
              {...POURS_RANGE}
              label={t.brew_pours}
              value={setup.pours}
              onChange={(v) => setField('pours', v)}
            />
          ) : null}
        </div>

        {/* ── Рецепт ───────────────────────────────────────────────────── */}
        {/* Подсказка, а не план: таймер по нему не подгоняет, а показывает
            рядом. Пока рецепт не тронут, он пересчитывается сам. */}
        {bean ? (
          <div className="bj-rec" data-testid="brew-recipe">
            <div className="bj-rec__head">
              <div className="micro">{t.rec_title}</div>
              {setup.recipeTouched ? (
                <button
                  type="button"
                  className="bj-rec__auto"
                  data-testid="recipe-auto"
                  onClick={setup.resetRecipe}
                >
                  {t.rec_auto}
                </button>
              ) : null}
            </div>

            <div className="bj-rec__rows">
              {recipeRows(stages, lang).map((row) => (
                <div className="bj-rec__row" key={row.index} data-testid="recipe-row">
                  <div className="bj-rec__name">{row.name}</div>

                  <div className="bj-rec__pair">
                    <button
                      type="button"
                      className="bj-rec__btn"
                      aria-label={`${row.name} − ${String(RECIPE_DUR_STEP)}`}
                      onClick={() => {
                        editRecipe(bumpStageDuration(stages, row.index, -RECIPE_DUR_STEP));
                      }}
                    >
                      −
                    </button>
                    <div className="bj-rec__val bj-rec__val--dur">{row.dur}</div>
                    <button
                      type="button"
                      className="bj-rec__btn"
                      data-testid={`recipe-dur-inc-${String(row.index)}`}
                      aria-label={`${row.name} + ${String(RECIPE_DUR_STEP)}`}
                      onClick={() => {
                        editRecipe(bumpStageDuration(stages, row.index, RECIPE_DUR_STEP));
                      }}
                    >
                      +
                    </button>
                  </div>

                  {row.water === null ? (
                    <div className="bj-rec__none">—</div>
                  ) : (
                    <div className="bj-rec__pair">
                      <button
                        type="button"
                        className="bj-rec__btn"
                        aria-label={`${row.name} − ${String(RECIPE_WATER_STEP)} ${t.grams}`}
                        onClick={() => {
                          editRecipe(bumpStageWater(stages, row.index, -RECIPE_WATER_STEP));
                        }}
                      >
                        −
                      </button>
                      <div className="bj-rec__val bj-rec__val--water">{row.water}</div>
                      <button
                        type="button"
                        className="bj-rec__btn"
                        data-testid={`recipe-water-inc-${String(row.index)}`}
                        aria-label={`${row.name} + ${String(RECIPE_WATER_STEP)} ${t.grams}`}
                        onClick={() => {
                          editRecipe(bumpStageWater(stages, row.index, RECIPE_WATER_STEP));
                        }}
                      >
                        +
                      </button>
                    </div>
                  )}

                  {/* Последнюю видимую строку удалить нельзя: рецепт без
                      единственной стадии перестал бы быть рецептом. */}
                  <button
                    type="button"
                    className="bj-rec__del"
                    data-testid={`recipe-del-${String(row.index)}`}
                    aria-label={`${t.a11y_remove}: ${row.name}`}
                    disabled={!row.canRemove}
                    onClick={() => {
                      editRecipe(removeStage(stages, row.index));
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="bj-rec__add"
              data-testid="recipe-add"
              onClick={() => {
                editRecipe(addPour(stages));
              }}
            >
              {`+ ${t.t_pour}`}
            </button>

            <div className="bj-rec__foot">
              <span>{recipeTotalLine(stages, lang)}</span>
              {/* Расхождение с полем ВОДА — заметка, а не ошибка. */}
              {recipeWaterNote(stages, setup.water, lang) === null ? null : (
                <span data-testid="recipe-water-note">
                  {recipeWaterNote(stages, setup.water, lang)}
                </span>
              )}
            </div>
          </div>
        ) : null}

        {/* ── Выходы ───────────────────────────────────────────────────── */}
        <InverseButton
          size="xl"
          className="bj-brew__start"
          testId="brew-start"
          disabled={!bean}
          onClick={start}
        >
          {t.brew_start}
        </InverseButton>

        <button
          type="button"
          className="bj-brew__manual"
          data-testid="brew-manual"
          disabled={!bean}
          aria-expanded={manualOpen}
          onClick={() => setManualOpen(!manualOpen)}
        >
          <span className="bj-brew__manual-label">{t.brew_manual}</span>
          <span className="bj-brew__manual-hint">{t.brew_manual_hint}</span>
        </button>

        {manualOpen ? (
          <div className="bj-brew__log" data-testid="brew-manual-panel">
            <div className="bj-brew__log-q">{t.brew_manual_q}</div>

            <Stepper
              {...MANUAL_TIME_RANGE}
              label={t.log_time}
              value={manualTotal}
              format={(v) => manualTimeLabel(v, lang)}
              onChange={setManualTotal}
            />

            {/* Плановое время — предложение, а не подстановка: тап по нему
                виден, автоматическая запись того же числа — нет. */}
            <button
              type="button"
              className="bj-brew__log-plan"
              data-testid="brew-manual-plan"
              onClick={() => setManualTotal(planned)}
            >
              {plannedLine(planned, lang)}
            </button>

            <div className="bj-brew__log-note">{t.brew_manual_stages}</div>

            <div className="bj-brew__log-actions">
              <InverseButton
                size="sm"
                className="bj-brew__log-save"
                testId="brew-manual-save"
                onClick={() => void saveManual()}
              >
                {t.bean_save}
              </InverseButton>
              <button
                type="button"
                className="bj-brew__log-close"
                aria-label={t.back}
                onClick={() => setManualOpen(false)}
              >
                ✕
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
