/**
 * Настройки — то немногое, что вообще настраивается.
 *
 * Список короткий сознательно: свои кофемолки (без них не работает конвертер),
 * свои девайсы, язык, тема и спецификация. Ни аккаунтов, ни синхронизации —
 * подвал говорит об этом прямо: «локально · офлайн · без аккаунта».
 *
 * Тема появилась в BJ-9 и отменяет прежнее «ни тем» из этой шапки. Строка
 * держится здесь по тому же признаку, что язык: это выбор оформления, который
 * человек делает один раз и который обязан пережить перезапуск, — а не действие
 * и не данные. Всё остальное из того списка («ни аккаунтов, ни синхронизации»)
 * в силе.
 *
 * Экспорт и импорт появились здесь только в BJ-6, когда за ними встали
 * настоящие файлы (контракт №2): до этого строка, которая притворяется, что
 * что-то делает, была бы хуже её отсутствия (D-7). Прототип именно так и делал —
 * `exportTap` лишь поднимал флаг (`DC:1347`), а у ИМПОРТА не было обработчика
 * вовсе.
 *
 * Импорт заменяет базу целиком и говорит об этом подписью до нажатия, а не
 * диалогом после: файл выбирается системным окном, из которого можно уйти, и
 * это и есть точка отказа. Отдельного «вы уверены?» поверх неё не нужно.
 */

import { useEffect, useState } from 'react';

import { useNav } from '../../app/nav.js';
import { STR } from '../../data/strings.js';
import { useDevices } from '../../db/repo/devices.js';
import { deleteGrinder, newGrinderId, putGrinder, useOwnGrinders } from '../../db/repo/grinders.js';
import {
  putSetting,
  resetHints,
  setHintsOn,
  setTheme,
  useHintsOn,
  useLang,
  useSetting,
  useTheme,
} from '../../db/repo/settings.js';
import { resetWheelEdits, undoWheelEdit, useWheel } from '../../db/repo/wheel.js';
import type { Lang, ThemePref } from '../../db/schema.js';
import { EXPORT_FILE, ImportError, importExport, packExport } from '../../db/transfer.js';
import { files, pickFile } from '../../platform/files.js';
import { storagePersistence, type StoragePersistence } from '../../pwa/storage.js';
import { Chip, EmptyState, InverseButton, Row, Section, Stepper } from '../components/index.js';
import {
  DEFAULT_STEP,
  STEP_RANGE,
  TRANSFER_IDLE,
  type TransferState,
  canDelete,
  grinderMeta,
  makeGrinder,
  transferNote,
  wheelEditLabel,
} from './settings/settings-view.js';
import './settings/settings.css';

/** Что принимает выбор файла при импорте. */
const ZIP_ACCEPT = '.zip,application/zip';

const LANGS: readonly Lang[] = ['ru', 'en'];

/* Порядок читается как шкала «как было → наоборот → пусть решает телефон», и
   умолчание стоит первым. */
const THEMES: readonly ThemePref[] = ['dark', 'light', 'system'];

/* Через таблицу, а не через `t[`theme_${code}`]`: шаблонный ключ TypeScript не
   проверит, и опечатка доехала бы до экрана пустым чипом. */
const THEME_LABEL: Record<ThemePref, 'theme_dark' | 'theme_light' | 'theme_system'> = {
  dark: 'theme_dark',
  light: 'theme_light',
  system: 'theme_system',
};

