import sk from './sk';
import cz from './cz';

const languages = { sk, cz };

export function useTranslations(lang: keyof typeof languages) {
  return function t(key: keyof (typeof sk)) {
    return languages[lang][key] || languages['sk'][key];
  }
}
