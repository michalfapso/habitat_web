# Silktide Cookie Manager Translation Support

**Date:** 2026-05-05  
**Status:** Approved

## Overview

Add full translation support for the Silktide cookie consent banner in `src/layouts/Layout.astro`. The banner currently displays hardcoded English text. After this change, it will display translated text in Slovak (sk) and Czech (cz) based on the page's current language.

## Context

- The site uses Astro with i18n support via `useTranslations(lang)` utility
- Languages: Slovak (sk, default) and Czech (cz)
- Translation strings are stored in `src/i18n/sk.ts` and `src/i18n/cz.ts`
- Layout.astro already has access to `t()` function via `useTranslations(lang)` in the frontmatter
- Silktide cookie manager is configured in a `<script>` block within Layout.astro
- Silktide JS library is loaded via `<script is:inline>` before the config script
- Template expressions (`{...}`) are NOT processed inside `<script>` tag bodies by Astro — using `define:vars` is the only supported way to pass frontmatter values to scripts

## Solution

### 1. Add Translation Keys

Add the following 17 keys to both `src/i18n/sk.ts` and `src/i18n/cz.ts`:

**Cookie Type Names & Descriptions (6 keys):**
```
cookie.necessary.name
cookie.necessary.description
cookie.analytics.name
cookie.analytics.description
cookie.advertising.name
cookie.advertising.description
```

**Banner Button Text, Accessible Labels & Description (7 keys):**
```
cookie.banner.acceptAllButtonText
cookie.banner.acceptAllButtonAccessibleLabel
cookie.banner.rejectNonEssentialButtonText
cookie.banner.rejectNonEssentialButtonAccessibleLabel
cookie.banner.preferencesButtonText
cookie.banner.preferencesButtonAccessibleLabel
cookie.banner.description
```

**Preferences Dialog (4 keys):**
```
cookie.preferences.title
cookie.preferences.description
cookie.creditLinkText
cookie.creditLinkAccessibleLabel
```

All descriptions contain HTML (`<p>`, `<a>` tags) — include these in the translation strings.

### 2. Add Helper Function to `src/i18n/utils.ts`

Create a new helper function that extracts all translation keys for a given namespace prefix and nests them into a single object:

```typescript
export function getTranslationNamespace(lang: keyof typeof languages, namespace: string) {
  const prefix = namespace + '.';
  const translations = languages[lang] || languages[defaultLang];
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(translations)) {
    if (key.startsWith(prefix)) {
      const subKey = key.slice(prefix.length);
      const parts = subKey.split('.');
      let current = result;
      for (let i = 0; i < parts.length - 1; i++) {
        current[parts[i]] = current[parts[i]] || {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
    }
  }
  
  return result;
}
```

This function returns a nested object like:
```javascript
{
  necessary: { name: 'Necessary', description: '...' },
  analytics: { name: 'Analytics', description: '...' },
  advertising: { name: 'Advertising', description: '...' },
  banner: { acceptAllButtonText: '...', acceptAllButtonAccessibleLabel: '...', ... },
  preferences: { title: '...', description: '...' },
  creditLinkText: '...',
  creditLinkAccessibleLabel: '...'
}
```

### 3. Get Cookie Translations in Layout.astro Frontmatter

In Layout.astro's frontmatter, import and call the helper function:

```typescript
import { useTranslations, getTranslationNamespace } from '../i18n/utils';

const lang = Astro.currentLocale as keyof typeof import('../i18n/utils').languages;
const t = useTranslations(lang);
const cookieI18n = getTranslationNamespace(lang, 'cookie');
```

This single call replaces 17 individual `t()` calls and automatically structures the nested keys.

### 4. Update Layout.astro Script — Use `define:vars`

**Change:** Add `define:vars={{ cookieI18n }}` to the existing `<script>` opening tag, making it `<script is:inline define:vars={{ cookieI18n }}>`.

Using `is:inline` keeps execution synchronous (runs immediately when parsed, same as the Silktide library tag above it). Astro serializes `cookieI18n` to JSON and injects `const cookieI18n = {...};` at the top of the script block before any other code runs.

**Replace:** All hardcoded strings in the `silktideCookieBannerManager.updateCookieBannerConfig({...})` call with `cookieI18n` variable references using dot notation.

