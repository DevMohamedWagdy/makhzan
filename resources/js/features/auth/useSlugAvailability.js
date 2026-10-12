import { useEffect, useState } from 'react';
import { useDebouncedValue } from '@/hooks/common';
import { isSlug } from '@/lib/validators';
import { authApi } from '@/services/authApi';

/** @returns {'idle' | 'invalid' | 'checking' | 'available' | 'taken'} */
export function useSlugAvailability(slug) {
    const debouncedSlug = useDebouncedValue(slug, 450);
    const [status, setStatus] = useState('idle');

    useEffect(() => {
        if (!debouncedSlug) {
            setStatus('idle');

            return undefined;
        }

        if (!isSlug(debouncedSlug)) {
            setStatus('invalid');

            return undefined;
        }

        let cancelled = false;

        setStatus('checking');
        authApi
            .checkSlug(debouncedSlug)
            .then(({ available }) => !cancelled && setStatus(available ? 'available' : 'taken'))
            .catch(() => !cancelled && setStatus('idle'));

        return () => {
            cancelled = true;
        };
    }, [debouncedSlug]);

    // While the user is still typing, the debounced result is stale.
    return slug !== debouncedSlug && slug ? 'checking' : status;
}
