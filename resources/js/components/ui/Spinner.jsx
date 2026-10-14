import { cn } from '@/lib/format';

export function Spinner({ className }) {
    return (
        <svg viewBox="0 0 24 24" className={cn('animate-spin', className ?? 'size-5')} aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.2" />
            <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}

export function Skeleton({ className }) {
    return <div className={cn('animate-pulse rounded-md bg-surface-3', className)} />;
}

/** Shown while a page's code loads (see the lazy routes in Router.jsx). */
export function PageLoader({ fullScreen = false }) {
    return (
        <div className={cn('grid place-items-center', fullScreen ? 'min-h-dvh' : 'min-h-[50vh]')} role="status" aria-live="polite">
            <Spinner className="size-8 text-primary" />
        </div>
    );
}
