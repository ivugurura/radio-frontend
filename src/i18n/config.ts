/**
 * Language <-> station wiring.
 *
 * Stations are language specific: each supported UI language maps to exactly
 * one studio slug on the backend. Selecting a language in the UI therefore also
 * switches the active studio for every studio-scoped query/mutation/socket.
 */

export const SUPPORTED_LANGUAGES = ['rw', 'en'] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = 'rw';

/** localStorage key i18next's language detector reads/writes. */
export const LANGUAGE_STORAGE_KEY = 'app-language';

/** Studio slug that serves each language. */
export const STUDIO_BY_LANGUAGE: Record<AppLanguage, string> = {
  rw: 'reformation-rw',
  en: 'reformation-en',
};

/** Native label shown in the language selector. */
export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  rw: 'Ikinyarwanda',
  en: 'English',
};

/** Short code shown in compact selectors. */
export const LANGUAGE_SHORT_LABELS: Record<AppLanguage, string> = {
  rw: 'RW',
  en: 'EN',
};

export const isSupportedLanguage = (value: unknown): value is AppLanguage =>
  typeof value === 'string' &&
  (SUPPORTED_LANGUAGES as readonly string[]).includes(value);

/** Normalise anything (e.g. `en-US`, `RW`, undefined) to a supported language. */
export const normalizeLanguage = (value: unknown): AppLanguage => {
  if (typeof value === 'string') {
    const primary = value.toLowerCase().split('-')[0];
    if (isSupportedLanguage(primary)) return primary;
  }
  return DEFAULT_LANGUAGE;
};

export const studioForLanguage = (value: unknown): string =>
  STUDIO_BY_LANGUAGE[normalizeLanguage(value)];
