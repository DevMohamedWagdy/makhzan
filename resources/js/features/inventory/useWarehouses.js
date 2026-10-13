import { useCallback, useEffect, useState } from 'react';
import { warehousesApi } from '@/services/warehousesApi';

/** The store's warehouses in fulfilment order (the first is the default). */
export function useWarehouses() {
    const [warehouses, setWarehouses] = useState(null);
    const [error, setError] = useState(null);

    const reload = useCallback(
        () =>
            warehousesApi
                .list()
                .then((response) => {
                    const list = response.data ?? response;

                    setWarehouses(list);
                    setError(null);

                    return list;
                })
                .catch((loadError) => setError(loadError.message)),
        [],
    );

    useEffect(() => {
        reload();
    }, [reload]);

    return { warehouses, error, reload };
}
