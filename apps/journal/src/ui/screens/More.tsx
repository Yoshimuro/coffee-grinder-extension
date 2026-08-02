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

import { useState } from 'react';

import { useNav } from '../../app/nav.js';
import { STR } from '../../data/strings.js';
import { useDevices } from '../../db/repo/devices.js';
import { deleteGrinder, newGrinderId, putGrinder, useOwnGrinders } from '../../db/repo/grinders.js';
import { putSetting, setTheme, useLang, useTheme } from '../../db/repo/settings.js';
import type { Lang, ThemePref } from '../../db/schema.js';
import { EXPORT_FILE, ImportError, importExport, packExport } from '../../db/transfer.js';
import { files, pickFile } from '../../platform/files.js';
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
  const t = STR[lang];

  const grinders = useOwnGrinders();
  const devices = useDevices();

  /* Форма добавления и подтверждение удаления — состояние экрана, а не стора:
     оба живут ровно пока человек на нём стоит, и уходят вместе с ним. */
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [step, setStep] = useState(DEFAULT_STEP);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [transfer, setTransfer] = useState<TransferState>(TRANSFER_IDLE);

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
            <span className="bj-set__chips">
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

        <Row label={t.set_spec} right="→" onClick={() => go('spec')} />

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

        <div className="bj-set__footer">
          {t.set_offline} · {t.set_ver}
        </div>
      </div>
    </section>
  );
}
