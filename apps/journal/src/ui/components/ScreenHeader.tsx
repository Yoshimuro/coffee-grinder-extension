/**
 * Шапка экрана: «←», заголовок и необязательный правый угол.
 *
 * Отдельно от `ScreenShell` намеренно: половине экранов BJ-4 нужен не
 * прокручиваемый блок под шапкой, а собственная раскладка — журнал держит
 * фильтры неподвижно, таймер вообще не скроллится. Шапка одна на всех, тело
 * каждый экран строит сам.
 *
 * Кнопка «назад» ходит в стор навигации сама (`nav.back`), поэтому экрану не
 * нужно её прокидывать; `onBack` перекрывает это, когда уйти надо не на шаг
 * назад, а по своему маршруту.
 */

import type { ReactNode } from 'react';

import { useNav } from '../../app/nav.js';
import { STR } from '../../data/strings.js';
import { useLang } from '../../db/repo/settings.js';
import './components.css';

export interface ScreenHeaderProps {
  /** Готовая строка из `strings.ts`. Компонент сам её не переводит. */
  title: string;
  /** «←». По умолчанию есть: вложенных экранов больше, чем корневых. */
  back?: boolean;
  /** Своё действие вместо `nav.back()`. */
  onBack?: () => void;
  /** Правый угол: тех-строка вроде «134 кофемолки · база» или кнопки. */
  right?: ReactNode;
  /**
   * Заголовок собран из данных, а не из `strings.ts`: имя пачки, отметка
   * времени. Тогда он не капсится и обрезается многоточием (макет `DC:1258`).
   */
  plain?: boolean;
}

export function ScreenHeader({ title, back = true, onBack, right, plain = false }: ScreenHeaderProps) {
  const navBack = useNav((s) => s.back);
  const lang = useLang();

  return (
    <header className="bj-head">
      {back ? (
        <button
          type="button"
          className="back"
          aria-label={STR[lang].back}
          onClick={onBack ?? navBack}
        >
          ←
        </button>
      ) : null}
      <h1 className={`bj-head__title${plain ? ' bj-head__title--plain' : ''}`}>{title}</h1>
      {right === undefined ? null : <div className="bj-head__right">{right}</div>}
    </header>
  );
}
