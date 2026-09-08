import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'my'],
  defaultLocale: 'en',
  // Default locale has no prefix so every current URL keeps working;
  // /my/* serves Burmese. Full [locale] move happens in Step 3.
  localePrefix: 'as-needed',
});
