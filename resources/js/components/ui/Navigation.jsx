import { useRef } from 'react';
import { cn, formatNumber } from '@/lib/format';
import { Icon } from './Icon';

/** Underlined tabs with arrow-key navigation (RTL aware). */
export function Tabs({ tabs, value, onChange, className }) {
    const listRef = useRef(null);

    const onKeyDown = (event) => {
        const keys = { ArrowLeft: 1, ArrowRight: -1 }; // RTL: left moves forward.

        if (!(event.key in keys)) {
            return;
        }

        const index = tabs.findIndex((tab) => tab.value === value);
        const next = tabs[(index + keys[event.key] + tabs.length) % tabs.length];

        onChange(next.value);
        listRef.current?.querySelector(`[data-tab="${next.value}"]`)?.focus();
    };

    return (
        <div ref={listRef} role="tablist" onKeyDown={onKeyDown} className={cn('flex gap-1 overflow-x-auto border-b border-line', className)}>
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
                            '-mb-px flex items-center gap-2 border-b-2 px-3.5 py-3 text-sm font-medium whitespace-nowrap transition',
                            selected ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink',
                        )}
                    >
                        {tab.icon && <Icon name={tab.icon} className="size-[18px]" />}
                        {tab.label}
                        {tab.count !== undefined && (
                            <span className={cn('rounded-md px-1.5 py-0.5 text-[11px]', selected ? 'bg-primary-soft' : 'bg-surface-3')}>{formatNumber(tab.count)}</span>
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

    const pageButton = 'grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40';

    return (
        <nav className="flex flex-col items-center justify-between gap-3 sm:flex-row" aria-label="التنقل بين الصفحات">
            <p className="text-sm text-muted">
                عرض <span className="font-medium text-ink">{formatNumber(from)}</span> إلى <span className="font-medium text-ink">{formatNumber(to)}</span> من أصل{' '}
                <span className="font-medium text-ink">{formatNumber(total)}</span> مسوق
            </p>
            <div className="flex items-center gap-1">
                <button type="button" className={cn(pageButton, 'text-ink-2 hover:bg-surface-3')} disabled={current_page <= 1} onClick={() => onPageChange(current_page - 1)} aria-label="الصفحة السابقة" title="الصفحة السابقة">
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
                            className={cn(pageButton, page === current_page ? 'bg-primary font-semibold text-white' : 'text-ink-2 hover:bg-surface-3')}
                        >
                            {formatNumber(page)}
                        </button>
                    ),
                )}
                <button type="button" className={cn(pageButton, 'text-ink-2 hover:bg-surface-3')} disabled={current_page >= last_page} onClick={() => onPageChange(current_page + 1)} aria-label="الصفحة التالية" title="الصفحة التالية">
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
                                state === 'active' && 'bg-primary text-white shadow-lg shadow-primary/30',
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
