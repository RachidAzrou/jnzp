import { format as dateFnsFormat } from 'date-fns';
import { nl, fr, enUS } from 'date-fns/locale';

const locales = {
  nl,
  fr,
  en: enUS,
};

export const formatDate = (
  date: Date | string | null | undefined,
  formatStr: string = 'dd/MM/yyyy',
  locale: string = 'nl'
): string => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const localeObj = locales[locale as keyof typeof locales] || locales.nl;
    return dateFnsFormat(dateObj, formatStr, { locale: localeObj });
  } catch {
    return 'N/A';
  }
};

export const formatDateTime = (
  date: Date | string | null | undefined,
  locale: string = 'nl'
): string => {
  return formatDate(date, 'dd MMM yyyy HH:mm', locale);
};

export const formatNumber = (
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions,
  locale: string = 'nl'
): string => {
  if (value === null || value === undefined) return 'N/A';
  
  try {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : locale, options).format(value);
  } catch {
    return String(value);
  }
};

export const formatCurrency = (
  value: number | null | undefined,
  currency: string = 'EUR',
  locale: string = 'nl'
): string => {
  return formatNumber(value, { style: 'currency', currency }, locale);
};
