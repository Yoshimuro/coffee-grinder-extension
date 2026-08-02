/**
 * Тема: разрешение выбора, применение к документу и подписка на настройку.
 *
 * Тема живёт в трёх местах, и это не дублирование, а три разных момента
 * времени:
 *   - `settings.theme` в IndexedDB — источник правды, но отвечает асинхронно;
 *   - зеркало в `localStorage` — единственное, что можно прочесть синхронно,
 *     то есть до первого кадра. Его читает инлайн-скрипт в `index.html`;
 *   - night mode, запомненный системой, — единственное, что доживает до
 *     СЛЕДУЮЩЕГО холодного старта и успевает покрасить стартовое окно APK.
 *
 * Здесь они сводятся вместе: база ведёт, зеркало и оболочка догоняют.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';

import { DEFAULT_SETTINGS, writeThemeMirror } from '../db/repo/settings.js';
import { type Theme, type ThemePref, getSetting } from '../db/schema.js';
import { shellTheme } from '../platform/shell-theme.js';

/**
 * Чем красить полоску браузера и фон WebView. Значения — `--bg` каждой темы из
 * `tokens.css`, в верхнем регистре, как их пишет Android.
 *
 * Эти же два хекса продублированы в инлайн-скрипте `index.html` (он выполняется
 * до бандла, и импортировать оттуда нечего). Расхождение ловит
 * `tests/unit/theme.test.ts`.
 */
export const THEME_COLOR: Record<Theme, string> = {
  dark: '#0C0C0C',
  light: '#F7F7F4',
};

/** Медиазапрос системной темы. Спрашиваем про светлую: тёмная — умолчание. */
export const LIGHT_QUERY = '(prefers-color-scheme: light)';

/** Выбор → то, что реально применяется. Чистая, поэтому и тестируется. */
export function resolveTheme(pref: ThemePref, systemLight: boolean): Theme {
  if (pref === 'system') return systemLight ? 'light' : 'dark';
  return pref;
}

/** Читает системную тему. В окружении без `matchMedia` — тёмная. */
export function systemPrefersLight(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(LIGHT_QUERY).matches;
}

/**
 * Ставит тему документу: атрибут переключает блоки токенов, `theme-color`
 * объясняет цвет браузерной полоске и панели задач установленной PWA.
 */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

/**
 * Держит документ и нативную оболочку в согласии с настройкой.
 *
 * Ловушка, ради которой этот хук выглядит сложнее очевидного: `useSetting`
 * отдаёт дефолт (`dark`), пока Dexie ещё не ответила. Наивный эффект на его
 * значении вернул бы светлого пользователя в тёмную ровно на один кадр — то
 * есть вернул бы то самое мигание, которое убирает инлайн-скрипт, и увидели бы
 * его только те, кто светлую тему и попросил.
 *
 * Отличить «база молчит» от «ключа нет» можно только по обёртке: `useLiveQuery`
 * отдаёт `undefined` до первого ответа, а `getSetting` — для отсутствующего
 * ключа. Завёрнутый в объект результат разводит эти два случая.
 */
export function useThemeAttribute(): void {
  const answer = useLiveQuery(async () => ({ pref: await getSetting('theme') }), []);
  const [systemLight, setSystemLight] = useState(systemPrefersLight);

  /* Системная тема может смениться при живом приложении — в режиме `system`
     это обязано доехать без перезапуска. */
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(LIGHT_QUERY);
    const onChange = (event: MediaQueryListEvent): void => setSystemLight(event.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    // База молчит — на документе уже стоит то, что поставил инлайн-скрипт.
    if (answer === undefined) return;

    const pref = answer.pref ?? DEFAULT_SETTINGS.theme;
    const applied = resolveTheme(pref, systemLight);

    /* Зеркало пишется и здесь, а не только в `setTheme`: импорт архива
       (`db/transfer.ts`) чистит таблицу настроек и кладёт содержимое файла, а в
       архивах до BJ-9 ключа `theme` нет. Эта строка чинит зеркало после такого
       импорта, вместо того чтобы оставить его врать до следующей смены темы. */
    writeThemeMirror(pref);
    applyTheme(applied);
    void shellTheme.apply(pref, THEME_COLOR[applied]);
  }, [answer, systemLight]);
}
