# apps/journal/src

Каркас поставлен в BJ-2. Целевая раскладка — `docs/brew-journal-design.md` §5;
ниже то, что существует сейчас.

| Каталог | Содержимое |
|---|---|
| `app/` | `nav.ts` — нав-стек zustand (`screen + stack`, `go/back/setTab`), union из 17 экранов |
| `data/` | порт `data.js` (BJ-3): `wheel.ts` (WHEEL/DESC/цвета), `traits.ts`, `strings.ts` (STR ru/en), `freshness.ts`, `advice.ts`, `seeds.ts` (демо за dev-флагом) |
| `db/` | `schema.ts` — Dexie v1 (контракт, версии только добавляются), `seed.ts` — первый запуск |
| `domain/` | чистая логика (BJ-3): `stages.ts`, `timer.ts`, `calibration.ts`, `convert.ts` (обёртка `@coffee/core`), `format.ts`, `geometry.ts` |
| `ui/` | `tokens.css` (токены хендоффа), `App.tsx`, `components/`, `screens/` — 17 заглушек |

Ещё не создано: `platform/` (BJ-6). Экраны к домену не подключены — это BJ-4/BJ-5.
