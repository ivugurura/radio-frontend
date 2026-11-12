import { LANGUAGE_LABELS, isSupportedLanguage } from '../../i18n/config';

/** "English (en)" for a studio slug, which is its language code. */
export const studioLanguageLabel = (slug: string) => {
  if (!isSupportedLanguage(slug)) return slug;
  return `${LANGUAGE_LABELS[slug]} (${slug})`;
};
