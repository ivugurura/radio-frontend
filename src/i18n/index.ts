import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
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

import rwCommon from './locales/rw/common.json';
import rwHome from './locales/rw/home.json';
import rwAuth from './locales/rw/auth.json';
import rwLayout from './locales/rw/layout.json';
import rwDashboard from './locales/rw/dashboard.json';
import rwListeners from './locales/rw/listeners.json';
import rwStreaming from './locales/rw/streaming.json';
import rwChat from './locales/rw/chat.json';
import rwAudio from './locales/rw/audio.json';

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
  },
} as const;

if (!i18n.isInitialized) {
  void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
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
        // order: ['localStorage', 'navigator', 'htmlTag']
        order: ['localStorage'],
        lookupLocalStorage: LANGUAGE_STORAGE_KEY,
        caches: ['localStorage'],
      },
    });
}

export default i18n;
