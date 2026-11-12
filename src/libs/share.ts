import { LANGUAGE_QUERY_PARAM, type AppLanguage } from '../i18n/config';

/**
 * Link to the public page in the sharer's language. Language decides the
 * studio, so whoever opens it hears what the sharer is hearing.
 */
export const buildShareUrl = (language: AppLanguage): string => {
  const url = new URL('/', window.location.origin);
  url.searchParams.set(LANGUAGE_QUERY_PARAM, language);
  return url.toString();
};

export const whatsAppShareUrl = (message: string, url: string): string =>
  `https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`;

export const facebookShareUrl = (url: string): string =>
  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
