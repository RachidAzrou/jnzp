import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationNL from './locales/nl.json';
import translationFR from './locales/fr.json';
import translationEN from './locales/en.json';

const resources = {
  nl: { translation: translationNL },
  fr: { translation: translationFR },
  en: { translation: translationEN },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'nl',
    lng: 'nl', // default language
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false,
    },
  });

// Debug: log when language changes
i18n.on('languageChanged', (lng) => {
  console.log('[i18n] Language changed to:', lng);
  console.log('[i18n] Has mortuarium keys:', !!i18n.t('mortuarium.team.title', { returnObjects: false, defaultValue: 'MISSING' }));
  console.log('[i18n] Test translation mortuarium.team.title:', i18n.t('mortuarium.team.title'));
  console.log('[i18n] Test translation mortuarium.adHocWizard.basicInfo:', i18n.t('mortuarium.adHocWizard.basicInfo'));
});

// Log initial state
console.log('[i18n] Initial language:', i18n.language);
console.log('[i18n] Available languages:', Object.keys(resources));
console.log('[i18n] Test mortuarium.team.title:', i18n.t('mortuarium.team.title'));

export default i18n;
