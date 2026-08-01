# Контракты — BJ-6 (здесь СОЗДАЮТСЯ контракты №2 и №3)

## Контракт №2 — экспортный формат v1
Zip-архив `brew-journal-export.zip`:
- `data.json`: `{ "version": 1, "exportedAt": ISO, "settings": {...}, "grinders": [...], "devices": [...], "beans": [...], "entries": [...] }` — записи в формате Dexie v1; `beans[].photos[].path` — относительные пути внутри zip (`photos/<beanId>/<n>.webp`), `thumb` — data-URL остаётся в JSON (мал).
- `photos/**` — файлы фото как есть.
Импорт: проверка `version` (неизвестная → отказ с сообщением, без частичного импорта), транзакционная замена базы, восстановление файлов. Любое будущее изменение формата — `version: 2` + читатель v1.

## Контракт №3 — QR-payload рецепта v1
Компактный JSON: `{ "v": 1, "t": "recipe", "mode": Mode, "grind": number|null, "dose": number|null, "water": number, "temp": number, "pours"?: number, "valveAt"?: number, "bean"?: string (имя, не id), "stages"?: [[key,sec,water],...] (плановые) }`. Без персональных id (переносимость между устройствами). Ёмкость QR: цель < 500 байт — stages включаются только если влезают (иначе опускаются).

## Используются, не меняются
Dexie v1, реестры id, схема Grinder ядра. Пиксельная сверка — не затрагивается.
