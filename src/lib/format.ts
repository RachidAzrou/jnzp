import { format as dateFnsFormat } from 'date-fns';
import { nl, fr, enUS } from 'date-fns/locale';
import i18n from '@/i18n/config';

const locales = {
  nl,
  fr,
  en: enUS,
};

const getCurrentLocale = () => {
  return i18n.language || 'nl';
};

export const formatDate = (
  date: Date | string | null | undefined,
  formatStr: string = 'dd/MM/yyyy',
  locale?: string
): string => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const currentLocale = locale || getCurrentLocale();
    const localeObj = locales[currentLocale as keyof typeof locales] || locales.nl;
    return dateFnsFormat(dateObj, formatStr, { locale: localeObj });
  } catch {
    return 'N/A';
  }
};

export const formatDateTime = (
  date: Date | string | null | undefined,
  locale?: string
): string => {
  return formatDate(date, 'dd MMM yyyy HH:mm', locale);
};

export const formatNumber = (
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions,
  locale?: string
): string => {
  if (value === null || value === undefined) return 'N/A';
  
  try {
    const currentLocale = locale || getCurrentLocale();
    return new Intl.NumberFormat(currentLocale === 'en' ? 'en-US' : currentLocale, options).format(value);
  } catch {
    return String(value);
  }
};

export const formatCurrency = (
  value: number | null | undefined,
  currency: string = 'EUR',
  locale?: string
): string => {
  return formatNumber(value, { style: 'currency', currency }, locale);
};
