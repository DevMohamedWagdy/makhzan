import { CURRENCY } from './constants';

// Arabic locale with Latin digits: easier to scan in data-dense tables.
const LOCALE = 'ar-EG-u-nu-latn';

const numberFormatter = new Intl.NumberFormat(LOCALE);
const dateFormatter = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
const relativeFormatter = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });

export function formatNumber(value) {
    return numberFormatter.format(value ?? 0);
}

export function formatMoney(value) {
    return `${numberFormatter.format(Math.round(value ?? 0))} ${CURRENCY}`;
}

export function formatDate(value) {
    return value ? dateFormatter.format(new Date(value)) : '—';
}

export function formatRelative(value) {
    if (!value) {
        return 'لم ينشط بعد';
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

    return 'الآن';
}

export function formatFileSize(bytes) {
    if (bytes < 1024) {
        return `${bytes} بايت`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(0)} ك.ب`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
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
