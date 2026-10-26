import { useEffect, useRef, useState } from 'react';
import { t } from '@/i18n';
import { cn, formatNumber } from '@/lib/format';

const TONE_FILLS = {
    primary: 'bg-brand-accent',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
    neutral: 'bg-muted',
};

/** Rounds the axis maximum up to 1, 2, 2.5 or 5 × a power of ten so gridlines get round labels. */
function niceMax(value) {
    if (value <= 0) {
        return 1;
    }

    const power = 10 ** Math.floor(Math.log10(value));

    return [1, 2, 2.5, 5, 10].map((step) => step * power).find((candidate) => candidate >= value);
}

/** Whether something placed over column `index` should center on it or pin to the start/end edge. */
function edgeAnchor(index, count) {
    const position = (index + 0.5) / count;

    if (position < 0.12) {
        return 'start';
    }

    return position > 0.88 ? 'end' : 'center';
}

/** Inline position for {@link edgeAnchor}; centered items also need the translate classes. */
function edgeAnchorStyle(index, count) {
    const anchor = edgeAnchor(index, count);

    if (anchor === 'start') {
        return { insetInlineStart: 0 };
    }

    return anchor === 'end' ? { insetInlineEnd: 0 } : { insetInlineStart: `${((index + 0.5) / count) * 100}%` };
}

/**
 * Single-series column chart (one bar per day, oldest first in reading direction) with a
 * hover/focus tooltip, three recessive gridlines and thinned x labels. A visually hidden
 * table carries the same numbers for screen readers.
 *
 * @param {{ data: Array<{ key: string, label: string, value: number, detail?: string }>, formatValue?: (value: number) => string, caption: string, height?: number }} props
 */
