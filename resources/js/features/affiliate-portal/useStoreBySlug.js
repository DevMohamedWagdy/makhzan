import { useEffect, useState } from 'react';
import { affiliatePortalApi } from '@/services/affiliatePortalApi';

/** Loads public store identity for store-branded affiliate pages. */
export function useStoreBySlug(slug, titlePrefix) {
    const [store, setStore] = useState(null);
    const [missing, setMissing] = useState(false);

    useEffect(() => {
        let cancelled = false;

        affiliatePortalApi
            .getStore(slug)
            .then((data) => {
                if (!cancelled) {
                    setStore(data);
                    document.title = `${titlePrefix} | ${data.name}`;
                }
            })
            .catch(() => !cancelled && setMissing(true));

        return () => {
            cancelled = true;
        };
    }, [slug, titlePrefix]);

    return { store, missing };
}
