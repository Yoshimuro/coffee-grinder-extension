# План — BJ-9

- S-1. `tokens.css`: разбить `:root` на общий блок (шрифт, шкала, сетка,
  safe-area, `--wheel-*`) и два цветовых — тёмный и светлый. Прогнать все экраны,
  переключая `data-theme` руками, до единой строчки TypeScript.
- S-2. Настройка: `ThemePref`/`Theme` и ключ `theme` в `schema.ts`; дефолт,
  `useTheme`, `setTheme`, зеркало в `repo/settings.ts`; сид в `seed.ts`.
- S-3. `ui/theme.ts` (`resolveTheme`, `applyTheme`, `useThemeAttribute`) + вызов
  из `App.tsx`; инлайн-скрипт и мета-теги в `index.html`.
- S-4. Строки и ряд темы в `More.tsx`; `testId` у `Chip`; `.bj-set__lang` →
  `.bj-set__chips`.
- S-5. Точечное: `wheel.css` (выделение сектора + два литерала в токены),
  `MiniWheel` (шов правилом, а не атрибутом), `QrSvg` (константы + причина),
  `Spec.tsx` (15 токенов вместо 10).
- S-6. Нативная оболочка: `ShellThemePlugin` + `MainActivity`, платформенный
  интерфейс `shell-theme.ts` / `shell-theme.capacitor.ts`, `values/` и
  `values-night/` (colors, bools), `styles.xml` на `DayNight`, `icons.mjs` —
  splash в двух темах.
- S-7. Тесты: три существующих счётчика, новый `tests/unit/theme.test.ts`, новый
  `tests/e2e/theme.spec.ts`.
- S-8. `scripts/screens.mjs` + `npm run screenshot -w @coffee/journal`;
  документация и это досье.

## Проверка целиком

AC-1..AC-5 (`requirements.md`). Веб-часть проверена полностью; нативная — только
вычиткой, см. «Не проверено» в `risks.md`.
