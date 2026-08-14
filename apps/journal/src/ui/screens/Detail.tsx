/**
 * Деталь записи — рецепт целиком: параметры, стадии, оценка, дескрипторы,
 * заметка.
 *
 * Сетка параметров собирается из того, что у записи есть: у молотого нет
 * помола, у не-гибрида нет клапана — пустых ячеек с прочерками экран не
 * рисует, иначе половина сетки была бы про отсутствие.
 *
 * Диагностика, дескрипторы и заметка появляются только у оценённой записи.
 * Схема v1 держит `diag` всегда, и у ждущей оценки он нулевой; показывать
 * «К 0 · Г 0 · Т 0 · С 0» — врать про вкус, которого никто не называл.
 *
 * QR внизу — настоящий, с BJ-6. Прототип рисовал на его месте шум (`qrSvg`,
 * `DC:1131`), BJ-4 убрал и шум, и пустую площадку под него (D-12): картинка,
 * которая выглядит как QR и не сканируется, хуже, чем её отсутствие. Теперь за
 * блоком стоит офлайн-кодировщик и контракт №3, и блок вернулся.
 */

import { useEffect, useRef, useState } from 'react';

import { useNav } from '../../app/nav.js';
import { STR, modeName, stageName } from '../../data/strings.js';
import { colOf, nameOf } from '../../data/wheel.js';
import { useBean } from '../../db/repo/beans.js';
import { updateEntry, useEntry } from '../../db/repo/entries.js';
import { useDevice } from '../../db/repo/devices.js';
import { useLang } from '../../db/repo/settings.js';
import { useWheel } from '../../db/repo/wheel.js';
import type { EntryRecord, Lang } from '../../db/schema.js';
import { fmtT } from '../../domain/format.js';
import { EmptyState } from '../components/EmptyState.js';
import { ScreenHeader } from '../components/ScreenHeader.js';
import { Tag } from '../components/Tag.js';
import { entryTitle } from '../entry-format.js';
import { useBrewSetup } from './brewing/brew-store.js';
import { diagLine } from './journal/diag-scales.js';
import { type EntryField, entryFieldPatch, hasEditableParams } from './journal/entry-edit.js';
import { entryStamp, stageWater } from './journal/format.js';
import { hasRecipe, recipeText } from './journal/qr.js';
import { QrSvg } from './journal/QrSvg.js';
import { useRate } from './journal/rate-store.js';
import { useJournalView } from './journal/view-store.js';
import './journal/journal.css';

/** Пауза перед записью заметки: пишем не на каждую букву, но и без кнопки. */
const NOTE_DEBOUNCE_MS = 300;

interface Param {
  label: string;
  value: string;
  /** Числовое поле записи — в режиме правки под ним появляются −/+. */
  field?: EntryField;
}

/**
 * Ячейки сетки в порядке прототипа (`DC:1333`). Отсутствующие выпадают.
 *
 * У дегустации сетки нет вовсе: её нули из схемы — не рецепт, а его отсутствие,
 * и «0 г воды» на экране было бы выдумкой.
 */
function paramsOf(entry: EntryRecord, lang: Lang): Param[] {
  if (entry.mode === 'cup') return [];

  const t = STR[lang];
  const out: Param[] = [];
  if (entry.grind !== null)
    out.push({ label: t.brew_grind, value: String(entry.grind), field: 'grind' });
  out.push({ label: t.brew_dose, value: `${entry.dose} ${t.grams}`, field: 'dose' });
  out.push({ label: t.brew_water, value: `${entry.water} ${t.grams}`, field: 'water' });
  out.push({ label: t.temp_short, value: `${entry.temp}${t.deg}`, field: 'temp' });
  // Времени может не быть вовсе: запись без таймера, время не засекали.
  if (entry.total > 0) out.push({ label: t.log_time, value: fmtT(entry.total) });
  out.push({ label: t.log_mode, value: modeName(entry.mode, lang) });
  if (entry.valveAt !== undefined) out.push({ label: t.brew_valve, value: fmtT(entry.valveAt) });
  return out;
}

