/**
 * The store's ad / analytics pixels in the shopper's browser: Meta Pixel, TikTok Pixel and
 * Google Analytics 4, loaded only for platforms the vendor connected. Each shop event is sent
 * to all of them in their own vocabulary. A purchase carries the same event ID the server
 * uses (order-{id}), so a platform that hears it from both counts it once.
 *
 * Also remembers the ad click IDs (?fbclid=, ?ttclid=) so checkout can pass them, with the
 * platforms' cookies, to the server for matching orders to ads.
 */

const CURRENCY = 'EGP';
const CLICK_DAYS = 7;

let active = {};
let loadedFor = null;

/** Events fired before the store (and so its pixels) loaded, e.g. the product page's view. */
const pending = [];
const MAX_PENDING = 20;

/** Runs now when the pixels are set up, otherwise once they are. */
function whenReady(send) {
    if (loadedFor) {
        send();
    } else if (pending.length < MAX_PENDING) {
        pending.push(send);
    }
}

const window_ = typeof window === 'undefined' ? null : window;

function loadScript(src) {
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
}

/* eslint-disable prefer-rest-params */
function loadMeta(pixelId) {
    if (!window_.fbq) {
        const fbq = function () {
            fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
        };
        fbq.push = fbq;
        fbq.loaded = true;
        fbq.version = '2.0';
        fbq.queue = [];
        window_.fbq = fbq;
        window_._fbq = fbq;
        loadScript('https://connect.facebook.net/en_US/fbevents.js');
    }

    window_.fbq('init', pixelId);
}

function loadTiktok(pixelId) {
    if (!window_.ttq) {
        const ttq = [];
        const methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
        methods.forEach((method) => {
            ttq[method] = (...args) => ttq.push([method, ...args]);
        });
        ttq._i = {};
        ttq._t = {};
        ttq._o = {};
        ttq.load = (id) => {
            ttq._i[id] = [];
            ttq._t[id] = Date.now();
            loadScript(`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(id)}&lib=ttq`);
        };
        window_.TiktokAnalyticsObject = 'ttq';
        window_.ttq = ttq;
    }

    window_.ttq.load(pixelId);
}

