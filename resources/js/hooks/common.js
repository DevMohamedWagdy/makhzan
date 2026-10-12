import { useCallback, useEffect, useRef, useState } from 'react';

export function useDebouncedValue(value, delay = 350) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}

export function useClickOutside(ref, handler, enabled = true) {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        if (!enabled) {
            return undefined;
        }

        const listener = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                handlerRef.current(event);
            }
        };

        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);

        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, enabled]);
}

export function useEscapeKey(handler, enabled = true) {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    useEffect(() => {
        if (!enabled) {
            return undefined;
        }

        const listener = (event) => event.key === 'Escape' && handlerRef.current(event);

        document.addEventListener('keydown', listener);

        return () => document.removeEventListener('keydown', listener);
    }, [enabled]);
}

/** Copies text and exposes a transient `copied` flag for button feedback. */
export function useCopy(timeout = 1600) {
    const [copiedValue, setCopiedValue] = useState(null);

    const copy = useCallback(
        async (value) => {
            try {
                await navigator.clipboard.writeText(value);
            } catch {
                const textarea = Object.assign(document.createElement('textarea'), { value });

                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                textarea.remove();
            }

            setCopiedValue(value);
            setTimeout(() => setCopiedValue(null), timeout);
        },
        [timeout],
    );

    return { copy, copiedValue };
}

/** Object URL preview for a File, revoked automatically. */
export function useObjectUrl(file) {
    const [url, setUrl] = useState(null);

    useEffect(() => {
        if (!(file instanceof Blob)) {
            setUrl(typeof file === 'string' ? file : null);

            return undefined;
        }

        const objectUrl = URL.createObjectURL(file);

        setUrl(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    return url;
}

export function useLockBodyScroll(locked) {
    useEffect(() => {
        if (!locked) {
            return undefined;
        }

        const previous = document.body.style.overflow;

        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previous;
        };
    }, [locked]);
}
