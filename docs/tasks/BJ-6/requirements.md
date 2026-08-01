# Требования — BJ-6: Capacitor-интеграция

## Контекст
После BJ-4/BJ-5 (веб-прототип работает, platform-интерфейсы с web-фолбэками готовы). Первоисточник: `CLAUDE_CODE_TASK.md` (стек, хранение, бюджет), спека §5-6.

## В скоупе
- Capacitor 6: init + `cap add android`; конфиг (тёмный статус-бар, safe-area, `webContentsDebuggingEnabled` dev-only), минимальные иконка/сплэш (тёмные, без граф. излишеств).
- Плагины: `@capacitor/camera` (полка: quality 80, width 2048 — даунскейл нативный), `@capacitor/filesystem` (фото в Directory.Data; экспорт/импорт), `@capacitor/share`, `@capacitor/local-notifications` («оценка ждёт» после заваривания), `@capacitor-community/keep-awake` (только экран таймера), `@capacitor-community/speech-recognition` (при недоступности офлайн — молча клавиатура).
- `platform/*` capacitor-реализации за существующими интерфейсами BJ-4; переключение `Capacitor.isNativePlatform()`; web-фолбэки остаются.
- Экспорт/импорт: JSON schema v1 (contracts.md) + фото; zip через JSZip (кроссплатформенно, без нативного плагина); импорт: валидация version, полное восстановление включая файлы фото; экспорт через Share.
- Настоящий QR: библиотека-энкодер без зависимостей от сети (например `uqr`/`qrcode-generator`), payload v1 из contracts.md; рендер SVG на detail.
- PWA-готовность: manifest (dark, standalone), service worker (precache бандла), приложение работает в браузере без Capacitor.
- Уведомление после ГОТОВО (rateLater «ПОЗЖЕ») → LocalNotifications с разумной задержкой остывания (15 мин), тап открывает pending-оценку.

## Вне скоупа
Сборка/прогон APK и DoD (BJ-7); iOS-проект (закладываемся, не создаём).

## Критерии приёмки
- AC-1: `npm run -w @coffee/journal build && npx cap sync android` без ошибок; android/ проект генерируется.
- AC-2: web-режим не деградировал: build+тесты+e2e-смоук зелёные, фолбэки работают (голос молча недоступен, камера = file input).
- AC-3: экспорт в браузере даёт zip с базой+фото; импорт этого zip в чистый профиль восстанавливает всё (e2e-тест).
- AC-4: QR на detail сканируется (декод в тесте библиотекой), payload соответствует контракту №3.
- AC-5: ни одного сетевого запроса (грепы + отсутствие внешних URL в manifest/SW).
- AC-6: корневой verify зелёный.
