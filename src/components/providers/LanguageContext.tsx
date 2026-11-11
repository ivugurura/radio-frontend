import { createContext, useContext } from 'react';
import {
  DEFAULT_LANGUAGE,
  DEFAULT_STUDIO,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
} from '../../i18n/config';

export interface LanguageContextState {
  /** Currently selected UI language. */
  language: AppLanguage;
  /** Studio slug bound to the current language (stations are language specific). */
  studioId: string;
  /** All selectable languages. */
  languages: readonly AppLanguage[];
  /** Studio a language plays, given which studios are active right now. */
  studioFor: (language: AppLanguage) => string;
  /** Switch language + station; persisted for reload / refresh / reopen. */
  setLanguage: (language: AppLanguage) => void;
}

export const initialLanguageState: LanguageContextState = {
  language: DEFAULT_LANGUAGE,
  studioId: DEFAULT_STUDIO,
  languages: SUPPORTED_LANGUAGES,
  studioFor: () => DEFAULT_STUDIO,
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
