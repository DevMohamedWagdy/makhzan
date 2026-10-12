import { useId } from 'react';
import { t } from '@/i18n';
import { cn } from '@/lib/format';

/**
 * Makhzan mark: a warehouse roofline sheltering stacked crates, with a flow arc
 * that reads as goods moving in and out (inventory → trade).
 */
export function LogoMark({ className = 'size-10' }) {
    const id = useId().replace(/:/g, '');

    return (
        <svg viewBox="0 0 48 48" className={className} role="img" aria-label={t('مخزن')}>
            <LogoMarkPaths id={id} />
        </svg>
    );
}

/** Full lockup: mark + Arabic wordmark + Latin sub-label, as one SVG. */
export function Logo({ className, showTagline = true }) {
    const id = useId().replace(/:/g, '');

    return (
        <svg viewBox="0 0 168 48" className={cn('h-10 w-auto text-ink', className)} role="img" aria-label={t('مخزن - Makhzan')}>
            <defs>
                <linearGradient id={`${id}-word`} x1="0" y1="0" x2="110" y2="0" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0EA5E9" />
                    <stop offset="1" stopColor="#4F46E5" />
                </linearGradient>
            </defs>
            <g transform="translate(120 0)">
                <LogoMarkPaths id={id} />
            </g>
            <text x="110" y={showTagline ? 27 : 33} direction="ltr" textAnchor="end" fontFamily="Alexandria, sans-serif" fontWeight="800" fontSize="25" fill="currentColor">
                {/* The Arabic wordmark is part of the logo in every language; MAKHZAN below is the Latin name. */}
                مخزن
            </text>
            {showTagline && (
                <text x="110" y="42" direction="ltr" textAnchor="end" fontFamily="Alexandria, sans-serif" fontWeight="600" fontSize="9" letterSpacing="3.2" fill={`url(#${id}-word)`}>
                    MAKHZAN
                </text>
            )}
        </svg>
    );
}

/** Mark geometry, shared by the standalone mark and the lockup (nested <svg> would break gradient ids). */
function LogoMarkPaths({ id }) {
    return (
        <>
            <defs>
                <linearGradient id={`${id}-bg`} x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#6366F1" />
                    <stop offset="0.55" stopColor="#4F46E5" />
                    <stop offset="1" stopColor="#0EA5E9" />
                </linearGradient>
                <linearGradient id={`${id}-shine`} x1="24" y1="0" x2="24" y2="30" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#fff" stopOpacity="0.28" />
                    <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
            </defs>
            <rect width="48" height="48" rx="13" fill={`url(#${id}-bg)`} />
            <rect width="48" height="48" rx="13" fill={`url(#${id}-shine)`} />
            {/* Roofline */}
            <path d="M9.5 20 24 11.5 38.5 20" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {/* Stacked crates */}
            <rect x="15" y="27" width="8" height="7.5" rx="1.6" fill="#fff" />
            <rect x="25" y="27" width="8" height="7.5" rx="1.6" fill="#fff" fillOpacity="0.72" />
            <rect x="20" y="19" width="8" height="7" rx="1.6" fill="#fff" fillOpacity="0.9" />
            {/* Trade flow arc */}
            <path d="M11 37.5c4 2.6 8.4 3.8 13 3.8s9-1.2 13-3.8" fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth="2.2" strokeLinecap="round" />
            <path d="m34.2 35.6 2.9 1.9-1.4 3.2" fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </>
    );
}
