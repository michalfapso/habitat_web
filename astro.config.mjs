// @ts-check
import { defineConfig } from 'astro/config';
import fs from 'node:fs';

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
    vite: {
        define: {
            SHOW_LANGUAGE_SWITCHER: false,
        },
    },
    integrations: [
        {
            name: 'copy-php-folder',
            hooks: {
                'astro:build:done': ({ dir }) => {
                    const src = new URL('./php/', import.meta.url);
                    const dest = new URL('./php/', dir); // 'dir' is the dist folder
                    fs.cpSync(src, dest, { recursive: true });
                    console.log('✅ PHP folder copied to dist/');
                },
            },
        },
    ],
});

