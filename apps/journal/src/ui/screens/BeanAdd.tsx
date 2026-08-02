/**
 * Добавление пачки.
 *
 * Полей ровно столько, сколько участвует в расчётах: форма кофе решает, какие
 * поля покажет сетап заваривания; дата обжарки даёт возраст и фазу; количество
 * даёт остаток, который списывают заварки. Обжарщик, страна, сорт и высота на
 * вкус не влияют и здесь не спрашиваются — их видно на снимке пачки.
 *
 * Возврат — по стеку навигации: пришли с полки — уходим на полку, пришли с
 * сетапа («+ ЗЕРНО») — уходим на сетап, и новая пачка там уже выбрана
 * (`addSave`, `DC:1271`). Автовыбор сетапа берёт первую пачку, а новая ложится
 * последней, поэтому выбор проставляется явно — это контракт из отчёта G2.
 */

import { useEffect, useState } from 'react';

import { previousScreen, useNav } from '../../app/nav.js';
import { STR } from '../../data/strings.js';
import { newBeanId, putBean } from '../../db/repo/beans.js';
import { useLang } from '../../db/repo/settings.js';
import { photos as photoStore } from '../../platform/photos.js';
import { formLabel, longDate, parseDate } from '../bean-format.js';
import { Chip, ChipRow, InverseButton, ScreenHeader, Stepper } from '../components/index.js';
import { PhotoSlot } from './shelf/PhotoSlot.js';
import { useBeanAdd } from './shelf/bean-add-store.js';
import { useBrewSetup } from './brewing/brew-store.js';
import {
  BEAN_FORMS,
  amountLabel,
  amountRange,
  amountUnit,
  makeBean,
} from './shelf/shelf-view.js';
import './shelf/shelf.css';

export function BeanAdd() {
  const back = useNav((s) => s.back);
  const lang = useLang();
  const t = STR[lang];

  const draft = useBeanAdd();
  const { setForm, setRoast, setAmount, setName, addPhoto, captureDone } = draft;

  /* Дата живёт в поле как `DD.MM.YYYY`, а в черновике — как ISO. Черновик
     обновляется только когда строка разобралась: пока человек стирает точку,
     подставлять туда невалидное нельзя. */
  const [roastText, setRoastText] = useState(() =>
    draft.roast ? longDate(draft.roast) : '',
  );

  const capture = async () => {
    const shot = await photoStore.capture();
    if (shot) addPhoto({ path: shot.path, thumb: shot.thumb });
  };

  /* «СНЯТЬ ПАЧКУ» открывает камеру сразу — иначе кнопка обещает съёмку, а
     показывает форму. Флаг снимается до вызова: пикер файлов на старых движках
     не сообщает об отмене, и второй заход не должен открыть его снова. */
  useEffect(() => {
    if (!draft.autoCapture) return;
    captureDone();
    void capture();
    /* Зависимость одна намеренно: эффект следит за флагом, а не за черновиком.
       `capture` пересоздаётся каждый рендер, и в списке он открывал бы пикер
       заново на каждое нажатие степпера. */
  }, [draft.autoCapture, captureDone]);

  const save = async () => {
    const roast = parseDate(roastText);
    // Без даты обжарки пачка не заводится: на ней держится вся свежесть, и
    // подставить «сегодня» значило бы соврать про возраст зерна.
    if (roast === null) return;

    const id = newBeanId();
    await putBean(
      makeBean(
        { form: draft.form, roast, amount: draft.amount, name: draft.name, photos: draft.photos },
        id,
        lang,
      ),
    );

    if (previousScreen() === 'brew') useBrewSetup.getState().setBean(id);
    back();
  };

  const roastOk = parseDate(roastText) !== null;

  return (
    <section className="screen" data-screen="beanAdd">
      <ScreenHeader title={t.shelf_add} />

      <div className="screen__body">
        <div className="micro">{t.bean_form}</div>
        <ChipRow>
          {BEAN_FORMS.map((form) => (
            <Chip
              key={form}
              label={formLabel(form, lang)}
              grow
              active={draft.form === form}
              onClick={() => setForm(form)}
            />
          ))}
        </ChipRow>

        <div className="bj-add__shots">
          {draft.photos.map((photo, i) => (
            <PhotoSlot
              key={photo.path}
              photo={photo}
              placeholder={t.bean_ph_new}
              size="full"
              label={`${t.bean_photos} ${i + 1}`}
              testId={`bean-photo-${String(i)}`}
            />
          ))}
          <PhotoSlot
            placeholder={t.bean_ph_new}
            size="add"
            label={t.shelf_add_photo}
            testId="bean-photo-add"
            onClick={() => void capture()}
          />
        </div>
        <div className="bj-add__hint">{t.bean_photo_hint}</div>

        <div className="bj-add__field">
          <div className="micro">{t.bean_roast}</div>
          <input
            className="bj-add__input"
            type="text"
            inputMode="numeric"
            data-testid="bean-roast"
            placeholder="27.07.2026"
            aria-label={t.bean_roast}
            value={roastText}
            onChange={(e) => {
              setRoastText(e.target.value);
              const iso = parseDate(e.target.value);
              if (iso !== null) setRoast(iso);
            }}
          />
        </div>

        <div className="bj-add__field">
          <Stepper
            {...amountRange(draft.form)}
            label={amountLabel(draft.form, lang)}
            size="lg"
            value={draft.amount}
            unit={amountUnit(draft.form, lang)}
            onChange={setAmount}
          />
        </div>

        <div className="bj-add__field">
          <div className="micro">
            {t.bean_name} · <span className="bj-add__optional">{t.bean_optional}</span>
          </div>
          <input
            className="bj-add__input"
            type="text"
            data-testid="bean-name"
            placeholder={t.entry_none}
            aria-label={t.bean_name}
            value={draft.name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <InverseButton
          size="lg"
          className="bj-add__save"
          testId="bean-save"
          disabled={!roastOk}
          onClick={() => void save()}
        >
          {t.bean_save}
        </InverseButton>
      </div>
    </section>
  );
}