export function Detail() {
  const lang = useLang();
  const ws = useWheel();
  const t = STR[lang];
  const go = useNav((s) => s.go);

  const viewId = useJournalView((s) => s.viewId);
  const viewEdit = useJournalView((s) => s.viewEdit);
  const fromEntry = useBrewSetup((s) => s.fromEntry);
  const startReRating = useRate((s) => s.startReRating);

  const entry = useEntry(viewId);
  const bean = useBean(entry?.bean);
  const device = useDevice(entry?.device);

  /* Режим правки — состояние экрана: правки уходят в базу сразу, уносить с
     собой нечего. Уход с экрана его размонтирует, и режим гаснет сам. ✎ из
     строки журнала открывает деталь уже включённой. */
  const [editing, setEditing] = useState(viewEdit);

  /*
   * Заметка пишется с задержкой, без кнопки «сохранить».
   *
   * Черновик держится в состоянии, потому что запись приезжает из базы, а живой
   * ответ Dexie отстаёт от набора на пару кадров: без черновика курсор прыгал бы
   * в конец строки. Незаписанное дописывается при уходе с экрана — иначе
   * последние буквы терялись бы на «назад».
   */
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const pending = useRef<{ id: string; note: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushNote = (): void => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    const last = pending.current;
    pending.current = null;
    if (last) void updateEntry(last.id, { note: last.note });
  };

  useEffect(() => flushNote, []);

  const changeNote = (id: string, note: string): void => {
    setNoteDraft(note);
    pending.current = { id, note };
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(flushNote, NOTE_DEBOUNCE_MS);
  };

  if (!entry) {
    return (
      <div className="jr" data-screen="detail">
        <ScreenHeader title={t.log_title} />
        <div className="jr__body">
          <EmptyState text={t.log_not_found} />
        </div>
      </div>
    );
  }

  const rated = entry.status === 'done';
  const params = paramsOf(entry, lang);
  const editable = editing && hasEditableParams(entry);

  /* Разбор записи обратно в сетап живёт в сторе заваривания: он же знает, что
     из этих полей вообще редактируется (`setupFromEntry`). */
  const repeat = (): void => {
    fromEntry(entry);
    go('brew');
  };

  /* Шаг степпера пишется сразу и целиком: подтверждать правку одной цифры
     нечем, а «сохранить» на экране, где всё остальное живое, было бы обманом. */
  const bump = (field: EntryField, direction: 1 | -1): void => {
    const patch = entryFieldPatch(entry, field, direction);
    if (Object.keys(patch).length > 0) void updateEntry(entry.id, patch);
  };

  /* Переоценка — тот же флоу оценки, но с предзаполнением: шкалы, заметка,
     дескрипторы и имя дегустации приезжают из записи, а «ГОТОВО» возвращает
     назад по стеку, то есть сюда. Правка параметров при этом `status` не
     трогает — его меняет только сохранённая оценка. */
  const reRate = (): void => {
    flushNote();
    startReRating(entry);
    go('diag');
  };

  return (
    <div className="jr" data-screen="detail">
      <ScreenHeader
        title={entryStamp(entry)}
        plain
        right={
          <>
            {/* Переключатель правки — тот же язык, что ПРАВКА у колеса. */}
            <button
              type="button"
              className={editing ? 'jr-detail__edit jr-detail__edit--on' : 'jr-detail__edit'}
              data-testid="detail-edit"
              aria-pressed={editing}
              aria-label={t.log_edit}
              onClick={() => {
                setEditing(!editing);
              }}
            >
              ✎
            </button>

            {/* Дегустацию повторять нечем: рецепта за ней нет. */}
            {entry.mode === 'cup' ? null : (
              <button
                type="button"
                className="jr-detail__repeat"
                data-testid="detail-repeat"
                onClick={repeat}
              >
                {t.log_repeat}
              </button>
            )}
          </>
        }
      />

      <div className="jr__body">
        <div className="jr-detail__meta">{entryTitle(entry, lang, { bean, device })}</div>

        {params.length > 0 ? (
          <div className="jr-params">
            {params.map((p) => {
              const { field } = p;
              return (
                <div className="jr-param" key={p.label}>
                  <div className="jr-param__label">{p.label}</div>
                  <div className="jr-param__value">{p.value}</div>
                  {/* ВРЕМЯ, РЕЖИМ и КЛАПАН степперов не получают: это следы
                      заваривания, а не его настройки. */}
                  {editable && field !== undefined ? (
                    <div className="jr-param__pair">
                      <button
                        type="button"
                        className="jr-param__btn"
                        data-testid={`detail-dec-${field}`}
                        aria-label={`${p.label} −`}
                        onClick={() => {
                          bump(field, -1);
                        }}
                      >
                        −
                      </button>
                      <button
                        type="button"
                        className="jr-param__btn"
                        data-testid={`detail-inc-${field}`}
                        aria-label={`${p.label} +`}
                        onClick={() => {
                          bump(field, 1);
                        }}
                      >
                        +
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        {entry.stages.length > 0 ? (
          <div className="jr__group" data-hint="detail-stages">
            <div className="jr__label">{t.log_stages}</div>
            {entry.stages.map(([key, sec, water], i) => (
              <div className="jr-stage" key={`${key}-${i}`}>
                <div className="jr-stage__name">{stageName(key, lang)}</div>
                <div className="jr-stage__water">{stageWater(water, lang)}</div>
                {/* Маркер нулевой длительности (клапан, размешивание) — точка,
                    а не «0:00»: он произошёл, но не длился. */}
                <div className="jr-stage__dur">{sec ? fmtT(sec) : '·'}</div>
              </div>
            ))}
          </div>
        ) : null}

        {rated ? (
          <div className="jr__group">
            <div className="jr__label">{t.diag_title}</div>
            <div className="jr-diag-line">{diagLine(entry.diag, lang)}</div>
          </div>
        ) : null}

        {rated && entry.desc.length > 0 ? (
          <div className="jr__group">
            <div className="jr__label">{t.log_desc}</div>
            <div className="jr-tags">
              {entry.desc.map(([id, intensity]) => (
                <Tag
                  key={id}
                  label={nameOf(id, lang, ws)}
                  caps={false}
                  intensity={intensity}
                  borderColor={colOf(id, 0.8, ws)}
                  dotColor={colOf(id, undefined, ws)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {entry.note && !editing ? (
          <div className="jr__group">
            <div className="jr__label">{t.log_note}</div>
            <div className="jr-note-text">{entry.note}</div>
          </div>
        ) : null}

        {editing ? (
          <>
            <div className="jr__group">
              <div className="jr__label">{t.log_note}</div>
              <textarea
                className="jr-detail__note"
                data-testid="detail-note"
                placeholder={t.note_ph}
                aria-label={t.log_note}
                value={noteDraft ?? entry.note}
                onChange={(e) => {
                  changeNote(entry.id, e.target.value);
                }}
              />
            </div>

            <button
              type="button"
              className="jr-detail__rerate"
              data-testid="detail-rerate"
              onClick={reRate}
            >
              {t.log_rerate}
            </button>
          </>
        ) : null}

        {hasRecipe(entry) ? (
          <div className="jr__group jr-qr" data-testid="detail-qr">
            <div className="jr__label">{t.qr_title}</div>
            <QrSvg text={recipeText(entry, bean ?? null, device ?? null)} />
            <div className="jr-qr__hint">{t.qr_hint}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
