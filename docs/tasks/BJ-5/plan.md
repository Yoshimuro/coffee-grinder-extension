# План — BJ-5

## Шаги
- S-1. `ui/screens/wheel/`: wheelItems(path) (уровни+светлота, тесты), WheelSvg (сектора+подписи+точки памяти+центр), крошки+canAddHere, зум-анимация (key+CSS), связка с picked-стором diag.
- S-2. memHit: liveQuery union дескрипторов done-записей (+кэш на рендер), тесты на фикстурах.
- S-3. Интеграция с diag (вход/выход, общий picked), e2e-смоук, скриншот-сверка.

## Проверка целиком
vitest + e2e-смоук + скриншоты против offline.html + корневой verify.
