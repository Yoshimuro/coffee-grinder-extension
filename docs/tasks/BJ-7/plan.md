# План — BJ-7

- S-1. `cd android && ./gradlew assembleDebug` (JAVA_HOME/SDK из Android Studio); зафиксировать путь APK.
- S-2. Эмулятор: найти AVD (`emulator -list-avds`); если есть — boot, `adb install`, запуск, smoke (home/менее хрупкие экраны скриншотами adb). Нет AVD — отметить, перенести в QA-чеклист.
- S-3. Пиксельная сверка: Playwright открывает offline.html (variant C, RU) и приложение (dev-сервер), скриншоты 393×852 попарно: home, conv, shelf, brew, timer, diag, wheel, log, detail, more → `docs/tasks/BJ-7/pixel/`; opus-ревьюер с чтением изображений пишет протокол (что совпало/расхождения/вердикт).
- S-4. qa_checklist_ru.md + MORNING.md.

## Проверка целиком
AC-1..AC-5.
