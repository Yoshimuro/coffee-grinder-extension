/**
 * Конвертер помола (`component-report` §6.2, `DC:148-220`).
 *
 * Экран отвечает на один вопрос: «в рецепте написано 30 кликов на Comandante —
 * сколько это на моей молке». Поэтому «ОТКУДА» — весь каталог ядра (134 записи,
 * пикер с поиском), а «КУДА» — только свои: пересчитывать в чужую нечего.
 *
 * Ни одной формулы здесь нет. Числа приходят из `convView`, тот — из
 * `domain/convert`, тот — из `@coffee/core`. Прототип дублировал математику
 * прямо в компоненте (`DC:981`); этот дубль не переносится.
 */

import { useMemo, useState } from 'react';

import { useNav } from '../../app/nav.js';
import { STR } from '../../data/strings.js';
import { useEntries } from '../../db/repo/entries.js';
import { useOwnGrinders } from '../../db/repo/grinders.js';
import { pushRecent, putSetting, useLang, useSettings } from '../../db/repo/settings.js';
import { calibrationFrom, hasCalibration, resetCalibration, suggestCalibration } from '../../domain/calibration.js';
import { EmptyState } from '../components/EmptyState.js';
import { InverseButton } from '../components/InverseButton.js';
import { ScreenHeader } from '../components/ScreenHeader.js';
import { Stepper } from '../components/Stepper.js';
import { useBrewSetup } from './brewing/brew-store.js';
import { GrinderPicker } from './conv/GrinderPicker.js';
import { rowName } from './conv/picker.js';
import {
  calibLine,
  convView,
  converterInputs,
  cycleOwn,
  dbCountLine,
  defaultSetting,
  rawCenter,
  resolveFrom,
  suggestLine,
} from './conv/model.js';
import './conv/conv.css';

/** Шаг панели калибровки. Прототип: ±0.1, зажим нулём (`DC:1249`). */
const CAL_STEP = 0.1;

