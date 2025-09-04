import sk from './sk';
import cz from './cz';

export const defaultLang = 'sk';
export const languages = { sk, cz };
export const languagesRegex = Object.keys(languages).join('|');

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
export async function useTranslatedPath(lang: keyof typeof languages) {
  const base = lang === defaultLang ? '' : `/${lang}`;
  // console.log('useTranslatedPath() base:', base, ' lang:', lang, ' defaultLang:', defaultLang);

  // const modules: any[] = await Promise.all(Object.values(import.meta.glob(['../**/*.astro'])).map(fn => fn()));
  const modules: any[] = await Promise.all(Object.values(import.meta.glob(['../pages/**/*.astro'])).map(fn => fn()));
  // console.log('modules:', modules);
  let paths: string[] = [];
  let slug2id = {};
  let id2lang2slug = {};

  for (const module of modules) {
    if (module.getStaticPaths == undefined) {
      continue;
    }
    const staticPaths = await Promise.resolve(module.getStaticPaths());
    // console.log('module:', module);
    // console.log('staticPaths:', staticPaths);

    staticPaths.forEach((staticPath: any) => {
      const id = staticPath.props.id.replace(/\...\.md$/, ''); // Use the new top-level 'id'
      const fullPath = staticPath.props.fullPath; // Use the new 'fullPath'

      slug2id[fullPath] = id;

      // Store the full path for the target language
      if (!id2lang2slug[id]) id2lang2slug[id] = {};
      id2lang2slug[id][staticPath.props.lang] = fullPath;
    });
  };

  // Handles root path and prepends base to other paths.
  return (path: string) => {
    // console.log('path:', path);
    path = path.replace(/\/$/, ''); // Remove trailing slash for consistency
    
    // console.log('slug2id:', slug2id);
    const id = slug2id[path];
    // console.log('id:', id);
    // console.log('id2langslug:', id2lang2slug);
    // console.log('id2langslug[id]:', id2lang2slug[id]);

    if (id && id2lang2slug[id] && id2lang2slug[id][lang]) {
      // console.log('id2langslug[id][lang]:', id2lang2slug[id][lang]);
      return id2lang2slug[id][lang]; // Return the correct full path
    }
    
    // Fallback for pages without translation
    path = path.replace(new RegExp(`^\/${languagesRegex}`), '');
    if (!path.startsWith('/')) {
      path = `/${path}`;
    }
    // console.log('translated path:', path === '/' ? base || '/' : `${base}${path}`);
    return path === '/' ? base || '/' : `${base}${path}`;
  };
}
