/**
 * Диагностика — экран, на котором заваривание превращается в запись.
 *
 * Четыре шкалы, вход в колесо вкусов, заметка. Советов здесь нет: D-8 держит
 * `advice()` отключённым до явного ответа пользователя, и README описывает этот
 * экран без блока подсказок.
 *
 * Сессию оценки заводит тот, кто сюда привёл (`useRate.startRating` с главного
 * экрана, `startTasting` — «ОЦЕНИТЬ ЧАШКУ»). Если не завёл — экран разбирается
 * сам: есть ждущая оценки запись, значит оценивают её; нет — значит это
 * дегустация со стороны. Так экран нельзя открыть «ни про что».
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';

import { useNav } from '../../app/nav.js';
import { STR } from '../../data/strings.js';
import { colOf, nameOf } from '../../data/wheel.js';
import { useBean } from '../../db/repo/beans.js';
import { findPendingEntry, useEntry } from '../../db/repo/entries.js';
import { useDevice } from '../../db/repo/devices.js';
import { useLang } from '../../db/repo/settings.js';
import { speech } from '../../platform/speech.js';
import { InverseButton } from '../components/InverseButton.js';
import { ScreenHeader } from '../components/ScreenHeader.js';
import { Tag } from '../components/Tag.js';
import { entryTitle } from '../entry-format.js';
import { MiniWheel } from './journal/MiniWheel.js';
import { SCALES, SCALE_CELLS, cellFilled } from './journal/diag-scales.js';
import { rateContext } from './journal/format.js';
import { saveRating, suggestFromText, useRate } from './journal/rate-store.js';
import './journal/journal.css';

export function Diag() {
  const lang = useLang();
  const t = STR[lang];
  const setTab = useNav((s) => s.setTab);
  const go = useNav((s) => s.go);

  const target = useRate((s) => s.target);
  const diag = useRate((s) => s.diag);
  const note = useRate((s) => s.note);
  const picked = useRate((s) => s.picked);
  const sug = useRate((s) => s.sug);
  const tasteName = useRate((s) => s.tasteName);
  const setScaleValue = useRate((s) => s.setScaleValue);
  const setNote = useRate((s) => s.setNote);
  const setTasteName = useRate((s) => s.setTasteName);
  const setPickIntensity = useRate((s) => s.setPickIntensity);
  const removePick = useRate((s) => s.removePick);
  const suggest = useRate((s) => s.suggest);
  const acceptSuggestion = useRate((s) => s.acceptSuggestion);
  const startRating = useRate((s) => s.startRating);
  const startTasting = useRate((s) => s.startTasting);

  /* `null` — ждущих оценки записей нет, `undefined` — база ещё не ответила.
     Различать обязательно: иначе экран заведёт дегустацию раньше, чем узнает
     про заваривание, которое человек и пришёл оценивать. */
  const pending = useLiveQuery(async () => (await findPendingEntry()) ?? null, []);

  /* Сохранение обнуляет сессию — и подхват ниже немедленно завёл бы новую,
     пустую, за миг до ухода с экрана. Флаг закрывает это окно. */
  const closing = useRef(false);

  useEffect(() => {
    /* Подхватывать только пустую сессию: возврат из колеса вкусов — это тоже
       монтирование, и набранное на нём терять нельзя. */
    if (closing.current || target !== null || pending === undefined) return;
    if (pending === null) startTasting();
    else startRating(pending.id);
  }, [target, pending, startRating, startTasting]);

  const entry = useEntry(target?.kind === 'entry' ? target.id : null);
  const bean = useBean(entry?.bean);
  const device = useDevice(entry?.device);

  const tasting = target?.kind === 'taste';

  /* Кнопка «ГОЛОСОМ» появляется, только если распознавание вообще есть. В вебе
     его нет — и тогда на экране просто клавиатура, без баннеров и без кнопки,
     которая ничего не делает (component-report §10.2). */
  const [micReady, setMicReady] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    let live = true;
    void speech.available().then((ok) => {
      if (live) setMicReady(ok);
    });
    return () => {
      live = false;
    };
  }, []);

  async function listen(): Promise<void> {
    if (listening) return;
    setListening(true);
    try {
      const heard = await speech.listen();
      if (heard) {
        setNote(note ? `${note} ${heard}` : heard);
        /* Распознанное только предлагается тегами — проставлять за человека
           то, что он не выбирал, README:53 запрещает. */
        suggest(suggestFromText(heard, lang, picked));
      }
    } finally {
      setListening(false);
    }
  }

  async function save(): Promise<void> {
    closing.current = true;
    await saveRating();
    setTab('home');
  }

  const context = tasting
    ? t.diag_taste
    : entry
      ? rateContext(entryTitle(entry, lang, { bean, device }), entry.grind)
      : '';

  return (
    <div className="jr" data-screen="diag">
      <ScreenHeader title={t.diag_title} right={context} />

      <div className="jr__body">
        <div className="jr-diag__sub">{tasting ? t.diag_taste_sub : t.diag_sub}</div>

        {tasting ? (
          <div className="jr-field">
            <div className="jr-field__label">{`${t.taste_name} · ${t.bean_optional}`}</div>
            <input
              className="jr-input"
              value={tasteName}
              placeholder={t.taste_name_ph}
              onChange={(e) => setTasteName(e.target.value)}
            />
          </div>
        ) : null}

        {SCALES.map((scale) => (
          <div className="jr-scale" key={scale.key}>
            <div className="jr-scale__head">
              <div className="jr-scale__label">{t[scale.label]}</div>
              <div className="jr-scale__value">{diag[scale.key]}</div>
            </div>
            <div className="jr-scale__cells">
              {Array.from({ length: SCALE_CELLS }, (_, i) => (
                <button
                  type="button"
                  key={i}
                  className={cellFilled(diag[scale.key], i) ? 'jr-cell jr-cell--on' : 'jr-cell'}
                  data-testid={`diag-${scale.key}-${String(i)}`}
                  aria-label={`${t[scale.label]} ${i}`}
                  aria-pressed={diag[scale.key] === i}
                  onClick={() => setScaleValue(scale.key, i)}
                />
              ))}
            </div>
          </div>
        ))}

        <button
          type="button"
          className="jr-wheel-cta"
          data-testid="diag-to-wheel"
          onClick={() => go('wheel')}
        >
          <MiniWheel />
          <span className="jr-wheel-cta__main">
            <span className="jr-wheel-cta__title">{t.log_desc}</span>
            <span className="jr-wheel-cta__sub">{t.diag_wheel_sub}</span>
          </span>
          <span className="jr-wheel-cta__go">→</span>
        </button>

        <div className="jr__group">
          <div className="jr-field__label">{t.note_label}</div>
          <div className="jr-note">
            <textarea
              className="jr-textarea"
              data-testid="diag-note"
              value={note}
              placeholder={t.note_ph}
              onChange={(e) => setNote(e.target.value)}
            />
            {micReady ? (
              <button
                type="button"
                className={listening ? 'jr-mic jr-mic--live' : 'jr-mic'}
                onClick={() => void listen()}
              >
                <span className="jr-mic__dot" />
                <span className="jr-mic__label">{t.note_mic}</span>
              </button>
            ) : null}
          </div>

          {sug.length > 0 ? (
            <>
              <div className="jr__hint">{t.note_mic_hint}</div>
              <div className="jr-sug">
                {sug.map((id) => (
                  <button
                    type="button"
                    key={id}
                    className="jr-sug__chip"
                    onClick={() => acceptSuggestion(id)}
                  >
                    {`+ ${nameOf(id, lang)}`}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>

        {picked.length > 0 ? (
          <div className="jr__group">
            <div className="jr__label">{`${t.wheel_picked} ${picked.length}`}</div>
            <div className="jr-picked">
              {picked.map(([id, intensity]) => (
                <Tag
                  key={id}
                  label={nameOf(id, lang)}
                  caps={false}
                  intensity={intensity}
                  borderColor={colOf(id, 0.8)}
                  dotColor={colOf(id)}
                  onCycle={(next) => setPickIntensity(id, next)}
                  onRemove={() => removePick(id)}
                />
              ))}
            </div>
          </div>
        ) : null}

        <InverseButton className="jr-save" size="lg" testId="diag-save" onClick={() => void save()}>
          {t.diag_save}
        </InverseButton>
      </div>
    </div>
  );
}
