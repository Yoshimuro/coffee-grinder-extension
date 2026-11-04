/**
 * Реестр подсказок первого входа (`docs/brew-journal-onboarding.md`).
 *
 * Подсказка — одна зона экрана, одна строка текста. Показывается при первом
 * заходе на экран и больше не возвращается: показанные id лежат в настройке
 * `hints`.
 *
 * **Id — append-only.** В базе хранятся именно эти строки, поэтому переименовать
 * id значит показать подсказку заново всем, кто её уже видел. Удалять из списка
 * можно, переименовывать — нет. То же правило, что у дескрипторов колеса
 * (контракт №4 спеки).
 *
 * Якорь — CSS-селектор, а не ref: половина зон уже помечена `data-testid` для
 * e2e, и второй механизм разметки ради подсветки заводить не за чем. Не
 * нашёлся селектор — шаг молча пропускается и остаётся непоказанным (он ещё
 * дождётся своего случая: у клапана гибрида, кнопки «+ имя» на колесе и точек
 * памяти зона появляется не сразу).
 *
 * Порядок внутри экрана — порядок в этом массиве.
 */

import type { Screen } from '../app/nav.js';
import type { StrKey } from './strings.js';

export interface Hint {
  /** Ключ в настройке `hints`. Append-only, см. шапку. */
  readonly id: string;
  /** Экран, на котором подсказка живёт. */
  readonly screen: Screen;
  /** Ключ текста в таблице строк. */
  readonly key: StrKey;
  /** Селектор подсвечиваемой зоны. Не нашёлся — шаг пропускается. */
  readonly selector: string;
}

