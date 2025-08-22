// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    site: 'http://localhost:4321',
    compressHTML: false, // Just to see the "View page source" indented properly
    i18n: {
        defaultLocale: 'sk',
        locales: ['sk', 'cz'],
        routing: {
            prefixDefaultLocale: false,
        },
    },
});
