import { intlLocale, locale, t } from '@/i18n';
import { CURRENCY } from './constants';

// Arabic uses Latin digits (ar-EG-u-nu-latn): easier to scan in data-dense tables.
const numberFormatter = new Intl.NumberFormat(intlLocale);
const dateFormatter = new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat(intlLocale, { hour: 'numeric', minute: '2-digit' });
const relativeFormatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

export function formatNumber(value) {
    return numberFormatter.format(value ?? 0);
}

export function formatMoney(value) {
    return `${numberFormatter.format(Math.round(value ?? 0))} ${CURRENCY}`;
}

export function formatDate(value) {
    return value ? dateFormatter.format(new Date(value)) : '—';
}

/** Time of day, e.g. "3:45 PM". */
export function formatTime(value) {
    return value ? timeFormatter.format(new Date(value)) : '—';
}

export function formatRelative(value) {
    if (!value) {
        return t('لم ينشط بعد');
    }

    const diffSeconds = (new Date(value).getTime() - Date.now()) / 1000;
    const units = [
        ['year', 31536000],
        ['month', 2592000],
        ['week', 604800],
        ['day', 86400],
        ['hour', 3600],
        ['minute', 60],
    ];

    for (const [unit, seconds] of units) {
        if (Math.abs(diffSeconds) >= seconds) {
            return relativeFormatter.format(Math.round(diffSeconds / seconds), unit);
        }
    }

    return t('الآن');
}

export function formatFileSize(bytes) {
    if (bytes < 1024) {
        return t('{bytes} بايت', { bytes });
    }

    if (bytes < 1024 * 1024) {
        return t('{value} ك.ب', { value: (bytes / 1024).toFixed(0) });
    }

    return t('{value} م.ب', { value: (bytes / (1024 * 1024)).toFixed(1) });
}

export function initials(name = '') {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join(' ');
}

/** Masks all but the last 4 characters of an account number. */
export function maskAccount(value = '') {
    const clean = String(value).replace(/\s+/g, '');

    return clean.length <= 4 ? clean : `${'•'.repeat(Math.min(clean.length - 4, 8))}${clean.slice(-4)}`;
}

export function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}
