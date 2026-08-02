/**
 * Слот фото пачки: снимок, если он есть, и приглашение снять, если нет.
 *
 * Прототип рисовал здесь `<image-slot>` — заглушку своего окружения, живых
 * снимков в нём не было вовсе (component-report §10.3). Здесь слот настоящий:
 * миниатюра лежит в `PhotoRef.thumb` готовым data-URL и рисуется сразу, а
 * полноразмерный снимок подтягивается через `photoSrc` и освобождается в
 * уборке эффекта — иначе каждый повторный заход подтекал бы blob-URL'ом.
 *
 * Съёмка идёт через платформенный интерфейс (`platform/photos.ts`): в вебе это
 * скрытый `<input type=file capture>`, в BJ-6 — камера Capacitor. Экран об этом
 * различии не знает.
 */

import { useEffect, useState } from 'react';

import type { PhotoRef } from '../../../db/schema.js';
import { photoSrc } from '../../../platform/photos.js';
import './shelf.css';

export interface PhotoSlotProps {
  /** Снятое фото. `null` — пустой слот с пунктирной рамкой. */
  photo?: PhotoRef | null;
  /** Подпись пустого слота: «лицо пачки», «шов · дата обжарки». */
  placeholder: string;
  /** Высота слота: `card` 118px на полке, `full` 300px на карточке пачки. */
  size?: 'card' | 'full' | 'add';
  /** Тап по слоту — снять или заменить снимок. */
  onClick?: () => void;
  /** Подпись для скринридера, когда слот кликабельный. */
  label?: string;
  /** Метка для сквозного теста (`data-testid`) — см. `InverseButton`. */
  testId?: string;
}

/** Значок «картинка» — тот же контур, что рисует макет в пустом слоте. */
function PhotoGlyph() {
  return (
    <svg
      className="bj-slot__glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" />
      <circle cx="8.5" cy="9.5" r="1.8" />
      <path d="M3 16.5 L9 11 L14 15.5 L17 13 L21 16.5" />
    </svg>
  );
}

export function PhotoSlot({
  photo,
  placeholder,
  size = 'card',
  onClick,
  label,
  testId,
}: PhotoSlotProps) {
  /* Миниатюра показывается сразу; полный снимок заменяет её, когда прочитается
     из OPFS. Так слот никогда не бывает пустым, пока файл грузится. */
  const [full, setFull] = useState<string | null>(null);
  const path = photo?.path;

  useEffect(() => {
    if (path === undefined) return undefined;

    let revoke: (() => void) | null = null;
    let live = true;

    void photoSrc(path).then((src) => {
      if (!src) return;
      // Экран мог смениться, пока читался файл: тогда URL сразу освобождается,
      // иначе он повис бы до перезагрузки страницы.
      if (!live) {
        src.revoke();
        return;
      }
      revoke = src.revoke;
      setFull(src.url);
    });

    return () => {
      live = false;
      revoke?.();
      setFull(null);
    };
  }, [path]);

  const cls = `bj-slot bj-slot--${size}${photo ? ' bj-slot--filled' : ''}`;
  const body = photo ? (
    <img className="bj-slot__img" src={full ?? photo.thumb} alt={label ?? placeholder} />
  ) : (
    <>
      <PhotoGlyph />
      <span className="bj-slot__label">{placeholder}</span>
    </>
  );

  return onClick === undefined ? (
    <div className={cls} data-testid={testId}>
      {body}
    </div>
  ) : (
    <button
      type="button"
      className={cls}
      data-testid={testId}
      aria-label={label ?? placeholder}
      onClick={onClick}
    >
      {body}
    </button>
  );
}