function loadGoogle(measurementId) {
    if (!window_.gtag) {
        window_.dataLayer = window_.dataLayer || [];
        window_.gtag = function () {
            window_.dataLayer.push(arguments);
        };
        window_.gtag('js', new Date());
        loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`);
    }

    // Page views are sent by trackPageView() on every route change of the single-page app.
    window_.gtag('config', measurementId, { send_page_view: false });
}
/* eslint-enable prefer-rest-params */

/**
 * Loads the store's pixels once per store. @param {{ meta?: string, tiktok?: string, google?: string }} pixels
 */
export function initTracking(storeSlug, pixels) {
    if (!window_ || loadedFor === storeSlug) {
        return;
    }

    loadedFor = storeSlug;
    active = Array.isArray(pixels) ? {} : (pixels ?? {});

    try {
        active.meta && loadMeta(active.meta);
        active.tiktok && loadTiktok(active.tiktok);
        active.google && loadGoogle(active.google);
    } catch {
        // A blocked or broken pixel never breaks the store.
    }

    pending.splice(0).forEach((send) => send());
}

const safely = (callback) => {
    try {
        callback();
    } catch {
        // Ignore tracker errors.
    }
};

export function trackPageView() {
    whenReady(() => {
        active.meta && safely(() => window_.fbq('track', 'PageView'));
        active.tiktok && safely(() => window_.ttq.page());
        active.google && safely(() => window_.gtag('event', 'page_view', { page_location: window_.location.href, page_title: document.title }));
    });
}

/**
 * @param {'view_item'|'add_to_cart'|'begin_checkout'|'purchase'} event
 * @param {{ value: number, items: Array<{ id: string|number, name: string, price: number, quantity: number }>, eventId?: string, transactionId?: string|number }} data
 */
export function trackEvent(event, data) {
    whenReady(() => sendEvent(event, data));
}

function sendEvent(event, { value, items, eventId, transactionId }) {
    const metaEvent = { view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', purchase: 'Purchase' }[event];
    const tiktokEvent = { view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', purchase: 'CompletePayment' }[event];
    const ids = items.map((item) => String(item.id));

    active.meta &&
        safely(() =>
            window_.fbq(
                'track',
                metaEvent,
                { currency: CURRENCY, value, content_type: 'product', content_ids: ids, contents: items.map((item) => ({ id: String(item.id), quantity: item.quantity, item_price: item.price })), num_items: items.reduce((sum, item) => sum + item.quantity, 0) },
                eventId ? { eventID: eventId } : undefined,
            ),
        );
    active.tiktok &&
        safely(() =>
            window_.ttq.track(
                tiktokEvent,
                { currency: CURRENCY, value, content_type: 'product', contents: items.map((item) => ({ content_id: String(item.id), content_name: item.name, quantity: item.quantity, price: item.price })) },
                eventId ? { event_id: eventId } : undefined,
            ),
        );
    active.google &&
        safely(() =>
            window_.gtag('event', event, {
                currency: CURRENCY,
                value,
                ...(transactionId ? { transaction_id: String(transactionId) } : {}),
                items: items.map((item) => ({ item_id: String(item.id), item_name: item.name, price: item.price, quantity: item.quantity })),
            }),
        );
}

/**
 * Fires the purchase once per order and browser (reloading the confirmation page doesn't repeat it).
 * @param {{ order_id: number, number: number, total: number, items: Array<{ product_id: number|null, item_id: number, product_name: string, unit_price: number, quantity: number }> }} order
 */
export function trackPurchase(order) {
    const key = `makhzan.tracked.order-${order.order_id}`;

    try {
        if (localStorage.getItem(key)) {
            return;
        }

        localStorage.setItem(key, '1');
    } catch {
        // Storage blocked: may repeat on reload, the event ID still lets platforms de-duplicate.
    }

    trackEvent('purchase', {
        value: order.total,
        eventId: `order-${order.order_id}`,
        transactionId: order.number,
        items: (order.items ?? []).map((item) => ({ id: item.product_id ?? item.item_id, name: item.product_name, price: item.unit_price, quantity: item.quantity })),
    });
}

const cookie = (name) => document.cookie.split('; ').find((entry) => entry.startsWith(`${name}=`))?.split('=').slice(1).join('=') || null;

/** Remembers ad click IDs from the landing URL for a week. */
export function captureClickIds(searchParams) {
    try {
        const fbclid = searchParams.get('fbclid');
        const ttclid = searchParams.get('ttclid');

        fbclid && localStorage.setItem('makhzan.fbc', JSON.stringify({ value: `fb.1.${Date.now()}.${fbclid}`, at: Date.now() }));
        ttclid && localStorage.setItem('makhzan.ttclid', JSON.stringify({ value: ttclid, at: Date.now() }));
    } catch {
        // Storage blocked.
    }
}

function remembered(key) {
    try {
        const saved = JSON.parse(localStorage.getItem(key) ?? 'null');

        return saved && Date.now() - saved.at < CLICK_DAYS * 86400000 ? saved.value : null;
    } catch {
        return null;
    }
}

/** What checkout sends with the order so the server can report it to the ad platforms. */
export function trackingContext() {
    const ga = cookie('_ga');

    return Object.fromEntries(
        Object.entries({
            fbp: cookie('_fbp'),
            fbc: cookie('_fbc') ?? remembered('makhzan.fbc'),
            ttp: cookie('_ttp'),
            ttclid: remembered('makhzan.ttclid'),
            // _ga = GA1.1.<client id>; GA4 expects just "<random>.<timestamp>".
            ga_client_id: ga ? ga.split('.').slice(-2).join('.') : null,
            page_url: window_?.location.href,
        }).filter(([, value]) => value),
    );
}
