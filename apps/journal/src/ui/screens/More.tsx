/**
 * Настройки — то немногое, что вообще настраивается.
 *
 * Список короткий сознательно: свои кофемолки (без них не работает конвертер),
 * свои девайсы, язык и спецификация. Ни аккаунтов, ни синхронизации, ни тем —
 * подвал говорит об этом прямо: «локально · офлайн · без аккаунта».
 *
 * Экспорта и импорта здесь нет (D-7): настоящий файловый обмен появится с
 * установкой на телефон (BJ-6), а строка, которая только притворяется, что
 * что-то делает, хуже её отсутствия. Прототип именно так и делал — `exportTap`
 * лишь поднимал флаг (`DC:1347`), а у ИМПОРТА не было обработчика вовсе.
 */

import { useState } from 'react';

import { useNav } from '../../app/nav.js';
import { STR } from '../../data/strings.js';
import { useDevices } from '../../db/repo/devices.js';
import { deleteGrinder, newGrinderId, putGrinder, useOwnGrinders } from '../../db/repo/grinders.js';
import { putSetting, useLang } from '../../db/repo/settings.js';
import type { Lang } from '../../db/schema.js';
import { Chip, EmptyState, InverseButton, Row, Section, Stepper } from '../components/index.js';
import {
  DEFAULT_STEP,
  STEP_RANGE,
  canDelete,
  grinderMeta,
  makeGrinder,
} from './settings/settings-view.js';
import './settings/settings.css';

const LANGS: readonly Lang[] = ['ru', 'en'];

export function More() {
  const go = useNav((s) => s.go);
  const lang = useLang();
  const t = STR[lang];

  const grinders = useOwnGrinders();
  const devices = useDevices();

  /* Форма добавления и подтверждение удаления — состояние экрана, а не стора:
     оба живут ровно пока человек на нём стоит, и уходят вместе с ним. */
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [step, setStep] = useState(DEFAULT_STEP);
  const [confirming, setConfirming] = useState<string | null>(null);

  const list = grinders ?? [];

  const saveGrinder = async () => {
    await putGrinder(makeGrinder(newGrinderId(), name.trim() || t.set_grinders, step));
    setAdding(false);
    setName('');
    setStep(DEFAULT_STEP);
  };

  const remove = async (id: string) => {
    setConfirming(null);
    // Репозиторий сам переносит `convFrom`/`convTo` на выжившую молку и чистит
    // недавние — экран об этих связях не знает и знать не должен.
    await deleteGrinder(id);
  };

  return (
    <section className="screen" data-screen="more">
      <header className="bj-head bj-head--root">
        <h1 className="bj-head__title">{t.set_title}</h1>
      </header>

      <div className="screen__body">
        <Section label={t.set_grinders}>
          {list.map((grinder) => (
            <div key={grinder.id} className="bj-set__grinder" data-testid="grinder-row">
              <div className="bj-set__grinder-name">{grinder.name}</div>

              {confirming === grinder.id ? (
                <>
                  <span className="bj-set__ask">{t.set_del_q}</span>
                  <button
                    type="button"
                    className="bj-set__yes"
                    data-testid="grinder-delete-yes"
                    onClick={() => void remove(grinder.id)}
                  >
                    {t.set_del_yes}
                  </button>
                  <button
                    type="button"
                    className="bj-set__no"
                    aria-label={t.back}
                    onClick={() => setConfirming(null)}
                  >
                    ✕
                  </button>
                </>
              ) : (
                <>
                  <span className="bj-set__meta">{grinderMeta(grinder, lang)}</span>
                  {canDelete(list.length) ? (
                    <button
                      type="button"
                      className="bj-set__del"
                      data-testid="grinder-delete"
                      aria-label={t.a11y_remove}
                      onClick={() => setConfirming(grinder.id)}
                    >
                      ×
                    </button>
                  ) : null}
                </>
              )}
            </div>
          ))}

          <EmptyState text={t.set_g_add} onClick={() => setAdding(!adding)} />

          {adding ? (
            <div className="bj-set__form" data-testid="grinder-form">
              <div className="micro">{t.bean_name}</div>
              <input
                className="bj-set__input"
                type="text"
                data-testid="grinder-name"
                placeholder="Comandante C40"
                aria-label={t.bean_name}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="bj-set__form-step">
                <Stepper
                  {...STEP_RANGE}
                  label={t.set_g_step}
                  value={step}
                  unit={t.um}
                  onChange={setStep}
                />
              </div>
              <InverseButton
                size="sm"
                className="bj-set__form-save"
                testId="grinder-save"
                onClick={() => void saveGrinder()}
              >
                {t.bean_save}
              </InverseButton>
            </div>
          ) : null}
        </Section>

        <Row
          label={t.set_devices}
          right={`${devices?.length ?? 0} →`}
          testId="set-devices"
          onClick={() => go('devices')}
        />

        <Row
          label={t.set_lang}
          right={
            <span className="bj-set__lang">
              {LANGS.map((code) => (
                <Chip
                  key={code}
                  label={code.toUpperCase()}
                  active={lang === code}
                  onClick={() => void putSetting('lang', code)}
                />
              ))}
            </span>
          }
        />

        <Row label={t.set_spec} right="→" onClick={() => go('spec')} />

        <div className="bj-set__footer">
          {t.set_offline} · {t.set_ver}
        </div>
      </div>
    </section>
  );
}
