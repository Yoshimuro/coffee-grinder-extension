/**
 * Сетап заваривания — единственный экран, где рецепт задаётся целиком.
 *
 * Состав полей и их зажимы — component-report §10.11 дословно; правила показа и
 * все строки живут в `brewing/brew-view.ts`, экран только раскладывает
 * результат. Состояние — `brewing/brew-store.ts`: его читает таймер, в него
 * пишут конвертер («ВЗЯТЬ В ЗАВАРИВАНИЕ») и деталь записи («ПОВТОРИТЬ»).
 *
 * Два выхода вниз равноправны по смыслу, но не по весу: «СТАРТ» уводит в таймер
 * (инверсная кнопка), «ЗАПИСАТЬ БЕЗ ТАЙМЕРА» пишет ту же запись из плановых
 * стадий (рамка). Обе списывают остаток пачки — одной транзакцией в репозитории.
 */

import { useEffect } from 'react';

import { useNav } from '../../app/nav.js';
import { isoDate } from '../../data/freshness.js';
import { STR } from '../../data/strings.js';
import { useBeans } from '../../db/repo/beans.js';
import { useDevices } from '../../db/repo/devices.js';
import { saveEntryWithDecrement } from '../../db/repo/entries.js';
import { useOwnGrinders } from '../../db/repo/grinders.js';
import { useLang, useSettings } from '../../db/repo/settings.js';
import type { BeanRecord, DeviceRecord } from '../../db/schema.js';
import { stagesFor } from '../../domain/stages.js';
import { logManual, useTimer } from '../../domain/timer.js';
import { Chip, EmptyState, InverseButton, ScreenHeader, Stepper, Tag } from '../components/index.js';
import { DevSvg } from './devices/DevSvg.js';
import { useBrewSetup } from './brewing/brew-store.js';
import {
  DOSE_RANGE,
  GRIND_RANGE,
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
  ratioLine,
  showDevice,
  showDose,
  showGrind,
  showPours,
  showValve,
  valveLabel,
} from './brewing/brew-view.js';
import './brewing/brewing.css';

export function Brew() {
  const go = useNav((s) => s.go);
  const lang = useLang();
  const t = STR[lang];

  const beans = useBeans();
  const devices = useDevices();
  const grinders = useOwnGrinders();
  const { convTo } = useSettings();

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

  /* Подсказка под помолом — ответ конвертера, если сетап пришёл оттуда, иначе
     полоса вокруг текущей настройки на своей же кофемолке. */
  const ownGrinder = grinders?.find((g) => g.id === convTo) ?? grinders?.[0];
  const hint = grindHint(grindSpan(ownGrinder, setup.grind, setup.span), lang);

  const start = () => {
    if (!bean) return;
    useTimer.getState().start(stagesFor(brewPlan(setup, bean, device)));
    go('timer');
  };

  const manual = async () => {
    if (!bean) return;
    const { entry } = logManual({ setup: brewSetup(setup, bean, device), bean, now: new Date() });
    // На полке лежит несписанная пачка — её и передаём: списывает транзакция.
    // Копия из `logManual` уже списана и вычла бы дозу второй раз.
    await saveEntryWithDecrement(entry, bean);
    go('rateLater');
  };

  return (
    <section className="screen" data-screen="brew">
      <ScreenHeader title={t.brew_title} right={ratioLine(setup.water, dose, lang)} />

      <div className="screen__body">
        {/* ── Кофе ─────────────────────────────────────────────────────── */}
        <div className="bj-brew__group">
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
          <div className="bj-brew__group">
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
        {showGrind(form) ? (
          <div className="bj-brew__group">
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
          disabled={!bean}
          onClick={() => void manual()}
        >
          <span className="bj-brew__manual-label">{t.brew_manual}</span>
          <span className="bj-brew__manual-hint">{t.brew_manual_hint}</span>
        </button>
      </div>
    </section>
  );
}
