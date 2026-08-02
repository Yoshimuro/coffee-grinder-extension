package com.kovachar.brewjournal;

import android.os.Bundle;

import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

/**
 * Активность перестала быть пустой в BJ-9, и обе строки в ней — про один кадр.
 *
 * `ShellThemePlugin` лежит в модуле приложения, а не приходит из npm, поэтому
 * мост о нём не знает: локальные плагины регистрируются руками.
 *
 * Night mode ставится ДО `super.onCreate` намеренно. Именно там создаётся окно
 * активности и резолвится её тема, то есть `windowBackground` — тот фон, что
 * виден между стартовым окном и первой отрисовкой WebView. После
 * `super.onCreate` это уже поздно.
 *
 * На API 31+ вызов почти всегда лишний: систему уже попросили запомнить night
 * mode приложения (`UiModeManager#setApplicationNightMode`), и она применила
 * его ещё к стартовому окну. Он остаётся ради API 22–30, где такой памяти нет и
 * где SharedPreferences — единственный способ узнать выбор до первого кадра.
 * Честный остаток на этих версиях: самое первое стартовое окно после смены темы
 * всё-таки рисуется по системному uiMode — его выбирает система до запуска
 * процесса, и дотянуться туда нечем.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ShellThemePlugin.class);
        ShellThemePlugin.applyNightMode(this, ShellThemePlugin.recall(this));
        super.onCreate(savedInstanceState);

        /*
         * Фон WebView — последний кадр, который ещё мог мигнуть: `backgroundColor`
         * из `capacitor.config.ts` один на сборку и покрасить его по выбору не
         * умеет.
         *
         * Цвет берётся ресурсом, а не хексом: night mode уже выставлен строкой
         * выше, поэтому `bjBackground` резолвится в нужный из двух `colors.xml`
         * сам. Дублировать палитру в Java не требуется — и не нужно.
         */
        int background = ContextCompat.getColor(this, R.color.bjBackground);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setBackgroundColor(background);
        }
    }
}
