# apps/journal/src

Каркас поставлен в BJ-2. Целевая раскладка — `docs/brew-journal-design.md` §5;
ниже то, что существует сейчас.

| Каталог | Содержимое |
|---|---|
| `app/` | `nav.ts` — нав-стек zustand (`screen + stack`, `go/back/setTab`), union из 17 экранов |
| `db/` | `schema.ts` — Dexie v1 (контракт, версии только добавляются), `seed.ts` — первый запуск |
| `ui/` | `tokens.css` (токены хендоффа), `App.tsx`, `components/`, `screens/` — 17 заглушек |

Ещё не создано: `domain/` (BJ-3), `data/` (BJ-3), `platform/` (BJ-6).