export function More() {
  const go = useNav((s) => s.go);
  const lang = useLang();
  const theme = useTheme();
  const hintsOn = useHintsOn();
  const t = STR[lang];

  const grinders = useOwnGrinders();
  const devices = useDevices();
  const wheelEdits = useSetting('wheelEdits');
  const ws = useWheel();

  /* Форма добавления и подтверждение удаления — состояние экрана, а не стора:
     оба живут ровно пока человек на нём стоит, и уходят вместе с ним. */
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [step, setStep] = useState(DEFAULT_STEP);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [transfer, setTransfer] = useState<TransferState>(TRANSFER_IDLE);
  const [storage, setStorage] = useState<StoragePersistence | 'checking'>('checking');

  useEffect(() => {
    let active = true;
    void storagePersistence().then((value) => { if (active) setStorage(value); });
    return () => { active = false; };
  }, []);

  const protectStorage = async () => {
    setStorage('checking');
    setStorage(await storagePersistence(true));
  };

  const list = grinders ?? [];
  const busy = transfer.kind === 'busy';

  const runExport = async () => {
    if (busy) return;
    setTransfer({ kind: 'busy', op: 'export' });
    try {
      const ok = await files.save(EXPORT_FILE, await packExport());
      // Отказ в системном листе — не результат: строка возвращается к подсказке.
      setTransfer(ok ? { kind: 'done', op: 'export' } : TRANSFER_IDLE);
    } catch {
      setTransfer({ kind: 'failed', op: 'export', code: 'zip' });
    }
  };

  const runImport = async () => {
    if (busy) return;
    /* Файл выбирается ДО того, как что-то поменяется: уход из системного окна
       обязан оставить базу нетронутой и экран молчащим. */
    const file = await pickFile({ accept: ZIP_ACCEPT });
    if (!file) return;

    setTransfer({ kind: 'busy', op: 'import' });
    try {
      await importExport(file);
      setTransfer({ kind: 'done', op: 'import' });
    } catch (error) {
      setTransfer({
        kind: 'failed',
        op: 'import',
        code: error instanceof ImportError ? error.code : 'shape',
      });
    }
  };

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
        <Section label={t.set_grinders} testId="set-grinders">
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
            <span className="bj-set__chips">
              {LANGS.map((code) => (
                <Chip
                  key={code}
                  label={code}
                  active={lang === code}
                  onClick={() => void putSetting('lang', code)}
                />
              ))}
            </span>
          }
        />

        <Row
          label={t.set_theme}
          right={
            <span className="bj-set__chips">
              {THEMES.map((code) => (
                <Chip
                  key={code}
                  label={t[THEME_LABEL[code]]}
                  active={theme === code}
                  testId={`set-theme-${code}`}
                  onClick={() => void setTheme(code)}
                />
              ))}
            </span>
          }
        />

        {/* Подсказки стоят рядом с языком и темой по тому же признаку: это
            настройка оформления, которую человек трогает один раз. Сброс —
            отдельной строкой, потому что это действие, а не выбор: проскочивший
            подсказку тапом иначе не может её вернуть. */}
        <Row
          label={t.set_hints}
          sub={t.set_hints_hint}
          right={
            <span className="bj-set__chips">
              <Chip
                label={t.set_hints_on}
                active={hintsOn}
                testId="set-hints-on"
                onClick={() => void setHintsOn(true)}
              />
              <Chip
                label={t.set_hints_off}
                active={!hintsOn}
                testId="set-hints-off"
                onClick={() => void setHintsOn(false)}
              />
            </span>
          }
        />

        <Row
          label={t.set_hints_reset}
          right="↻"
          testId="set-hints-reset"
          onClick={() => void resetHints()}
        />

        <Row label={t.set_spec} right="→" onClick={() => go('spec')} />

        {/* Правки колеса вкусов (BJ-11). Секции нет, пока правок нет: пустой
            список объяснял бы фичу, которой человек не пользовался. Каждую
            правку можно отменить крестиком; сброс возвращает встроенную базу. */}
        {wheelEdits.length > 0 ? (
          <Section label={t.wheel_title} testId="set-wheel">
            {wheelEdits.map((edit) => (
              <div key={JSON.stringify(edit)} className="bj-set__grinder" data-testid="wheel-edit-row">
                <div className="bj-set__grinder-name">{wheelEditLabel(edit, lang, ws)}</div>
                <button
                  type="button"
                  className="bj-set__del"
                  data-testid="wheel-edit-undo"
                  aria-label={t.a11y_remove}
                  onClick={() => void undoWheelEdit(edit)}
                >
                  ×
                </button>
              </div>
            ))}
            <Row
              label={t.wheel_edits_reset}
              right="↻"
              flush
              testId="set-wheel-reset"
              onClick={() => void resetWheelEdits()}
            />
          </Section>
        ) : null}

        {/* Обмен базой стоит последним и без своего заголовка: это не настройка,
            а действие, и разделять две строки лишней секцией не за чем. */}
        <Row
          label={t.set_export}
          sub={transferNote(transfer, 'export', lang)}
          right="↓"
          testId="set-export"
          onClick={() => void runExport()}
        />
        <Row
          label={t.set_import}
          sub={transferNote(transfer, 'import', lang)}
          right="↑"
          testId="set-import"
          onClick={() => void runImport()}
        />

        {storage !== 'native' ? (
          <Row
            label={t.set_storage}
            sub={storage === 'checking' ? t.set_storage_checking
              : storage === 'persistent' ? t.set_storage_protected
                : storage === 'best-effort' ? t.set_storage_best_effort : t.set_storage_unavailable}
            right={storage === 'persistent' ? '✓' : storage === 'best-effort' ? '→' : '…'}
            testId="set-storage"
            {...(storage === 'best-effort' ? { onClick: () => void protectStorage() } : {})}
          />
        ) : null}

        <div className="bj-set__footer">
          {t.set_offline} · {t.set_ver}
        </div>
      </div>
    </section>
  );
}
