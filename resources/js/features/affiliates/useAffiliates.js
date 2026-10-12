import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebouncedValue } from '@/hooks/common';
import { affiliatesApi } from '@/services/affiliatesApi';

const FILTER_KEYS = ['search', 'tier', 'status', 'payout_method', 'page', 'per_page'];
const DEFAULT_FILTERS = { search: '', tier: '', status: '', payout_method: '', page: 1, per_page: 10 };

const initialState = {
    items: [],
    meta: { current_page: 1, per_page: 10, total: 0, last_page: 1 },
    summary: null,
    loading: true,
    error: null,
};

function reducer(state, action) {
    switch (action.type) {
        case 'loading':
            return { ...state, loading: true, error: null };
        case 'loaded':
            return { ...state, loading: false, items: action.data, meta: action.meta };
        case 'summary':
            return { ...state, summary: action.summary };
        case 'failed':
            return { ...state, loading: false, error: action.error };
        case 'replace':
            return { ...state, items: state.items.map((item) => (item.affiliate_id === action.affiliate.affiliate_id ? action.affiliate : item)) };
        default:
            return state;
    }
}

/**
 * Affiliates list state, with filters persisted in the URL query string so
 * filtered views are shareable and survive reloads.
 */
export function useAffiliates() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [state, dispatch] = useReducer(reducer, initialState);
    const requestId = useRef(0);

    const filters = useMemo(() => {
        const fromUrl = Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) ?? DEFAULT_FILTERS[key]]));

        return { ...fromUrl, page: Number(fromUrl.page) || 1, per_page: Number(fromUrl.per_page) || 10 };
    }, [searchParams]);

    const debouncedSearch = useDebouncedValue(filters.search, 300);

    // Only the debounced search hits the API; the raw value drives the input.
    const query = useMemo(
        () => ({ search: debouncedSearch, tier: filters.tier, status: filters.status, payout_method: filters.payout_method, page: filters.page, per_page: filters.per_page }),
        [debouncedSearch, filters.tier, filters.status, filters.payout_method, filters.page, filters.per_page],
    );

    const setFilters = useCallback(
        (patch) => {
            setSearchParams(
                (previous) => {
                    const next = new URLSearchParams(previous);
                    // Any filter change other than paging returns to page 1.
                    const merged = { ...patch, ...(!('page' in patch) && { page: 1 }) };

                    Object.entries(merged).forEach(([key, value]) => {
                        if (value === '' || value == null || value === DEFAULT_FILTERS[key]) {
                            next.delete(key);
                        } else {
                            next.set(key, value);
                        }
                    });

                    return next;
                },
                { replace: true },
            );
        },
        [setSearchParams],
    );

    const resetFilters = useCallback(() => setSearchParams({}, { replace: true }), [setSearchParams]);

    const load = useCallback(async () => {
        const currentRequest = ++requestId.current;

        dispatch({ type: 'loading' });

        try {
            const [list, summary] = await Promise.all([
                affiliatesApi.list(query),
                affiliatesApi.summary(),
            ]);

            // Ignore responses that arrive after a newer request was fired.
            if (currentRequest === requestId.current) {
                dispatch({ type: 'loaded', data: list.data, meta: list.meta });
                dispatch({ type: 'summary', summary });
            }
        } catch (error) {
            if (currentRequest === requestId.current) {
                dispatch({ type: 'failed', error: error.message });
            }
        }
    }, [query]);

    useEffect(() => {
        load();
    }, [load]);

    const replaceAffiliate = useCallback((affiliate) => dispatch({ type: 'replace', affiliate }), []);

    const hasActiveFilters = Boolean(filters.search || filters.tier || filters.status || filters.payout_method);

    return { ...state, filters, setFilters, resetFilters, hasActiveFilters, reload: load, replaceAffiliate };
}
