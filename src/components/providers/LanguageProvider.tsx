import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { usePublicStudiosQuery } from '@graphql/hooks';
import i18n from '../../i18n';
import {
  ACTIVE_STUDIOS_STORAGE_KEY,
  DEFAULT_STUDIO,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
  studioForLanguage,
  type AppLanguage,
} from '../../i18n/config';
import { LanguageContext, type LanguageContextState } from './LanguageContext';

const applyDocumentLanguage = (language: AppLanguage) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
  }
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string');

/**
 * Active studios from the last visit, so a reload picks the right studio
 * before publicStudios answers. Without a cache, only the default studio is
 * assumed to exist.
 */
const readCachedStudios = (): string[] => {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(ACTIVE_STUDIOS_STORAGE_KEY) ?? 'null',
    );
    if (isStringArray(parsed)) return parsed;
  } catch {
    // Unavailable storage or a corrupt value: fall through to the default.
  }
  return [DEFAULT_STUDIO];
};

const cacheStudios = (slugs: readonly string[]) => {
  try {
    localStorage.setItem(ACTIVE_STUDIOS_STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    // Storage can be unavailable (private mode); the query still decides.
  }
};

export const LanguageProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // i18next's LanguageDetector has already resolved this from localStorage
  // (falling back to the browser locale) by the time we render.
  const { i18n: i18nInstance } = useTranslation();

  const [languageState, setLanguageState] = useState<AppLanguage>(() =>
    normalizeLanguage(i18nInstance.language),
  );

  const setLanguage = useCallback((next: AppLanguage) => {
    const normalized = normalizeLanguage(next);
    if (normalized === normalizeLanguage(i18n.language)) return;
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
      // The language decides the studio, so reload to start clean on the new
      // one: stream, chat socket and cached queries all belong to the old one.
      // The detector reads the saved choice back on load.
      window.location.reload();
      return;
    } catch {
      // Storage unavailable (private mode): a reload would lose the choice,
      // so switch in place instead.
    }
    void i18n.changeLanguage(normalized);
    applyDocumentLanguage(normalized);
    setLanguageState(normalized);
  }, []);

  // Keep local state in sync if the language changes elsewhere (e.g. dev tools).
  useEffect(() => {
    const handler = (lng: string) => setLanguageState(normalizeLanguage(lng));
    i18n.on('languageChanged', handler);
    applyDocumentLanguage(normalizeLanguage(i18n.language));
    return () => {
      i18n.off('languageChanged', handler);
    };
  }, []);

  // Which studios are on air decides which studio each language plays, so a
  // studio created or deactivated by an admin takes effect without a deploy.
  const { data: studiosData } = usePublicStudiosQuery({
    fetchPolicy: 'cache-and-network',
  });
  const fetchedSlugs = studiosData?.publicStudios.map((s) => s.studioId);
  const fetchedKey = fetchedSlugs?.join(',');
  const [cachedSlugs] = useState(readCachedStudios);

  useEffect(() => {
    if (fetchedKey !== undefined) cacheStudios(fetchedKey.split(','));
  }, [fetchedKey]);

  const activeStudios = useMemo(
    () =>
      new Set(fetchedKey === undefined ? cachedSlugs : fetchedKey.split(',')),
    [fetchedKey, cachedSlugs],
  );

  const value = useMemo<LanguageContextState>(() => {
    const studioFor = (lng: AppLanguage) =>
      studioForLanguage(lng, activeStudios);
    return {
      language: languageState,
      // Derived from the language, so it updates when the language changes.
      studioId: studioFor(languageState),
      languages: SUPPORTED_LANGUAGES,
      studioFor,
      setLanguage,
    };
  }, [languageState, activeStudios, setLanguage]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
