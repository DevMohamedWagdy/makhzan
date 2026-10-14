/**
 * Lightweight i18n, gettext style: the Arabic source text is the translation key, so
 * `t('حفظ المنتج')` reads naturally and falls back to Arabic when a translation is missing.
 * Placeholders use braces: t('ملف المسوق {name}', { name }).
 *
 * The language is fixed for the lifetime of the page; switching reloads it, so module-level
 * labels (constants) are translated too. The backend gets the same language
 * through the Accept-Language header (see services/client.js).
 */

export const LOCALES = {
    ar: { label: 'العربية', dir: 'rtl', intl: 'ar-EG-u-nu-latn' },
    en: { label: 'English', dir: 'ltr', intl: 'en-EG' },
};

export const DEFAULT_LOCALE = 'ar';
export const LOCALE_STORAGE_KEY = 'makhzan.locale';

/** Translations of the Arabic source text, loaded on demand (Arabic users never download them). */
const DICTIONARIES = { en: () => import('./en') };

let dictionary = null;

function detectLocale() {
    try {
        const stored = localStorage.getItem(LOCALE_STORAGE_KEY);

        if (stored in LOCALES) {
            return stored;
        }
    } catch {
        // Storage unavailable (private mode): use the default.
    }

    return DEFAULT_LOCALE;
}

export const locale = detectLocale();
export const dir = LOCALES[locale].dir;
export const intlLocale = LOCALES[locale].intl;
export const isRtl = dir === 'rtl';

if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
}

/**
 * Loads the current language's dictionary. app.jsx awaits it before importing the rest of the
 * app, so labels translated when their module loads (constants) are translated too.
 */
export async function loadDictionary() {
    if (DICTIONARIES[locale]) {
        dictionary = (await DICTIONARIES[locale]()).default;
    }
}

/**
 * @param {string} text  Arabic source text (the key)
 * @param {Record<string, string | number>} [params]
 */
export function t(text, params) {
    const translated = dictionary?.[text] ?? text;

    return params ? translated.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match)) : translated;
}

/** Saves the choice and reloads so every label, format and API message follows it. */
export function setLocale(next) {
    if (!(next in LOCALES) || next === locale) {
        return;
    }

    try {
        localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
        // Without storage the choice can't persist; nothing to do.
    }

    window.location.reload();
}
