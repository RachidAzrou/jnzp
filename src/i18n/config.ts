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
  console.log('[i18n] Sample translations:', {
    archiveLink: i18n.t('navigation.archiveLink'),
    facturatie: i18n.t('navigation.facturatie'),
    teamManagement: i18n.t('navigation.teamManagement'),
  });
});

export default i18n;
