import { useCallback, useEffect, useState } from 'react';
import { categoriesApi } from '@/services/productsApi';

/** The store's product categories, in display order. */
export function useCategories() {
    const [categories, setCategories] = useState(null);
    const [error, setError] = useState(null);

    const reload = useCallback(
        () =>
            categoriesApi
                .list()
                .then((response) => {
                    setCategories(response);
                    setError(null);

                    return response;
                })
                .catch((loadError) => setError(loadError.message)),
        [],
    );

    useEffect(() => {
        reload();
    }, [reload]);

    return { categories, error, reload };
}