For example:
```javascript
// Before:
name: "Necessary",
description: "<p>These cookies are necessary...</p>",

// After:
name: cookieI18n.necessary.name,
description: cookieI18n.necessary.description,
```

Similarly for other nested keys:
- `cookieI18n.analytics.name`
- `cookieI18n.banner.acceptAllButtonText`
- `cookieI18n.preferences.title`
- `cookieI18n.creditLinkText`

The full config structure remains the same; only string values change. The `gtag` function definition and all consent update callbacks remain unchanged.

### 5. Cookie Policy Link

The banner description string (`cookie.banner.description`) includes a cookie policy link:
- **Slovak version:** Use `/zasady-cookies/` as the link target
- **Czech version:** Use `/cz/zasady-cookies/` as the link target

These URLs are embedded in the translation strings themselves (not a separate config).

## Data Flow

1. Astro builds Layout.astro with the current locale (`lang`)
2. `getTranslationNamespace(lang, 'cookie')` is called in frontmatter, extracting and nesting all `cookie.*` translation keys into a single object
3. Astro serializes `cookieI18n` as JSON and injects `const cookieI18n = {...};` at the top of the `<script is:inline define:vars={{ cookieI18n }}>` block
4. The inline script runs synchronously: `gtag` is defined, then `silktideCookieBannerManager.updateCookieBannerConfig(...)` is called using `cookieI18n.necessary.name`, `cookieI18n.banner.acceptAllButtonText`, etc.
5. Silktide renders the banner with correct language

## Testing

- Test in Slovak: `http://localhost:4321/` — banner displays Slovak text
- Test in Czech: `http://localhost:4321/cz/` — banner displays Czech text
- Verify console has no errors (`gtag` function still defined, `cookieI18n` not undefined)
- Verify button text, descriptions, and preferences dialog all display in correct language
- Test "Accept all", "Reject non-essential", and "Preferences" button interactions work correctly

## Files to Modify

1. `src/i18n/utils.ts` — add `getTranslationNamespace()` helper function
2. `src/i18n/sk.ts` — add 17 new translation keys with Slovak text
3. `src/i18n/cz.ts` — add 17 new translation keys with Czech text
4. `src/layouts/Layout.astro` — import and call `getTranslationNamespace()` in frontmatter to get `cookieI18n`; change `<script>` to `<script is:inline define:vars={{ cookieI18n }}>` and replace hardcoded strings with `cookieI18n.*` references

## Implementation Order

1. Add `getTranslationNamespace()` helper function to src/i18n/utils.ts
2. Add all translation keys to sk.ts (17 keys under `cookie.*` namespace)
3. Add all translation keys to cz.ts (translate from sk.ts)
4. Import `getTranslationNamespace` in Layout.astro and call it to populate `cookieI18n`
5. Update the script tag from `<script>` to `<script is:inline define:vars={{ cookieI18n }}>`
6. Replace all hardcoded strings in the Silktide config with `cookieI18n.*` references
7. Test both language versions
8. Commit changes

## Success Criteria

- [ ] Banner displays correct language on `/` (Slovak) and `/cz/` (Czech) routes
- [ ] All button labels, category names, and descriptions are translated
- [ ] Console has no errors
- [ ] Cookie consent interactions (accept/reject/preferences) work correctly
- [ ] No layout shift or rendering issues

## Notes

- The `getTranslationNamespace()` helper function automatically extracts all keys with a given prefix and nests them into an object. This pattern is reusable for any other translation namespace (e.g., `getTranslationNamespace(lang, 'contact-form')`).
- `define:vars` is the only Astro-supported way to pass frontmatter values into a script. Using `{t('key')}` template expressions inside `<script>` or `<script is:inline>` bodies does NOT work — Astro does not process template expressions inside script tags.
- Adding `is:inline` to the `define:vars` script keeps execution synchronous. Without `is:inline`, `define:vars` on a regular script would set variables on `window` and the script would run as a deferred module — functional but less clean.
- `define:vars` serializes values to JSON at build time. Each language version of the site gets its own hardcoded translated strings baked in.
- HTML content (descriptions with `<p>`, `<a>` tags) can be included directly in translation strings; Silktide already renders them via `innerHTML` with the current hardcoded HTML values.
