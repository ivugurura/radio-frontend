import { useMemo } from 'react';
import { useLanguage } from '@components/providers';

const ALPHA2 = /^[A-Z]{2}$/;

// Regional-indicator pair, e.g. "RW" -> 🇷🇼.
export const flagEmoji = (code: string): string => {
  if (!ALPHA2.test(code)) return '';
  return String.fromCodePoint(
    ...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
};

export type RegionNamer = (code: string) => string | null;

const makeRegionNamer = (language: string): RegionNamer => {
  try {
    const names = new Intl.DisplayNames([language, 'en'], { type: 'region' });
    return (code) => {
      if (!ALPHA2.test(code)) return null;
      try {
        return names.of(code) ?? null;
      } catch {
        return null;
      }
    };
  } catch {
    return () => null;
  }
};

/** Country names in the current UI language (falls back to English). */
export const useRegionNamer = (): RegionNamer => {
  const { language } = useLanguage();
  return useMemo(() => makeRegionNamer(language), [language]);
};
