import { useId } from 'react';
import { cn } from '@/lib/format';

/** Growth Green: the mark and "Grow" keep this color in both themes. Source files live in public/brand/logo. */
const BRAND_GREEN = '#16A35F';

/** The mark: five stacked blocks rising to a leaf, on a 3x3 grid of 28-unit modules (96 x 96). */
const MARK_BLOCKS = [
    [0, 68],
    [34, 68],
    [68, 68],
    [34, 34],
    [68, 34],
];
const MARK_LEAF_PATH = 'M71,28 A3,3 0 0 1 68,25 V17 A17,17 0 0 1 85,0 H93 A3,3 0 0 1 96,3 V11 A17,17 0 0 1 79,28 Z';

/** Monoline wordmark strokes (baseline 100, x-height 50, cap height 30). The y and w are clipped flat at the x-height. */
const SELLY_PATH = 'M32.33,41.79 A14.75,14.75 0 1 0 20.25,65 A14.75,14.75 0 1 1 8.17,88.21 M54,75 H93 A19.5,19.5 0 1 0 87.29,88.79 M113,30 V100 M133,30 V100';
const SELLY_Y_PATH = 'M146.32,46 L169,100 M191.68,46 L158.5,125';
const GROW_PATH = 'M259.6,46.04 A29.5,29.5 0 1 0 266.5,65 M240,65 H272 M286.5,100 V50 M286.5,78 A22.5,22.5 0 0 1 309,55.5 M320.5,75 A19.5,19.5 0 1 0 359.5,75 A19.5,19.5 0 1 0 320.5,75 Z';
const GROW_W_PATH = 'M374.3,46 L390,100 L404,50 L418,100 L433.7,46';

const STROKE = { fill: 'none', strokeWidth: 11, strokeLinecap: 'butt', strokeLinejoin: 'miter', strokeMiterlimit: 10 };

function MarkShapes() {
    return (
        <>
            {MARK_BLOCKS.map(([x, y]) => (
                <rect key={`${x}-${y}`} x={x} y={y} width="28" height="28" rx="6" />
            ))}
            <path d={MARK_LEAF_PATH} />
        </>
    );
}

/** The mark alone, filled with currentColor (watermarks, compact headers). Decorative by default. */
export function LogoMark({ className }) {
    return (
        <svg viewBox="0 0 96 96" className={cn('size-6', className)} fill="currentColor" aria-hidden="true">
            <MarkShapes />
        </svg>
    );
}

/**
 * SellyGrow primary lockup: the mark beside the wordmark.
 * "Selly" reads the theme's text token, so the logo follows light and dark mode.
 */
export function Logo({ className }) {
    const id = useId().replace(/:/g, '');

    return (
        <svg viewBox="0 0 546.5 102" className={cn('w-auto', className ?? 'h-5')} role="img" aria-label="SellyGrow" dir="ltr">
            <defs>
                <clipPath id={`${id}-y`}>
                    <rect x="140" y="50" width="70" height="75" />
                </clipPath>
                <clipPath id={`${id}-w`}>
                    <rect x="370" y="50" width="70" height="50" />
                </clipPath>
            </defs>
            <g transform="scale(0.875)" fill={BRAND_GREEN}>
                <MarkShapes />
            </g>
            <g transform="translate(108.5,-23)">
                <g {...STROKE} style={{ stroke: 'var(--mk-text)' }}>
                    <path d={SELLY_PATH} />
                    <path clipPath={`url(#${id}-y)`} d={SELLY_Y_PATH} />
                </g>
                <g {...STROKE} stroke={BRAND_GREEN}>
                    <path d={GROW_PATH} />
                    <path clipPath={`url(#${id}-w)`} d={GROW_W_PATH} />
                </g>
            </g>
        </svg>
    );
}
