import { useRef } from 'react';
import { isRtl, t } from '@/i18n';
import { cn, formatNumber } from '@/lib/format';
import { Icon } from './Icon';

/**
 * Tabs with arrow-key navigation (direction aware). `variant="underline"` sits on a section edge;
 * `variant="segmented"` is a compact pill switch for card headers (e.g. a chart's measure).
 */
export function Tabs({ tabs, value, onChange, className, variant = 'underline' }) {
    const segmented = variant === 'segmented';

    const listRef = useRef(null);

    const onKeyDown = (event) => {
        // Arrow keys follow the reading direction: in Arabic, left moves forward.
        const keys = isRtl ? { ArrowLeft: 1, ArrowRight: -1 } : { ArrowLeft: -1, ArrowRight: 1 };

        if (!(event.key in keys)) {
            return;
        }

        const index = tabs.findIndex((tab) => tab.value === value);
        const next = tabs[(index + keys[event.key] + tabs.length) % tabs.length];

        onChange(next.value);
        listRef.current?.querySelector(`[data-tab="${next.value}"]`)?.focus();
    };

    return (
        <div
            ref={listRef}
            role="tablist"
            onKeyDown={onKeyDown}
            className={cn(segmented ? 'inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg bg-surface-3 p-0.5' : 'flex gap-1 overflow-x-auto border-b border-line', className)}
        >
            {tabs.map((tab) => {
                const selected = tab.value === value;

                return (
                    <button
                        key={tab.value}
                        data-tab={tab.value}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        tabIndex={selected ? 0 : -1}
                        onClick={() => onChange(tab.value)}
                        className={cn(
                            segmented
                                ? cn('flex h-8 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-medium whitespace-nowrap transition', selected ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(18_26_33/0.08),0_0_0_1px_var(--mk-border)]' : 'text-muted hover:text-ink')
                                : cn('-mb-px flex h-11 items-center gap-2 border-b-2 px-3 text-[13.5px] font-medium whitespace-nowrap transition', selected ? 'border-primary text-ink [&>svg]:text-primary' : 'border-transparent text-muted hover:border-line-strong hover:text-ink'),
                        )}
                    >
                        {tab.icon && <Icon name={tab.icon} className="size-[18px]" />}
                        {tab.label}
                        {tab.count !== undefined && (
                            <span className={cn('mk-num grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold', selected ? 'bg-primary-soft text-primary' : 'bg-surface-3 text-muted')}>{formatNumber(tab.count)}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

function pageWindow(current, last) {
    const pages = new Set([1, last, current, current - 1, current + 1]);
    const sorted = [...pages].filter((page) => page >= 1 && page <= last).sort((a, b) => a - b);

    return sorted.flatMap((page, index) => (index && page - sorted[index - 1] > 1 ? ['gap', page] : [page]));
}

export function Pagination({ meta, onPageChange }) {
    const { current_page, last_page, total, per_page } = meta;
    const from = total === 0 ? 0 : (current_page - 1) * per_page + 1;
    const to = Math.min(current_page * per_page, total);

    const pageButton = 'mk-num grid h-8 min-w-8 place-items-center rounded-lg px-2 text-[13px] transition disabled:cursor-not-allowed disabled:opacity-40';

    return (
        <nav className="flex flex-col items-center justify-between gap-3 sm:flex-row" aria-label={t('التنقل بين الصفحات')}>
            <p className="mk-num text-[13px] text-muted">
                {t('عرض {from} إلى {to} من أصل {total}', { from: formatNumber(from), to: formatNumber(to), total: formatNumber(total) })}
            </p>
            <div className="flex items-center gap-1">
                <button type="button" className={cn(pageButton, 'text-ink-2 hover:bg-surface-3')} disabled={current_page <= 1} onClick={() => onPageChange(current_page - 1)} aria-label={t('الصفحة السابقة')} title={t('الصفحة السابقة')}>
                    <Icon name="chevron-right" className="size-4" />
                </button>
                {pageWindow(current_page, last_page).map((page, index) =>
                    page === 'gap' ? (
                        <span key={`gap-${index}`} className="px-1 text-muted">
                            …
                        </span>
                    ) : (
                        <button
                            key={page}
                            type="button"
                            onClick={() => onPageChange(page)}
                            aria-current={page === current_page ? 'page' : undefined}
                            className={cn(pageButton, page === current_page ? 'bg-ink font-semibold text-surface' : 'text-ink-2 hover:bg-surface-3')}
                        >
                            {formatNumber(page)}
                        </button>
                    ),
                )}
                <button type="button" className={cn(pageButton, 'text-ink-2 hover:bg-surface-3')} disabled={current_page >= last_page} onClick={() => onPageChange(current_page + 1)} aria-label={t('الصفحة التالية')} title={t('الصفحة التالية')}>
                    <Icon name="chevron-left" className="size-4" />
                </button>
            </div>
        </nav>
    );
}

/**
 * Horizontal wizard stepper (Metronic style).
 * @param {{ steps: Array<{ title: string, description: string, icon: string }>, current: number }} props
 */
export function Stepper({ steps, current }) {
    return (
        <ol className="flex items-center gap-3">
            {steps.map((step, index) => {
                const state = index < current ? 'done' : index === current ? 'active' : 'upcoming';

                return (
                    <li key={step.title} className={cn('flex items-center gap-3', index < steps.length - 1 && 'flex-1')} aria-current={state === 'active' ? 'step' : undefined}>
                        <span
                            className={cn(
                                'grid size-11 shrink-0 place-items-center rounded-xl text-sm font-bold transition',
                                state === 'done' && 'bg-success-soft text-success',
                                state === 'active' && 'bg-primary text-white shadow-[0_0_0_4px_var(--mk-ring)]',
                                state === 'upcoming' && 'bg-surface-3 text-muted',
                            )}
                        >
                            {state === 'done' ? <Icon name="check" strokeWidth={2.6} className="size-5" /> : <Icon name={step.icon} className="size-5" />}
                        </span>
                        <span className="hidden min-w-0 flex-col sm:flex">
                            <span className={cn('text-sm font-semibold', state === 'upcoming' ? 'text-muted' : 'text-ink')}>{step.title}</span>
                            <span className="truncate text-xs text-muted">{step.description}</span>
                        </span>
                        {index < steps.length - 1 && (
                            <span className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                                <span className={cn('absolute inset-y-0 start-0 bg-success transition-all duration-500', index < current ? 'w-full' : 'w-0')} />
                            </span>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
