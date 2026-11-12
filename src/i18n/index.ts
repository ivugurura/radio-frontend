import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_QUERY_PARAM,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  type AppLanguage,
} from './config';

import enCommon from './locales/en/common.json';
import enHome from './locales/en/home.json';
import enAuth from './locales/en/auth.json';
import enLayout from './locales/en/layout.json';
import enDashboard from './locales/en/dashboard.json';
import enListeners from './locales/en/listeners.json';
import enStreaming from './locales/en/streaming.json';
import enChat from './locales/en/chat.json';
import enAudio from './locales/en/audio.json';
import enSettings from './locales/en/settings.json';
import enUsers from './locales/en/users.json';
import enStudios from './locales/en/studios.json';

import rwCommon from './locales/rw/common.json';
import rwHome from './locales/rw/home.json';
import rwAuth from './locales/rw/auth.json';
import rwLayout from './locales/rw/layout.json';
import rwDashboard from './locales/rw/dashboard.json';
import rwListeners from './locales/rw/listeners.json';
import rwStreaming from './locales/rw/streaming.json';
import rwChat from './locales/rw/chat.json';
import rwAudio from './locales/rw/audio.json';
import rwSettings from './locales/rw/settings.json';
import rwUsers from './locales/rw/users.json';
import rwStudios from './locales/rw/studios.json';

import frCommon from './locales/fr/common.json';
import frHome from './locales/fr/home.json';
import frAuth from './locales/fr/auth.json';
import frLayout from './locales/fr/layout.json';
import frDashboard from './locales/fr/dashboard.json';
import frListeners from './locales/fr/listeners.json';
import frStreaming from './locales/fr/streaming.json';
import frChat from './locales/fr/chat.json';
import frAudio from './locales/fr/audio.json';
import frSettings from './locales/fr/settings.json';
import frUsers from './locales/fr/users.json';
import frStudios from './locales/fr/studios.json';

import swCommon from './locales/sw/common.json';
import swHome from './locales/sw/home.json';
import swAuth from './locales/sw/auth.json';
import swLayout from './locales/sw/layout.json';
import swDashboard from './locales/sw/dashboard.json';
import swListeners from './locales/sw/listeners.json';
import swStreaming from './locales/sw/streaming.json';
import swChat from './locales/sw/chat.json';
import swAudio from './locales/sw/audio.json';
import swSettings from './locales/sw/settings.json';
import swUsers from './locales/sw/users.json';
import swStudios from './locales/sw/studios.json';

/**
 * Translation sections. `common` holds shared strings; every other namespace is
 * feature-specific and matches a page/area of the app.
 */
export const NAMESPACES = [
  'common',
  'home',
  'auth',
  'layout',
  'dashboard',
  'listeners',
  'streaming',
  'chat',
  'audio',
  'settings',
  'users',
  'studios',
] as const;

export const DEFAULT_NAMESPACE = 'common';

export const resources = {
  en: {
    common: enCommon,
    home: enHome,
    auth: enAuth,
    layout: enLayout,
    dashboard: enDashboard,
    listeners: enListeners,
    streaming: enStreaming,
    chat: enChat,
    audio: enAudio,
    settings: enSettings,
    users: enUsers,
    studios: enStudios,
  },
  rw: {
    common: rwCommon,
    home: rwHome,
    auth: rwAuth,
    layout: rwLayout,
    dashboard: rwDashboard,
    listeners: rwListeners,
    streaming: rwStreaming,
    chat: rwChat,
    audio: rwAudio,
    settings: rwSettings,
    users: rwUsers,
    studios: rwStudios,
  },
  fr: {
    common: frCommon,
    home: frHome,
    auth: frAuth,
    layout: frLayout,
    dashboard: frDashboard,
    listeners: frListeners,
    streaming: frStreaming,
    chat: frChat,
    audio: frAudio,
    settings: frSettings,
    users: frUsers,
    studios: frStudios,
  },
  sw: {
    common: swCommon,
    home: swHome,
    auth: swAuth,
    layout: swLayout,
    dashboard: swDashboard,
    listeners: swListeners,
    streaming: swStreaming,
    chat: swChat,
    audio: swAudio,
    settings: swSettings,
    users: swUsers,
    studios: swStudios,
  },
} as const;

/**
 * A shared link carries the sharer's language as `?lang=xx`. Save it as the
 * visitor's choice and drop it from the address bar: left in place, it would
 * win again on the reload that `setLanguage` does, and the language selector
 * would stop working. Runs before the router reads the URL.
 */
const takeLanguageFromUrl = (): AppLanguage | undefined => {
  if (typeof window === 'undefined') return undefined;
  const url = new URL(window.location.href);
  const requested = url.searchParams.get(LANGUAGE_QUERY_PARAM);
  if (requested === null) return undefined;

  url.searchParams.delete(LANGUAGE_QUERY_PARAM);
  window.history.replaceState(window.history.state, '', url);

  const normalized = requested.toLowerCase();
  if (!isSupportedLanguage(normalized)) return undefined;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  } catch {
    // Storage unavailable (private mode): `lng` below still applies it for
    // this visit.
  }
  return normalized;
};

if (!i18n.isInitialized) {
  const languageFromUrl = takeLanguageFromUrl();
  void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      // Set only when the URL named a language; otherwise the detector decides.
      lng: languageFromUrl,
      supportedLngs: [...SUPPORTED_LANGUAGES],
      fallbackLng: DEFAULT_LANGUAGE,
      ns: [...NAMESPACES],
      defaultNS: DEFAULT_NAMESPACE,
      load: 'languageOnly',
      nonExplicitSupportedLngs: true,
      interpolation: {
        // React already escapes values.
        escapeValue: false,
      },
      detection: {
        // Only trust an explicit prior choice; otherwise fall back to
        // DEFAULT_LANGUAGE instead of the browser/OS language.
        order: ['localStorage', 'navigator', 'htmlTag'],
        lookupLocalStorage: LANGUAGE_STORAGE_KEY,
        caches: ['localStorage'],
      },
    });
}

export default i18n;
