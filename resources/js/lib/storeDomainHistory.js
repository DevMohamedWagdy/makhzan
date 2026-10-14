/**
 * Router history for a store served on its own domain (window.__MAKHZAN_STORE_DOMAIN__).
 * The app's storefront routes live under /{store-slug}; this history shows them without the
 * slug: shop.com/products is routed as /{slug}/products, and links to /{slug}/cart are
 * written to the address bar as /cart. Pages don't need to know which domain they're on.
 */
export function createStoreDomainHistory(slug) {
    const prefix = `/${slug}`;
    let action = 'POP';
    let listener = null;
    let index = window.history.state?.idx ?? 0;

    const parse = (to) => {
        if (typeof to !== 'string') {
            return { pathname: to.pathname ?? '/', search: to.search ?? '', hash: to.hash ?? '' };
        }

        const url = new URL(to, 'http://router.local');

        return { pathname: url.pathname, search: url.search, hash: url.hash };
    };

    // Old links that already include the slug keep working instead of doubling it.
    const toInternal = (pathname) => (pathname === prefix || pathname.startsWith(`${prefix}/`) ? pathname : prefix + (pathname === '/' ? '' : pathname));
    const toExternal = (pathname) => (pathname === prefix ? '/' : pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) : pathname);

    const readLocation = () => {
        const state = window.history.state ?? {};

        return {
            pathname: toInternal(window.location.pathname),
            search: window.location.search,
            hash: window.location.hash,
            state: state.usr ?? null,
            key: state.key ?? 'default',
        };
    };

    const createHref = (to) => {
        const { pathname, search, hash } = parse(to);

        return toExternal(pathname) + search + hash;
    };

    const navigate = (method, to, state) => {
        action = method === 'pushState' ? 'PUSH' : 'REPLACE';
        index = method === 'pushState' ? index + 1 : index;
        window.history[method]({ usr: state ?? null, key: Math.random().toString(36).slice(2, 10), idx: index }, '', createHref(to));
        listener?.({ action, location: readLocation(), delta: method === 'pushState' ? 1 : 0 });
    };

    window.addEventListener('popstate', () => {
        const nextIndex = window.history.state?.idx ?? 0;
        const delta = nextIndex - index;

        action = 'POP';
        index = nextIndex;
        listener?.({ action, location: readLocation(), delta });
    });

    return {
        get action() {
            return action;
        },
        get location() {
            return readLocation();
        },
        createHref,
        createURL: (to) => new URL(createHref(to), window.location.origin),
        encodeLocation: (to) => {
            const url = new URL(typeof to === 'string' ? to : `${to.pathname ?? '/'}${to.search ?? ''}${to.hash ?? ''}`, 'http://router.local');

            return { pathname: url.pathname, search: url.search, hash: url.hash };
        },
        push: (to, state) => navigate('pushState', to, state),
        replace: (to, state) => navigate('replaceState', to, state),
        go: (delta) => window.history.go(delta),
        listen: (callback) => {
            listener = callback;

            return () => {
                listener = null;
            };
        },
    };
}
