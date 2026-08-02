/**
 * Полка — что лежит дома и в каком состоянии.
 *
 * Карточка отвечает на один вопрос: можно ли это сегодня заваривать. Поэтому
 * на ней ровно три вещи — снимок (пачку узнают глазами, а не по названию),
 * имя и строка «форма · возраст · фаза · остаток». Ни рейтингов, ни описаний
 * обжарщика: всё, что не участвует в решении, сюда не попадает.
 *
 * Вход внизу один — «ДОБАВИТЬ КОФЕ» (решение пользователя, BJ-8). Раньше их
 * было два, «снять пачку» и «вписать руками», но выбор стоял до формы, когда
 * человек ещё не знает, что снимок и поля — не альтернативы, а одно и то же
 * добавление. Теперь кнопка ведёт на форму, а снимок делается там же тапом по
 * слоту фото — камера сама больше не открывается.
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

  const add = () => {
    startAdd();
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
          <button type="button" className="bj-shelf__add-main" data-testid="shelf-add" onClick={add}>
            {t.shelf_add_bean}
          </button>
        </div>
      </div>
    </section>
  );
}
