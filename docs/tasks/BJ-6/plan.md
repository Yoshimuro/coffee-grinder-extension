# План — BJ-6

- S-1. Зависимости + `capacitor.config.ts` + `npx cap init/add android` (webDir apps/journal/dist); конфиг статус-бара/safe-area; иконка+сплэш.
- S-2. `platform/*.capacitor.ts`: camera (getPhoto→файл+thumb), files, notify (schedule после rateLater-ПОЗЖЕ, 15 мин), keepawake (enter/exit таймера), speech (available()→listen, недоступно → интерфейс отвечает «нет» молча), share. Свитч по isNativePlatform.
- S-3. Экспорт/импорт: сериализация Dexie→data.json, JSZip упаковка с фото, Share; импорт с валидацией version и транзакционной заменой; e2e-тест в web.
- S-4. QR: энкодер (offline lib), payload-билдер по контракту №3, SVG-рендер на detail; юнит-тест payload+декод.
- S-5. PWA: manifest, SW precache, проверка запуска в браузере.
- S-6. Прогоны: journal test/build, cap sync, корневой verify; dev_notes.

## Проверка целиком
AC-1..AC-6 из requirements.md.
