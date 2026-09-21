import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import i18n from '../../i18n';
import {
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  // STUDIO_BY_LANGUAGE,
  normalizeLanguage,
  type AppLanguage,
} from '../../i18n/config';
import { LanguageContext, type LanguageContextState } from './LanguageContext';

const applyDocumentLanguage = (language: AppLanguage) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
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
    void i18n.changeLanguage(normalized);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
    } catch {
      // Storage can be unavailable (private mode); detection still keeps it for the session.
    }
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

  const value = useMemo<LanguageContextState>(
    () => ({
      language: languageState,
      // The studio ID is derived from the language, so it updates automatically when the language changes.
      // studioId: STUDIO_BY_LANGUAGE[language],
      studioId: 'reformation-rw',
      languages: SUPPORTED_LANGUAGES,
      setLanguage,
    }),
    [languageState, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
