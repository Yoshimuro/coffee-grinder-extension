/**
 * Полка — что лежит дома и в каком состоянии.
 *
 * Карточка отвечает на один вопрос: можно ли это сегодня заваривать. Поэтому
 * на ней ровно три вещи — снимок (пачку узнают глазами, а не по названию),
 * имя и строка «форма · возраст · фаза · остаток». Ни рейтингов, ни описаний
 * обжарщика: всё, что не участвует в решении, сюда не попадает.
 *
 * Два входа внизу равноправны по README («СНЯТЬ ПАЧКУ / ВПИСАТЬ РУКАМИ»), но
 * не по весу: снимок — обычный путь, руками — запасной, поэтому первый в рамке,
 * второй просто текстом. Оба ведут на один экран, отличается лишь то, открывать
 * ли камеру сразу.
 */

import { useNav } from '../../app/nav.js';
import { isoDate } from '../../data/freshness.js';
import { STR } from '../../data/strings.js';
import { useBeans } from '../../db/repo/beans.js';
import { useLang } from '../../db/repo/settings.js';
import { beanName, beanTechWithForm } from '../bean-format.js';
import { EmptyState } from '../components/index.js';
import { PhotoSlot } from './shelf/PhotoSlot.js';
import { useBeanAdd } from './shelf/bean-add-store.js';
import { useBeanView } from './shelf/bean-store.js';
import { shelfCountLine } from './shelf/shelf-view.js';
import './shelf/shelf.css';

export function Shelf() {
  const go = useNav((s) => s.go);
  const lang = useLang();
  const t = STR[lang];

  const beans = useBeans();
  const openBean = useBeanView((s) => s.openBean);
  const startAdd = useBeanAdd((s) => s.start);

  const today = isoDate(new Date());

  const add = (withCamera: boolean) => {
    startAdd(withCamera);
    go('beanAdd');
  };

  const open = (id: string) => {
    openBean(id);
    go('bean');
  };

  return (
    <section className="screen" data-screen="shelf">
      <header className="bj-head bj-head--root">
        <h1 className="bj-head__title">{t.shelf_title}</h1>
        <div className="bj-head__right">{shelfCountLine(beans?.length ?? 0, lang)}</div>
      </header>

      <div className="screen__body bj-shelf">
        {(beans ?? []).map((bean) => (
          <button
            key={bean.id}
            type="button"
            className="bj-shelf__card"
            data-testid="shelf-card"
            onClick={() => open(bean.id)}
          >
            <PhotoSlot photo={bean.photos[0] ?? null} placeholder={t.shelf_ph} size="card" />
            <span className="bj-shelf__body">
              <span className="bj-shelf__name">{beanName(bean, lang)}</span>
              <span className="bj-shelf__tech">{beanTechWithForm(bean, lang, today)}</span>
            </span>
          </button>
        ))}

        {/* Полка пуста — приглашение, а не извинение (README, тон). */}
        {beans !== undefined && beans.length === 0 ? <EmptyState text={t.shelf_empty} /> : null}

        <div className="bj-shelf__add">
          <button
            type="button"
            className="bj-shelf__add-main"
            data-testid="shelf-add-photo"
            onClick={() => add(true)}
          >
            {t.shelf_add_photo}
          </button>
          <button
            type="button"
            className="bj-shelf__add-alt"
            data-testid="shelf-add-manual"
            onClick={() => add(false)}
          >
            {t.shelf_add_manual}
          </button>
        </div>
      </div>
    </section>
  );
}
