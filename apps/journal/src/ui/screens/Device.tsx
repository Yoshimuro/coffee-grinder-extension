/**
 * Конструктор девайса — шесть групп признаков и живой чертёж над ними.
 *
 * Это ответ на вопрос «а моей воронки нет в списке»: списка марок здесь нет
 * вовсе, девайс описывается тем, что влияет на заваривание. Поток решает, какие
 * стадии сгенерирует таймер; дно и стенка — как быстро уходит вода; материал —
 * сколько тепла он украдёт. Всё, что на это не влияет, не спрашивается.
 *
 * Чертёж перерисовывается на каждый тап и стоит выше чипов: он — проверка
 * выбора, и увидеть её надо до того, как палец уйдёт с экрана.
 *
 * Три заготовки (D-3) — не каталог, а стартовые точки: тап по ним заполняет
 * все шесть групп, дальше правится как обычно.
 */

import { previousScreen, useNav } from '../../app/nav.js';
import { STR } from '../../data/strings.js';
import { KNOWN_DEVICES, TRAITS, TRAIT_KEYS } from '../../data/traits.js';
import { newDeviceId, putDevice } from '../../db/repo/devices.js';
import { useLang } from '../../db/repo/settings.js';
import type { DeviceRecord } from '../../db/schema.js';
import { Chip, ChipRow, ScreenHeader } from '../components/index.js';
import { useBrewSetup } from './brewing/brew-store.js';
import { DevSvg } from './devices/DevSvg.js';
import { useDeviceDraft } from './devices/device-store.js';
import { devLine, deviceName, draftNote, groupLabel, traitLabel } from './devices/dev-view.js';
import './devices/devices.css';

export function Device() {
  const back = useNav((s) => s.back);
  const lang = useLang();
  const t = STR[lang];

  const { draft, editing, patch, applyPreset } = useDeviceDraft();

  const caption = devLine(draft, lang);

  const save = async () => {
    const id = editing ?? newDeviceId();
    const record: DeviceRecord = { ...draft, id, name: deviceName(draft.name, lang) };
    await putDevice(record);

    /* Пришли с сетапа заваривания — возвращаем девайс туда уже выбранным
       (`saveDev`, `DC:1280`). Иначе человек сделал бы девайс и всё равно
       остался бы перед пустым списком. */
    if (previousScreen() === 'brew') useBrewSetup.getState().setDevice(id);
    back();
  };

  return (
    <section className="screen" data-screen="device">
      <ScreenHeader
        title={t.dev_edit}
        right={
          <button type="button" className="bj-dev__save" data-testid="device-save" onClick={() => void save()}>
            {t.dev_save}
          </button>
        }
      />

      <div className="screen__body">
        <div className="bj-dev__stage">
          <DevSvg device={draft} big title={caption} />
          <div className="bj-dev__caption">{caption}</div>
        </div>
        <div className="bj-dev__note">{draftNote(draft, lang)}</div>

        {/* Заготовки: только для нового девайса — правку чужой формы они бы
            молча затёрли (D-3). */}
        {editing === null ? (
          <div className="bj-dev__presets">
            <ChipRow>
              {KNOWN_DEVICES.map((preset) => (
                <Chip key={preset.id} label={preset.name} onClick={() => applyPreset(preset)} />
              ))}
            </ChipRow>
          </div>
        ) : null}

        <div className="bj-dev__field">
          <div className="micro">{t.dev_name}</div>
          <input
            className="bj-dev__input"
            type="text"
            data-testid="device-name"
            placeholder={t.entry_none}
            aria-label={t.dev_name}
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </div>

        {TRAIT_KEYS.map((key) => (
          <div key={key} className="bj-dev__field">
            <div className="micro">{groupLabel(key, lang)}</div>
            <ChipRow>
              {Object.keys(TRAITS[key].opts).map((option) => (
                <Chip
                  key={option}
                  label={traitLabel(key, option, lang)}
                  active={draft[key] === option}
                  // Ключ группы и её опция связаны типом `TraitRegistry`, но
                  // выразить это на переборе `Object.keys` может только
                  // утверждение — набор опций проверен `satisfies` в traits.ts.
                  onClick={() => patch({ [key]: option } as Partial<DeviceRecord>)}
                />
              ))}
            </ChipRow>
          </div>
        ))}

        <div className="bj-dev__hint">{t.dev_hint}</div>
      </div>
    </section>
  );
}
