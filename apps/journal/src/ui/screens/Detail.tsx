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
 * QR — пустая площадка (D-7). Настоящий кодировщик придёт в BJ-6; фейковый шум
 * прототипа (`qrSvg`, `DC:1131`) не переносится: картинка, которая выглядит как
 * QR и не сканируется, хуже, чем её отсутствие.
 */

import { useNav } from '../../app/nav.js';
import { STR, modeName, stageName } from '../../data/strings.js';
import { colOf, nameOf } from '../../data/wheel.js';
import { useBean } from '../../db/repo/beans.js';
import { useEntry } from '../../db/repo/entries.js';
import { useDevice } from '../../db/repo/devices.js';
import { useLang } from '../../db/repo/settings.js';
import type { EntryRecord, Lang } from '../../db/schema.js';
import { fmtT } from '../../domain/format.js';
import { EmptyState } from '../components/EmptyState.js';
import { ScreenHeader } from '../components/ScreenHeader.js';
import { Tag } from '../components/Tag.js';
import { entryTitle } from '../entry-format.js';
import { useBrewSetup } from './brewing/brew-store.js';
import { diagLine } from './journal/diag-scales.js';
import { entryStamp, stageWater } from './journal/format.js';
import { useJournalView } from './journal/view-store.js';
import './journal/journal.css';

interface Param {
  label: string;
  value: string;
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
  if (entry.grind !== null) out.push({ label: t.brew_grind, value: String(entry.grind) });
  out.push({ label: t.brew_dose, value: `${entry.dose} ${t.grams}` });
  out.push({ label: t.brew_water, value: `${entry.water} ${t.grams}` });
  out.push({ label: t.temp_short, value: `${entry.temp}${t.deg}` });
  out.push({ label: t.log_time, value: fmtT(entry.total) });
  out.push({ label: t.log_mode, value: modeName(entry.mode, lang) });
  if (entry.valveAt !== undefined) out.push({ label: t.brew_valve, value: fmtT(entry.valveAt) });
  return out;
}

export function Detail() {
  const lang = useLang();
  const t = STR[lang];
  const go = useNav((s) => s.go);

  const viewId = useJournalView((s) => s.viewId);
  const fromEntry = useBrewSetup((s) => s.fromEntry);

  const entry = useEntry(viewId);
  const bean = useBean(entry?.bean);
  const device = useDevice(entry?.device);

  if (!entry) {
    return (
      <div className="jr" data-screen="detail">
        <ScreenHeader title={t.log_title} />
        <div className="jr__body">
          <EmptyState text={t.home_empty} />
        </div>
      </div>
    );
  }

  const rated = entry.status === 'done';
  const params = paramsOf(entry, lang);

  /* Разбор записи обратно в сетап живёт в сторе заваривания: он же знает, что
     из этих полей вообще редактируется (`setupFromEntry`). */
  const repeat = (): void => {
    fromEntry(entry);
    go('brew');
  };

  return (
    <div className="jr" data-screen="detail">
      <ScreenHeader
        title={entryStamp(entry)}
        plain
        right={
          /* Дегустацию повторять нечем: рецепта за ней нет. */
          entry.mode === 'cup' ? undefined : (
            <button
              type="button"
              className="jr-detail__repeat"
              data-testid="detail-repeat"
              onClick={repeat}
            >
              {t.log_repeat}
            </button>
          )
        }
      />

      <div className="jr__body">
        <div className="jr-detail__meta">{entryTitle(entry, lang, { bean, device })}</div>

        {params.length > 0 ? (
          <div className="jr-params">
            {params.map((p) => (
              <div className="jr-param" key={p.label}>
                <div className="jr-param__label">{p.label}</div>
                <div className="jr-param__value">{p.value}</div>
              </div>
            ))}
          </div>
        ) : null}

        {entry.stages.length > 0 ? (
          <div className="jr__group">
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
                  label={nameOf(id, lang)}
                  caps={false}
                  intensity={intensity}
                  borderColor={colOf(id, 0.8)}
                  dotColor={colOf(id)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {entry.note ? (
          <div className="jr__group">
            <div className="jr__label">{t.log_note}</div>
            <div className="jr-note-text">{entry.note}</div>
          </div>
        ) : null}

        <div className="jr-qr">
          <div className="jr-qr__slot" />
          <div className="jr-qr__text">
            <div className="jr__label">{t.set_qr}</div>
            <div className="jr__hint">{t.qr_hint}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