export function Conv() {
  const lang = useLang();
  const t = STR[lang];
  const go = useNav((s) => s.go);

  const settings = useSettings();
  const own = useOwnGrinders();
  const entries = useEntries();
  const fromConverter = useBrewSetup((s) => s.fromConverter);

  /* Обе кофемолки и настройка «ОТКУДА» — из сохранённых настроек (D-9): экран
     открывается там же, где его закрыли, а сетап заваривания читает то же самое
     и показывает под помолом ровно этот ответ. */
  const { from, setting, to } = converterInputs(own ?? [], settings);

  const [calOpen, setCalOpen] = useState(false);
  const [calVal, setCalVal] = useState(0);

  /** Лучшая оценённая заварка — из неё берётся подсказка калибровки. */
  const best = useMemo(() => suggestCalibration(entries ?? []), [entries]);

  const view = useMemo(
    () =>
      to === undefined
        ? undefined
        : convView({ from, setting, to, offset: settings.calib.offset, lang }),
    [from, setting, to, settings.calib.offset, lang],
  );

  /* Новая шкала — новая середина: 30 кликов Comandante на шкале 0–9 значили бы
     максимум, а не «примерно посередине», с которого начинают. */
  const pickFrom = (id: string) => {
    void putSetting('convFrom', id);
    void pushRecent(id);
    void putSetting('convVal', defaultSetting(resolveFrom(id).scale));
  };

  const cycleTo = () => {
    const next = cycleOwn(own ?? [], settings.convTo);
    if (next !== null) void putSetting('convTo', next);
  };

  /* Открытие подставляет «уже известную хорошую настройку»: помол лучшей заварки,
     а без журнала — текущий центр (`toggleCal`, `DC:1247`). Пустое поле здесь
     заставило бы вспоминать число, которое приложение и так знает. */
  const toggleCal = () => {
    if (view === undefined) return;
    if (calOpen) {
      setCalOpen(false);
      return;
    }
    setCalVal(best?.grind ?? view.span.center);
    setCalOpen(true);
  };

  const applyCal = () => {
    if (to === undefined) return;
    void putSetting('calib', calibrationFrom(calVal, rawCenter(from, setting, to), best));
    setCalOpen(false);
  };

  /* В сетап уезжает весь диапазон, а не только центр: помол встаёт в центр, а
     границы остаются подсказкой под полем (`grindHint`, `DC:1294`). */
  const useInBrew = () => {
    if (view === undefined) return;
    fromConverter(view.span);
    go('brew');
  };

  const cycleable = (own?.length ?? 0) > 1;

  return (
    <section className="screen" data-screen="conv">
      <ScreenHeader title={t.conv_title} right={dbCountLine(lang)} />

      <div className="screen__body">
        <div className="micro">{t.conv_from}</div>
        <GrinderPicker
          name={rowName(from)}
          selected={from.id}
          recents={settings.recents}
          onPick={pickFrom}
        />

        <Stepper
          size="lg"
          value={setting}
          onChange={(v) => void putSetting('convVal', v)}
          min={from.scale.min}
          max={from.scale.max}
          step={from.scale.step}
        />
        {view === undefined ? null : <div className="conv-tech">{view.tech}</div>}

        <div className="conv-split" />

        <div className="conv-label">
          <span className="micro">{t.conv_to}</span>
          <span className="conv-label__hint">{t.conv_to_hint}</span>
        </div>

        {/* Своих молок нет — экран не молчит, а зовёт добавить: пересчитывать
            не во что, и это единственное, что здесь можно сделать. */}
        {to === undefined ? (
          <EmptyState text={t.conv_to_empty} onClick={() => go('more')} />
        ) : cycleable ? (
          <button type="button" className="conv-to" onClick={cycleTo}>
            <span>{to.name}</span>
            <span className="conv-to__caret">›</span>
          </button>
        ) : (
          <div className="conv-to">
            <span>{to.name}</span>
          </div>
        )}

        {view === undefined ? null : (
          <>
            <div className="conv-result">
              <div className="conv-result__value">{view.centerBig}</div>
              <div className="conv-result__unit">{view.unit}</div>
            </div>

            <div className="conv-band" data-hint="conv-band">
              <div
                className="conv-band__fill"
                style={{ left: `${view.band.left}%`, width: `${view.band.width}%` }}
              />
              <div className="conv-band__tick" style={{ left: `${view.band.center}%` }} />
            </div>
            <div className="conv-scale">
              <span>0</span>
              <span>{view.band.win}</span>
            </div>

            <div className="conv-center">{view.center}</div>
            {view.warnings.map((w) => (
              <div key={w.key} className="conv-warn">
                {w.text}
              </div>
            ))}

            {hasCalibration(settings.calib) ? (
              <div className="conv-calib">
                <span className="conv-calib__line">
                  {calibLine(settings.calib.offset, settings.calib.src, lang)}
                </span>
                <button
                  type="button"
                  className="conv-calib__reset"
                  onClick={() => void putSetting('calib', resetCalibration())}
                >
                  {t.conv_cal_reset}
                </button>
              </div>
            ) : null}

            {calOpen ? (
              <div className="conv-cal">
                <div className="conv-cal__q">{t.conv_cal_q}</div>
                {best === undefined ? null : (
                  <div className="conv-cal__suggest">{suggestLine(best, lang)}</div>
                )}

                <div className="conv-cal__stepper">
                  <Stepper
                    value={calVal}
                    onChange={setCalVal}
                    min={0}
                    max={to?.scale.max ?? 0}
                    step={CAL_STEP}
                  />
                </div>

                <div className="conv-cal__hint">{t.conv_cal_hint}</div>

                <div className="conv-cal__actions">
                  <InverseButton size="sm" className="conv-cal__apply" onClick={applyCal}>
                    {t.conv_cal_apply}
                  </InverseButton>
                  <button
                    type="button"
                    className="conv-cal__close"
                    aria-label={t.a11y_remove}
                    onClick={toggleCal}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : null}

            <div className="conv-actions">
              <button
                type="button"
                className="btn conv-actions__calibrate"
                data-testid="conv-calibrate"
                aria-expanded={calOpen}
                onClick={toggleCal}
              >
                {t.conv_calibrate}
              </button>
              <InverseButton className="conv-actions__use" testId="conv-use" onClick={useInBrew}>
                {t.conv_use}
              </InverseButton>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