export const HINTS: readonly Hint[] = [
  /* ── Главный ───────────────────────────────────────────────────────────── */
  {
    id: 'h-home-brew',
    screen: 'home',
    key: 'hint_home_brew',
    selector: '[data-testid="home-brew"]',
  },
  {
    id: 'h-home-taste',
    screen: 'home',
    key: 'hint_home_taste',
    selector: '[data-testid="home-taste"]',
  },
  {
    id: 'h-home-conv',
    screen: 'home',
    key: 'hint_home_conv',
    selector: '[data-testid="home-conv"]',
  },
  /* Карточки нет, пока нет ждущей оценки записи, — до первой заварки шаг
     пропускается сам собой. */
  {
    id: 'h-home-pending',
    screen: 'home',
    key: 'hint_home_pending',
    selector: '[data-testid="home-pending"]',
  },

  /* ── Полка ─────────────────────────────────────────────────────────────── */
  {
    id: 'h-shelf-add',
    screen: 'shelf',
    key: 'hint_shelf_add',
    selector: '[data-testid="shelf-add"]',
  },
  {
    id: 'h-add-form',
    screen: 'beanAdd',
    key: 'hint_add_form',
    selector: '[data-testid="bean-forms"]',
  },
  {
    id: 'h-add-photo',
    screen: 'beanAdd',
    key: 'hint_add_photo',
    selector: '[data-hint="bean-shots"]',
  },
  {
    id: 'h-add-roast',
    screen: 'beanAdd',
    key: 'hint_add_roast',
    selector: '[data-hint="bean-roast-row"]',
  },
  {
    id: 'h-bean-brews',
    screen: 'bean',
    key: 'hint_bean_brews',
    selector: '[data-testid="bean-brews"]',
  },

  /* ── Заваривание ───────────────────────────────────────────────────────── */
  {
    id: 'h-brew-fields',
    screen: 'brew',
    key: 'hint_brew_fields',
    selector: '[data-hint="brew-beans"]',
  },
  {
    id: 'h-brew-device',
    screen: 'brew',
    key: 'hint_brew_device',
    selector: '[data-hint="brew-devices"]',
  },
  /* Подсказка про диапазон имеет смысл только когда он приехал с конвертера —
     до этого зоны на экране нет. */
  {
    id: 'h-brew-grind',
    screen: 'brew',
    key: 'hint_brew_grind',
    selector: '[data-hint="brew-grind-hint"]',
  },
  {
    id: 'h-brew-outputs',
    screen: 'brew',
    key: 'hint_brew_outputs',
    selector: '[data-testid="brew-start"]',
  },
  {
    id: 'h-rate-later',
    screen: 'rateLater',
    key: 'hint_rate_later',
    selector: '[data-testid="rate-later"]',
  },

  /* ── Оценка ────────────────────────────────────────────────────────────── */
  {
    id: 'h-diag-scales',
    screen: 'diag',
    key: 'hint_diag_scales',
    selector: '[data-hint="diag-scales"]',
  },
  {
    id: 'h-diag-wheel',
    screen: 'diag',
    key: 'hint_diag_wheel',
    selector: '[data-testid="diag-to-wheel"]',
  },
  /* Кнопки «ГОЛОСОМ» нет там, где нет распознавания, — и подсказки тоже. */
  {
    id: 'h-diag-note',
    screen: 'diag',
    key: 'hint_diag_note',
    selector: '[data-hint="diag-note"]',
  },
  {
    id: 'h-wheel-nav',
    screen: 'wheel',
    key: 'hint_wheel_nav',
    selector: '[data-hint="wheel-stage"]',
  },
  {
    id: 'h-wheel-here',
    screen: 'wheel',
    key: 'hint_wheel_here',
    selector: '[data-testid="wheel-add-here"]',
  },
  {
    id: 'h-wheel-tag',
    screen: 'wheel',
    key: 'hint_wheel_tag',
    selector: '[data-testid="wheel-picked"] .bj-tag',
  },
  /* Точки памяти появляются только после первой оценённой записи. */
  {
    id: 'h-wheel-memory',
    screen: 'wheel',
    key: 'hint_wheel_memory',
    selector: '[data-testid^="wheel-mem-"]',
  },

  /* ── Конвертер ─────────────────────────────────────────────────────────── */
  {
    id: 'h-conv-from',
    screen: 'conv',
    key: 'hint_conv_from',
    selector: '[data-screen="conv"] .conv-picker__button',
  },
  {
    id: 'h-conv-band',
    screen: 'conv',
    key: 'hint_conv_band',
    selector: '[data-hint="conv-band"]',
  },
  {
    id: 'h-conv-cal',
    screen: 'conv',
    key: 'hint_conv_cal',
    selector: '[data-testid="conv-calibrate"]',
  },
  {
    id: 'h-conv-use',
    screen: 'conv',
    key: 'hint_conv_use',
    selector: '[data-testid="conv-use"]',
  },

  /* ── Журнал ────────────────────────────────────────────────────────────── */
  {
    id: 'h-log-filters',
    screen: 'log',
    key: 'hint_log_filters',
    selector: '[data-hint="log-filters"]',
  },
  {
    id: 'h-log-compare',
    screen: 'log',
    key: 'hint_log_compare',
    selector: '[data-testid="log-compare"]',
  },
  {
    id: 'h-detail-repeat',
    screen: 'detail',
    key: 'hint_detail_repeat',
    selector: '[data-testid="detail-repeat"]',
  },
  {
    id: 'h-detail-stages',
    screen: 'detail',
    key: 'hint_detail_stages',
    selector: '[data-hint="detail-stages"]',
  },
  {
    id: 'h-detail-qr',
    screen: 'detail',
    key: 'hint_detail_qr',
    selector: '[data-testid="detail-qr"]',
  },
  {
    id: 'h-compare-diff',
    screen: 'compare',
    key: 'hint_compare_diff',
    selector: '[data-hint="compare-rows"]',
  },

  /* ── Настройки ─────────────────────────────────────────────────────────── */
  {
    id: 'h-more-grinders',
    screen: 'more',
    key: 'hint_more_grinders',
    selector: '[data-testid="set-grinders"]',
  },
  {
    id: 'h-more-transfer',
    screen: 'more',
    key: 'hint_more_transfer',
    selector: '[data-testid="set-export"]',
  },
  {
    id: 'h-devices-new',
    screen: 'devices',
    key: 'hint_devices_new',
    selector: '[data-testid="device-new"]',
  },
  /* Заготовки показываются только у нового девайса. */
  {
    id: 'h-device-presets',
    screen: 'device',
    key: 'hint_device_presets',
    selector: '[data-hint="device-presets"]',
  },
  {
    id: 'h-device-flow',
    screen: 'device',
    key: 'hint_device_flow',
    selector: '[data-hint="device-flow"]',
  },
];
