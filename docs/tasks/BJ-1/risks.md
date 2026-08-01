# Риски — BJ-1

| ID | Риск | Серьёзность | Триггер | Митигация |
|---|---|---|---|---|
| R-1 | e2e ломаются из-за захардкоженных путей к dataset.json/dist | med | fixtures.ts:87-95, screenshot.mjs | явный шаг S-3; verify гоняет e2e |
| R-2 | vite-плагин копирования манифеста теряет путь после переезда root | med | vite.config.ts:13-21 | пакетный vite.config + AC-2 |
| R-3 | workspaces ломают резолв JSON-импорта датасета (resolveJsonModule) | low | tsconfig пакета | пакетные tsconfig с наследованием от корневого |
| R-4 | забытые файлы на старых путях (src/, tests/ остатки) | low | невнимательный перенос | git status-проверка в конце плана |
