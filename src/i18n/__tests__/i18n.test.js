import { describe, it, expect, beforeAll } from 'vitest';
import en from '../locales/en.json';
import hi from '../locales/hi.json';

describe('i18n translations', () => {
  // ─── English translations ──────────────────────────────────────────────────

  it('English translation file is defined and non-empty', () => {
    expect(en).toBeDefined();
    expect(Object.keys(en).length).toBeGreaterThan(0);
  });

  it('English nav section contains required keys', () => {
    expect(en.nav.dashboard).toBe('Dashboard');
    expect(en.nav.properties).toBe('Properties');
    expect(en.nav.tenants).toBe('Tenants');
    expect(en.nav.rent).toBe('Rent');
    expect(en.nav.logout).toBe('Logout');
  });

  it('English pageTitles section is defined', () => {
    expect(en.pageTitles).toBeDefined();
    expect(en.pageTitles['/']).toBe('Dashboard');
  });

  // ─── Hindi translations ────────────────────────────────────────────────────

  it('Hindi translation file is defined and non-empty', () => {
    expect(hi).toBeDefined();
    expect(Object.keys(hi).length).toBeGreaterThan(0);
  });

  it('Hindi has the same top-level sections as English', () => {
    const enSections = Object.keys(en).sort();
    const hiSections = Object.keys(hi).sort();
    expect(hiSections).toEqual(enSections);
  });

  it('Hindi nav section contains required keys', () => {
    expect(hi.nav.dashboard).toBeDefined();
    expect(hi.nav.properties).toBeDefined();
    expect(hi.nav.logout).toBeDefined();
  });

  it('Hindi nav values are different from English (actually translated)', () => {
    // At least one key should differ — confirms it is not a copy
    const hasDifference = Object.keys(en.nav).some(
      (k) => hi.nav[k] !== en.nav[k]
    );
    expect(hasDifference).toBe(true);
  });

  // ─── Coverage parity ────────────────────────────────────────────────────────

  it('Hindi nav has at least as many keys as English nav', () => {
    expect(Object.keys(hi.nav).length).toBeGreaterThanOrEqual(
      Object.keys(en.nav).length
    );
  });

  it('Hindi pageTitles section exists', () => {
    expect(hi.pageTitles).toBeDefined();
  });

  // ─── i18next config ────────────────────────────────────────────────────────

  it('i18n module initializes without error', async () => {
    const { default: i18n } = await import('../index.js');
    expect(i18n).toBeDefined();
    expect(typeof i18n.t).toBe('function');
  });

  it('i18n translates a known English key', async () => {
    const { default: i18n } = await import('../index.js');
    await i18n.changeLanguage('en');
    expect(i18n.t('nav.dashboard')).toBe('Dashboard');
  });

  it('i18n falls back to English for unknown language', async () => {
    const { default: i18n } = await import('../index.js');
    await i18n.changeLanguage('zz'); // unknown language
    expect(i18n.t('nav.dashboard')).toBe('Dashboard');
  });

  it('i18n returns key itself when key does not exist', async () => {
    const { default: i18n } = await import('../index.js');
    await i18n.changeLanguage('en');
    expect(i18n.t('nonexistent.key.xyz')).toBe('nonexistent.key.xyz');
  });

  it('i18n switches to Hindi successfully', async () => {
    const { default: i18n } = await import('../index.js');
    await i18n.changeLanguage('hi');
    const result = i18n.t('nav.dashboard');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
