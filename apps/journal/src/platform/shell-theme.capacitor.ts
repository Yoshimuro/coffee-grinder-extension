/**
 * Тема нативной оболочки на телефоне.
 *
 * Плагин здесь свой и лежит в самом модуле приложения
 * (`android/app/src/main/java/com/kovachar/brewjournal/ShellThemePlugin.java`),
 * а не взят из npm. Причины две. Первая: нужного вызова —
 * `UiModeManager.setApplicationNightMode()` — нет ни в одном официальном
 * плагине, а без него стартовое окно так и останется тёмным. Вторая: единственная
 * альтернатива, `@capacitor/preferences`, дала бы только запись ключа, и читать
 * его нативно пришлось бы через внутреннее имя её SharedPreferences-файла —
 * то есть зависеть от чужой детали реализации там, где можно иметь свой
 * контракт из двадцати строк.
 *
 * `registerPlugin` возвращает прокси и сам по себе ничего не вызывает, поэтому
 * отсутствие плагина в конкретной сборке проявится только на `apply()` — и там
 * оно проглатывается: тема не должна ронять приложение.
 *
 * TODO(iOS): этот файл сам по себе кросс-платформенный — `registerPlugin` найдёт
 * плагин с тем же именем и на iOS, — но нативной половины там нет, и написать её
 * придётся отдельно. Android-решение туда не переносится: `values-night/` и
 * `UiModeManager` у iOS нет, статус-бар прозрачен поверх WebView и красится не
 * цветом, а `UIStatusBarStyle`, а роль двух наборов ресурсов играет
 * `UITraitCollection.userInterfaceStyle` (её задают на окне
 * `overrideUserInterfaceStyle`) вместе со светлым и тёмным splash-сторибордом.
 */

import { registerPlugin } from '@capacitor/core';

import type { ThemePref } from '../db/schema.js';

import type { ShellTheme } from './shell-theme.js';

interface ShellThemePlugin {
  apply(options: { pref: ThemePref; color: string }): Promise<void>;
}

const Native = registerPlugin<ShellThemePlugin>('ShellTheme');

export function createCapacitorShellTheme(): ShellTheme {
  return {
    async apply(pref, color): Promise<void> {
      await Native.apply({ pref, color }).catch(() => undefined);
    },
  };
}
