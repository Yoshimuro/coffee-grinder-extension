/**
 * Добавление пачки.
 *
 * Полей ровно столько, сколько участвует в расчётах: форма кофе решает, какие
 * поля покажет сетап заваривания; дата обжарки даёт возраст и фазу; количество
 * даёт остаток, который списывают заварки. Обжарщик, страна, сорт и высота на
 * вкус не влияют и здесь не спрашиваются — их видно на снимке пачки.
 *
 * Дату вводят двумя способами, и оба ведут в одно поле: маска ставит точки за
 * человеком, пока он набирает цифры, а календарь рядом закрывает случай, когда
 * дату на пачке видно, а какое это число — уже нет (BJ-8).
 *
 * Возврат — по стеку навигации: пришли с полки — уходим на полку, пришли с
 * сетапа («+ ЗЕРНО») — уходим на сетап, и новая пачка там уже выбрана
 * (`addSave`, `DC:1271`). Автовыбор сетапа берёт первую пачку, а новая ложится
 * последней, поэтому выбор проставляется явно — это контракт из отчёта G2.
 */

import { useState } from 'react';

import { previousScreen, useNav } from '../../app/nav.js';
import { isoDate } from '../../data/freshness.js';
import { STR } from '../../data/strings.js';
import { newBeanId, putBean } from '../../db/repo/beans.js';
import { useLang } from '../../db/repo/settings.js';
import { photos as photoStore } from '../../platform/photos.js';
import { formLabel, longDate, maskDate, parseDate } from '../bean-format.js';
import {
  Chip,
  ChipRow,
  DatePicker,
  InverseButton,
  ScreenHeader,
  Stepper,
  yearBefore,
} from '../components/index.js';
import { PhotoSlot } from './shelf/PhotoSlot.js';
import { useBeanAdd } from './shelf/bean-add-store.js';
import { useBrewSetup } from './brewing/brew-store.js';
import {
  BEAN_FORMS,
  amountLabel,
  amountRange,
  amountUnit,
  draftReady,
  makeBean,
} from './shelf/shelf-view.js';
import './shelf/shelf.css';

/** Значок «сетка месяца»: рамка и три точки-дня — читается на 12px без подписи. */
function CalGlyph() {
  return (
    <svg
      className="bj-add__cal-glyph"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden="true"
    >
      <rect x="1" y="2.5" width="10" height="8.5" />
      <path d="M1 5H11" />
      <path d="M3.5 1V3.5M8.5 1V3.5" />
      <rect x="3" y="7" width="1.4" height="1.4" fill="currentColor" stroke="none" />
      <rect x="5.6" y="7" width="1.4" height="1.4" fill="currentColor" stroke="none" />
      <rect x="8.2" y="7" width="1.4" height="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BeanAdd() {
  const back = useNav((s) => s.back);
  const lang = useLang();
  const t = STR[lang];

  const draft = useBeanAdd();
  const { setForm, setRoast, setAmount, setName, addPhoto } = draft;

  /* Дата живёт в поле как `DD.MM.YYYY`, а в черновике — как ISO. Черновик
     обновляется только когда строка разобралась: пока человек стирает точку,
     подставлять туда невалидное нельзя. */
  const [roastText, setRoastText] = useState(() =>
    draft.roast ? longDate(draft.roast) : '',
  );
  const [calOpen, setCalOpen] = useState(false);

  const today = isoDate(new Date());

  const capture = async () => {
    const shot = await photoStore.capture();
    if (shot) addPhoto({ path: shot.path, thumb: shot.thumb });
  };

  const save = async () => {
    const roast = parseDate(roastText);
    /* Пачка не заводится без даты обжарки — на ней держится вся свежесть, и
       подставить «сегодня» значило бы соврать про возраст зерна, — и без
       названия (решение BJ-8): пачки на полке различают глазами, вторая «Без
       названия» делает список нечитаемым. Фолбэк на «Без названия» в `makeBean`
       остался только для импорта чужих баз, где имени могло не быть. Оба
       условия держит `draftReady` на кнопке; проверка даты здесь — страховка на
       случай, если кнопку нажмут в обход состояния. */
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
          <div className="bj-add__date-row">
            <input
              className="bj-add__input"
              type="text"
              inputMode="numeric"
              data-testid="bean-roast"
              placeholder="27.07.2026"
              aria-label={t.bean_roast}
              value={roastText}
              onChange={(e) => {
                /* Прежнее значение уходит в маску, чтобы стирание работало
                   по-человечески: без него backspace по точке тут же вернул бы
                   её обратно, и поле стало бы неудаляемым. */
                const masked = maskDate(e.target.value, roastText);
                setRoastText(masked);
                const iso = parseDate(masked);
                if (iso !== null) setRoast(iso);
              }}
            />
            <button
              type="button"
              className="bj-add__cal-btn"
              data-testid="bean-roast-cal"
              aria-label={t.cal_open}
              aria-expanded={calOpen}
              onClick={() => setCalOpen(!calOpen)}
            >
              <CalGlyph />
            </button>
          </div>
          {calOpen ? (
            <DatePicker
              value={parseDate(roastText)}
              min={yearBefore(today)}
              max={today}
              onPick={(iso) => {
                setRoastText(longDate(iso));
                setRoast(iso);
                setCalOpen(false);
              }}
            />
          ) : null}
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
          <div className="micro">{t.bean_name}</div>
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
          disabled={!draftReady(roastText, draft.name)}
          onClick={() => void save()}
        >
          {t.bean_save}
        </InverseButton>
      </div>
    </section>
  );
}
