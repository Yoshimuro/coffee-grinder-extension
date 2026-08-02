# apps/journal/src

Каркас поставлен в BJ-2, экраны — в BJ-4/BJ-5, нативная обёртка — в BJ-6.
Целевая раскладка — `docs/brew-journal-design.md` §5; ниже то, что есть сейчас.

| Каталог | Содержимое |
|---|---|
| `app/` | `nav.ts` — нав-стек zustand (`screen + stack`, `go/back/setTab`), union из 17 экранов |
| `data/` | порт `data.js` (BJ-3): `wheel.ts` (WHEEL/DESC/цвета), `traits.ts`, `strings.ts` (STR ru/en), `freshness.ts`, `advice.ts`, `seeds.ts` (демо за dev-флагом) |
| `db/` | `schema.ts` — Dexie v1 (контракт, версии только добавляются), `seed.ts` — первый запуск, `repo/` — доступ к таблицам, `transfer.ts` — экспорт/импорт базы (контракт №2) |
| `domain/` | чистая логика (BJ-3): `stages.ts`, `timer.ts`, `calibration.ts`, `convert.ts` (обёртка `@coffee/core`), `format.ts`, `geometry.ts` |
| `platform/` | BJ-6: интерфейсы с веб-реализацией плюс `*.capacitor.ts` за ними — фото, файлы, голос, уведомления, keep-awake; выбор в `native.ts` |
| `pwa/` | BJ-6: `register.ts` — условия регистрации service worker'а (сам воркер генерирует `vite.config.ts`) |
| `ui/` | `tokens.css` (токены хендоффа), `App.tsx`, `components/`, `screens/` — 17 экранов |
