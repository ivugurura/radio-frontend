import { createContext, useContext } from 'react';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  STUDIO_BY_LANGUAGE,
  type AppLanguage,
} from '../../i18n/config';

export interface LanguageContextState {
  /** Currently selected UI language. */
  language: AppLanguage;
  /** Studio slug bound to the current language (stations are language specific). */
  studioId: string;
  /** All selectable languages. */
  languages: readonly AppLanguage[];
  /** Switch language + station; persisted for reload / refresh / reopen. */
  setLanguage: (language: AppLanguage) => void;
}

export const initialLanguageState: LanguageContextState = {
  language: DEFAULT_LANGUAGE,
  studioId: STUDIO_BY_LANGUAGE[DEFAULT_LANGUAGE],
  languages: SUPPORTED_LANGUAGES,
  setLanguage: () => {},
};

export const LanguageContext =
  createContext<LanguageContextState>(initialLanguageState);

export function useLanguage() {
  return useContext(LanguageContext);
}

/** Convenience hook for the studio-scoped queries/mutations/sockets. */
export function useStudioId(): string {
  return useContext(LanguageContext).studioId;
}