export function ColumnChart({ data, formatValue = formatNumber, caption, height = 220 }) {
    const [active, setActive] = useState(null);
    const max = niceMax(Math.max(...data.map((point) => point.value), 0));
    const ticks = [max, max / 2, 0];
    const [plotWidth, setPlotWidth] = useState(0);
    const plotRef = useRef(null);

    useEffect(() => {
        const observer = new ResizeObserver(([entry]) => setPlotWidth(entry.contentRect.width));
        observer.observe(plotRef.current);

        return () => observer.disconnect();
    }, []);

    // One date label per ~72px ("22 أكتوبر" is ~45px wide) keeps neighbors from touching at any card width.
    const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(plotWidth / 72))));
    const isIntegerSeries = data.every((point) => Number.isInteger(point.value));
    const hovered = active === null ? null : data[active];

    return (
        <figure className="flex flex-col gap-2">
            <div className="flex gap-3">
                <div className="flex shrink-0 flex-col justify-between text-end text-2xs text-muted" style={{ height }} aria-hidden="true">
                    {ticks.map((tick, index) => (
                        <span key={tick} className="leading-none">
                            {/* A fractional tick on a count series (0.5 orders), or one that rounds to its neighbor's label, stays unlabeled. */}
                            {(isIntegerSeries && !Number.isInteger(tick)) || (index > 0 && formatValue(tick) === formatValue(ticks[index - 1])) ? '' : formatValue(tick)}
                        </span>
                    ))}
                </div>
                <div ref={plotRef} className="relative min-w-0 flex-1">
                    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden="true">
                        {ticks.map((tick) => (
                            <span key={tick} className={cn('border-t', tick === 0 ? 'border-line-strong' : 'border-dashed border-line')} />
                        ))}
                    </div>
                    <div className="relative flex items-end gap-[2px]" style={{ height }} onMouseLeave={() => setActive(null)} aria-hidden="true">
                        {data.map((point, index) => (
                            <div key={point.key} className="group flex h-full min-w-0 flex-1 cursor-default items-end" onMouseEnter={() => setActive(index)}>
                                <span
                                    className={cn('mx-auto w-full max-w-7 rounded-t-[3px] transition-colors', active === null || active === index ? 'bg-brand-accent' : 'bg-brand-accent/35', point.value === 0 && 'opacity-0')}
                                    style={{ height: `${Math.max((point.value / max) * 100, point.value > 0 ? 1.5 : 0)}%` }}
                                />
                            </div>
                        ))}
                    </div>
                    {hovered && (
                        <div
                            className={cn('mk-card pointer-events-none absolute top-0 z-10 px-3 py-2 text-xs whitespace-nowrap shadow-pop', edgeAnchor(active, data.length) === 'center' && '-translate-x-1/2 rtl:translate-x-1/2')}
                            style={edgeAnchorStyle(active, data.length)}
                        >
                            <p className="text-muted">{hovered.label}</p>
                            <p className="mk-num mt-0.5 text-sm font-semibold text-ink">{formatValue(hovered.value)}</p>
                            {hovered.detail && <p className="mt-0.5 text-muted">{hovered.detail}</p>}
                        </div>
                    )}
                    {/* Labels are centered under their column; the outermost ones pin to the chart edge so they never spill past it. */}
                    <div className="relative mt-2 h-4 text-2xs text-muted" aria-hidden="true">
                        {data.map((point, index) =>
                            index % labelEvery === 0 ? (
                                <span
                                    key={point.key}
                                    className={cn('absolute top-0 whitespace-nowrap', edgeAnchor(index, data.length) === 'center' && '-translate-x-1/2 rtl:translate-x-1/2')}
                                    style={edgeAnchorStyle(index, data.length)}
                                >
                                    {point.label}
                                </span>
                            ) : null,
                        )}
                    </div>
                </div>
            </div>
            <table className="sr-only">
                <caption>{caption}</caption>
                <tbody>
                    {data.map((point) => (
                        <tr key={point.key}>
                            <th scope="row">{point.label}</th>
                            <td>{formatValue(point.value)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </figure>
    );
}

/**
 * Ranked horizontal bars (top products, governorates, affiliates): label and value in text
 * colors, the bar only shows the share of the leader.
 *
 * @param {{ items: Array<{ key: string|number, label: React.ReactNode, value: number, display: string, detail?: string }>, emptyText?: string }} props
 */
export function BarList({ items, emptyText = t('لا توجد بيانات في هذه الفترة.') }) {
    if (items.length === 0) {
        return <p className="rounded-xl border border-dashed border-line-strong p-5 text-center text-sm text-muted">{emptyText}</p>;
    }

    const max = Math.max(...items.map((item) => item.value), 1);

    return (
        <ol className="flex flex-col gap-3.5">
            {items.map((item, index) => (
                <li key={item.key}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-baseline gap-2">
                            <span className="w-4 shrink-0 text-xs text-muted">{formatNumber(index + 1)}</span>
                            <span className="truncate font-medium text-ink">{item.label}</span>
                        </span>
                        <span className="mk-num shrink-0 font-semibold text-ink">{item.display}</span>
                    </div>
                    {item.detail && <p className="ms-6 mt-0.5 text-xs text-muted">{item.detail}</p>}
                    <div className="ms-6 mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                        <div className="h-full rounded-full bg-brand-accent" style={{ width: `${(item.value / max) * 100}%` }} />
                    </div>
                </li>
            ))}
        </ol>
    );
}

/**
 * Part-to-whole bar (e.g. orders by status) with a legend that carries the labels and counts,
 * so identity never depends on color alone.
 *
 * @param {{ segments: Array<{ key: string, label: string, value: number, tone: keyof TONE_FILLS }> }} props
 */
export function SegmentedBar({ segments }) {
    const total = segments.reduce((sum, segment) => sum + segment.value, 0);
    const visible = segments.filter((segment) => segment.value > 0);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex h-3 gap-[2px] overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
                {visible.map((segment) => (
                    <span key={segment.key} className={cn('h-full first:rounded-s-full last:rounded-e-full', TONE_FILLS[segment.tone])} style={{ width: `${(segment.value / total) * 100}%` }} />
                ))}
            </div>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                {segments.map((segment) => (
                    <li key={segment.key} className="flex items-center gap-2 text-sm">
                        <span className={cn('size-2.5 shrink-0 rounded-full', TONE_FILLS[segment.tone])} />
                        <span className="truncate text-ink-2">{segment.label}</span>
                        <span className="mk-num ms-auto font-semibold text-ink">{formatNumber(segment.value)}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/**
 * Change against the previous period, e.g. "▲ 12%". `inverse` flips the colors for metrics
 * where a rise is bad (cancellations). The arrow and sign carry the direction, not only color.
 */
export function TrendBadge({ current, previous, inverse = false }) {
    if (!previous) {
        return current ? <span className="text-xs text-muted">{t('جديد في هذه الفترة')}</span> : null;
    }

    const change = ((current - previous) / previous) * 100;
    const rounded = Math.round(Math.abs(change));

    if (rounded === 0) {
        return <span className="text-xs text-muted">{t('دون تغيير')}</span>;
    }

    const good = change > 0 !== inverse;

    return (
        <span className={cn('inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-2xs font-semibold', good ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
            <span aria-hidden="true" className="text-3xs">{change > 0 ? '▲' : '▼'}</span>
            <span className="ltr">{`${change > 0 ? '+' : '-'}${formatNumber(rounded)}%`}</span>
            <span className="sr-only">{t('مقارنة بالفترة السابقة')}</span>
        </span>
    );
}
