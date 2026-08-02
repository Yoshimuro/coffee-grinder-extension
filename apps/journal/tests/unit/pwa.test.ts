/**
 * Условия регистрации service worker'а.
 *
 * Главный из них — R-3: внутри APK страница отдаётся по `https://localhost`,
 * то есть выглядит как защищённый контекст, и воркер зарегистрировался бы
 * поверх ассетов приложения. Тест держит именно это: `native: true` запрещает
 * регистрацию при любом сочетании остальных условий.
 */

import { describe, expect, it } from 'vitest';

import { isSecureOrigin, shouldRegister } from '../../src/pwa/register.js';

const PWA = {
  origin: { protocol: 'https:', hostname: 'brew.example' },
  native: false,
  production: true,
  supported: true,
};

describe('защищённый контекст', () => {
  it('https и петлевые адреса — да, всё остальное — нет', () => {
    expect(isSecureOrigin({ protocol: 'https:', hostname: 'brew.example' })).toBe(true);
    expect(isSecureOrigin({ protocol: 'http:', hostname: 'localhost' })).toBe(true);
    expect(isSecureOrigin({ protocol: 'http:', hostname: '127.0.0.1' })).toBe(true);
    expect(isSecureOrigin({ protocol: 'http:', hostname: 'brew.example' })).toBe(false);
    expect(isSecureOrigin({ protocol: 'file:', hostname: '' })).toBe(false);
  });
});

describe('регистрация', () => {
  it('в собранной PWA — ставится', () => {
    expect(shouldRegister(PWA)).toBe(true);
  });

  it('в WebView Capacitor — никогда, хотя схема там https (R-3)', () => {
    expect(
      shouldRegister({ ...PWA, native: true, origin: { protocol: 'https:', hostname: 'localhost' } }),
    ).toBe(false);
  });

  it('в dev-сервере — нет: файла воркера там нет, а кеш пережил бы перезапуск', () => {
    expect(shouldRegister({ ...PWA, production: false })).toBe(false);
  });

  it('без поддержки браузером и вне защищённого контекста — нет', () => {
    expect(shouldRegister({ ...PWA, supported: false })).toBe(false);
    expect(
      shouldRegister({ ...PWA, origin: { protocol: 'http:', hostname: 'brew.example' } }),
    ).toBe(false);
  });
});
