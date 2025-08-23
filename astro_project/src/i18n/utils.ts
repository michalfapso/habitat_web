import sk from './sk';
import cz from './cz';

export const defaultLang = 'sk';
export const languages = { sk, cz };

export function useTranslations(lang: keyof typeof languages) {
  return function t(key: keyof (typeof sk)) {
    return languages[lang]?.[key] || languages[defaultLang][key];
  }
}

/**
 * Creates a path translation function for a given language.
 * @param lang - The current language ('sk' or 'cz').
 * @returns A function that takes a path and returns a localized path.
 */
export function useTranslatedPath(lang: keyof typeof languages) {
  const base = lang === defaultLang ? '' : `/${lang}`;
  // Handles root path and prepends base to other paths.
  return (path: string) => (path === '/' ? base || '/' : `${base}${path}`);
}
