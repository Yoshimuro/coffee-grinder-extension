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

import { useNav } from '../../app/nav.js';
import { STR, modeName, stageName } from '../../data/strings.js';
import { colOf, nameOf } from '../../data/wheel.js';
import { useBean } from '../../db/repo/beans.js';
import { useEntry } from '../../db/repo/entries.js';
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
import { entryStamp, stageWater } from './journal/format.js';
import { hasRecipe, recipeText } from './journal/qr.js';
import { QrSvg } from './journal/QrSvg.js';
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
  const fromEntry = useBrewSetup((s) => s.fromEntry);

  const entry = useEntry(viewId);
  const bean = useBean(entry?.bean);
  const device = useDevice(entry?.device);

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

        {entry.note ? (
          <div className="jr__group">
            <div className="jr__label">{t.log_note}</div>
            <div className="jr-note-text">{entry.note}</div>
          </div>
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
