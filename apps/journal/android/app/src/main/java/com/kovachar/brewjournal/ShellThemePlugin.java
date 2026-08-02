package com.kovachar.brewjournal;

import android.app.UiModeManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.view.Window;

import androidx.appcompat.app.AppCompatDelegate;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Тема нативной оболочки (BJ-9).
 *
 * Веб-слой красит себя сам через `data-theme` и токены. Этому плагину досталось
 * то, до чего CSS не дотягивается: статус-бар, панель навигации, фон WebView и —
 * ради чего всё и затевалось — стартовое окно, которое система рисует ДО того,
 * как выполнится хоть строка кода приложения.
 *
 * Со стартовым окном нельзя справиться перекраской: когда наш код запускается,
 * оно уже нарисовано. Единственный рычаг — попросить систему запомнить
 * выбранный приложением night mode, чтобы она сама выбрала `values-night`
 * в следующий раз. Это `UiModeManager#setApplicationNightMode` (API 31+):
 * значение переживает перезапуск, и стартовое окно резолвится уже по нему.
 *
 * Отсюда же следует, почему `values-night/` здесь не ловушка, хотя обычно она
 * ею является. Сам по себе этот квалификатор следует СИСТЕМНОЙ теме и разошёлся
 * бы с явным выбором «светлая» на тёмном телефоне. Он работает правильно ровно
 * потому, что ставится в паре с `setApplicationNightMode`: тот переопределяет
 * конфигурацию приложения, и квалификатор начинает следовать нашему выбору, а
 * не системному. Разнимать эту пару нельзя.
 *
 * Три вызова вместо одного — это три разных горизонта:
 *   - `setApplicationNightMode` — следующий холодный старт (стартовое окно);
 *   - `AppCompatDelegate.setDefaultNightMode` — текущая сессия, чтобы ресурсы
 *     резолвились согласованно, если что-то попросит их прямо сейчас;
 *   - явная покраска окна — прямо сейчас и видимо. Без неё смена темы на живом
 *     приложении не доехала бы до статус-бара до перезапуска: в манифесте
 *     `configChanges` содержит `uiMode`, активность НЕ пересоздаётся (и хорошо:
 *     пересоздание перезагрузило бы WebView вместе со всем состоянием экрана),
 *     а значит тема активности заново не резолвится.
 *
 * SharedPreferences — для API 22–30, где `setApplicationNightMode` нет:
 * `MainActivity` читает их до `super.onCreate` и ставит night mode вручную.
 */
@CapacitorPlugin(name = "ShellTheme")
public class ShellThemePlugin extends Plugin {

    /** Свой файл, а не чужой: контракт этих двух строк принадлежит нам. */
    private static final String PREFS = "bj-shell";
    private static final String KEY_PREF = "theme";

    /** Совпадает с умолчанием `SettingsValues.theme` в вебе. */
    private static final String DEFAULT_PREF = "dark";

    @PluginMethod
    public void apply(PluginCall call) {
        final String pref = normalize(call.getString("pref", DEFAULT_PREF));
        final String color = call.getString("color", null);

        remember(getContext(), pref);

        // Окно и WebView — только с UI-потока; мост зовёт плагины не с него.
        getActivity().runOnUiThread(() -> {
            applyNightMode(getContext(), pref);
            paint(color);
        });

        call.resolve();
    }

    /* ── Части, которыми пользуется и MainActivity ───────────────────────── */

    /** Неизвестное значение — умолчание: чужая строка не должна ничего ломать. */
    static String normalize(String pref) {
        if ("light".equals(pref) || "dark".equals(pref) || "system".equals(pref)) return pref;
        return DEFAULT_PREF;
    }

    static void remember(Context context, String pref) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_PREF, pref).apply();
    }

    static String recall(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        return normalize(prefs.getString(KEY_PREF, DEFAULT_PREF));
    }

    /**
     * Ставит night mode обоими доступными способами.
     *
     * Оба идемпотентны: `setDefaultNightMode` выходит сразу, если режим не
     * изменился, поэтому вызывать это на каждом монтировании React безопасно.
     */
    static void applyNightMode(Context context, String pref) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            UiModeManager modes = (UiModeManager) context.getSystemService(Context.UI_MODE_SERVICE);
            if (modes != null) modes.setApplicationNightMode(uiModeFor(pref));
        }
        AppCompatDelegate.setDefaultNightMode(delegateModeFor(pref));
    }

    private static int uiModeFor(String pref) {
        if ("light".equals(pref)) return UiModeManager.MODE_NIGHT_NO;
        if ("system".equals(pref)) return UiModeManager.MODE_NIGHT_AUTO;
        return UiModeManager.MODE_NIGHT_YES;
    }

    private static int delegateModeFor(String pref) {
        if ("light".equals(pref)) return AppCompatDelegate.MODE_NIGHT_NO;
        if ("system".equals(pref)) return AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM;
        return AppCompatDelegate.MODE_NIGHT_YES;
    }

    /* ── Немедленная покраска ────────────────────────────────────────────── */

    private void paint(String color) {
        if (color == null) return;

        final int value;
        try {
            value = Color.parseColor(color);
        } catch (IllegalArgumentException broken) {
            // Цвет пришёл из веба строкой; кривая строка — не повод падать.
            return;
        }

        if (bridge != null && bridge.getWebView() != null) {
            /* Фон WebView, а не только окна: это тот самый кадр между окном
               активности и первой отрисовкой страницы. `capacitor.config.ts`
               умеет красить его лишь статически, одним цветом на сборку. */
            bridge.getWebView().setBackgroundColor(value);
        }

        Window window = getActivity().getWindow();
        window.setStatusBarColor(value);
        window.setNavigationBarColor(value);

        /* Полярность значков считаем по светлоте фона, а не по названию темы:
           если фон когда-нибудь перестанет совпадать с `--bg`, значки всё равно
           останутся видимыми. */
        boolean lightBars = isLight(value);
        WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(window);
        bars.setAppearanceLightStatusBars(lightBars);
        bars.setAppearanceLightNavigationBars(lightBars);
    }

    /** Порог по воспринимаемой яркости; сама формула — обычная luma Rec. 601. */
    private static boolean isLight(int color) {
        double luma =
                0.299 * Color.red(color) + 0.587 * Color.green(color) + 0.114 * Color.blue(color);
        return luma > 128.0;
    }
}
