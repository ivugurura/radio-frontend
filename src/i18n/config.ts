/**
 * Language <-> station wiring.
 *
 * Stations are language specific: each supported UI language maps to exactly
 * one studio slug on the backend. Selecting a language in the UI therefore also
 * switches the active studio for every studio-scoped query/mutation/socket.
 */

export const SUPPORTED_LANGUAGES = ['rw', 'en', 'fr', 'sw'] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = 'rw';

/** localStorage key i18next's language detector reads/writes. */
export const LANGUAGE_STORAGE_KEY = 'app-language';

/** Query param that carries the language in shared links (`/?lang=fr`). */
export const LANGUAGE_QUERY_PARAM = 'lang';

/** Studio played for a language that has no active studio of its own. */
export const DEFAULT_STUDIO = DEFAULT_LANGUAGE;

/** localStorage key caching the active studio slugs from the last visit. */
export const ACTIVE_STUDIOS_STORAGE_KEY = 'active-studios';

/**
 * Studio that serves a language. Studios are named after their language, so a
 * language plays its own studio while that studio is active and the default
 * studio otherwise (not created yet, or deactivated).
 */
export const studioForLanguage = (
  language: AppLanguage,
  activeStudios: ReadonlySet<string>,
): string => (activeStudios.has(language) ? language : DEFAULT_STUDIO);

/** Native label shown in the language selector. */
export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  rw: 'Ikinyarwanda',
  en: 'English',
  fr: 'Français',
  sw: 'Kiswahili',
};

/** Short code shown in compact selectors. */
export const LANGUAGE_SHORT_LABELS: Record<AppLanguage, string> = {
  rw: 'RW',
  en: 'EN',
  fr: 'FR',
  sw: 'SW',
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
