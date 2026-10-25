import { createContext, useContext } from 'react';
import { cn, initials } from '@/lib/format';
import { Icon } from './Icon';

const BADGE_TONES = {
    success: 'bg-success-soft text-success',
    danger: 'bg-danger-soft text-danger',
    warning: 'bg-warning-soft text-warning',
    info: 'bg-info-soft text-info',
    primary: 'bg-primary-soft text-primary',
    neutral: 'bg-surface-3 text-ink-2',
};

export function Badge({ tone = 'neutral', dot = false, icon, className, children }) {
    return (
        <span className={cn('inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] leading-none font-medium whitespace-nowrap ring-1 ring-current/12 ring-inset', BADGE_TONES[tone], className)}>
            {dot && <span className="size-1.5 rounded-full bg-current" />}
            {icon && <Icon name={icon} className="size-3.5" />}
            {children}
        </span>
    );
}

const AVATAR_COLORS = ['bg-primary-soft text-primary', 'bg-success-soft text-success', 'bg-warning-soft text-warning', 'bg-info-soft text-info', 'bg-danger-soft text-danger'];
const AVATAR_SIZES = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-lg', xl: 'size-20 text-2xl' };

/** `shape`: 'rounded' for stores and brands, 'circle' for people in compact chrome. */
export function Avatar({ name = '', src, size = 'md', className, ring = false, shape = 'rounded' }) {
    const colorIndex = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_COLORS.length;

    return (
        <span
            className={cn(
                'inline-grid shrink-0 place-items-center overflow-hidden font-semibold',
                shape === 'circle' ? 'rounded-full' : size === 'sm' ? 'rounded-lg' : 'rounded-xl',
                AVATAR_SIZES[size],
                !src && AVATAR_COLORS[colorIndex],
                ring && 'ring-4 ring-surface',
                className,
            )}
        >
            {src ? <img src={src} alt={name} className="size-full object-cover" /> : <span aria-hidden="true">{initials(name)}</span>}
        </span>
    );
}

export function Card({ title, description, actions, className, bodyClassName, children }) {
    return (
        <section className={cn('mk-card', className)}>
            {(title || actions) && (
                <header className="flex min-h-[60px] flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                    <div className="min-w-0">
                        {title && <h2 className="text-[15px] leading-6 font-semibold text-ink">{title}</h2>}
                        {description && <p className="mt-0.5 text-[12.5px] leading-5 text-muted">{description}</p>}
                    </div>
                    {actions && <div className="flex items-center gap-2">{actions}</div>}
                </header>
            )}
            <div className={cn('p-5', bodyClassName)}>{children}</div>
        </section>
    );
}

/** Icon tiles carry the logo green; badge text keeps the deeper, readable green. */
const ICON_TONES = { ...BADGE_TONES, primary: 'bg-primary-soft text-brand-green' };

/** Inside a StatStrip, StatCards render as compact inline figures instead of tiles. */
const StatStripContext = createContext(false);

const ICON_TEXT = { primary: 'text-brand-green', success: 'text-success', warning: 'text-warning', danger: 'text-danger', info: 'text-info', neutral: 'text-muted' };

export function StatCard({ label, value, icon, tone = 'primary', hint }) {
    const inStrip = useContext(StatStripContext);

    if (inStrip) {
        return (
            <div className="flex min-w-0 flex-col gap-1 md:border-s md:border-line md:ps-6 md:first:border-s-0 md:first:ps-0">
                <p className="flex items-center gap-1.5 text-[12.5px] leading-5 font-medium text-muted">
                    <Icon name={icon} className={cn('size-3.5 shrink-0', ICON_TEXT[tone])} />
                    <span className="truncate">{label}</span>
                </p>
                <p className="mk-num truncate text-[20px] leading-7 font-semibold text-ink sm:text-[22px] sm:leading-8">{value}</p>
                {hint && <div className="text-xs text-muted">{hint}</div>}
            </div>
        );
    }

    return (
        <div className="mk-card flex min-w-0 flex-col p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <p className="text-[12.5px] leading-5 font-medium text-muted sm:text-[13px]">{label}</p>
                <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', ICON_TONES[tone])}>
                    <Icon name={icon} className="size-4" />
                </span>
            </div>
            <p className="mk-num mt-1.5 truncate text-[19px] leading-7 font-semibold text-ink sm:mt-2 sm:text-[26px] sm:leading-9">{value}</p>
            {hint && <div className="mt-1.5 text-xs text-muted">{hint}</div>}
        </div>
    );
}

/**
 * The page's key figures as one compact row under the page title (two per row on phones), so
 * the table below starts higher. Placed after a PageHeader, it joins the header zone.
 */
export function StatStrip({ className, children }) {
    return (
        <StatStripContext.Provider value>
            <div className={cn('mk-stat-strip grid grid-cols-2 gap-x-6 gap-y-5 md:grid-flow-col md:auto-cols-fr', className)}>{children}</div>
        </StatStripContext.Provider>
    );
}

export function EmptyState({ icon = 'users', title, description, action }) {
    return (
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
            <span className="relative grid size-14 place-items-center rounded-2xl border border-line bg-surface-2 text-muted shadow-card">
                <span aria-hidden="true" className="absolute -inset-2 rounded-[22px] border border-dashed border-line" />
                <Icon name={icon} className="size-6" />
            </span>
            <div>
                <p className="text-[15px] font-semibold text-ink">{title}</p>
                {description && <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">{description}</p>}
            </div>
            {action}
        </div>
    );
}

export function Alert({ tone = 'info', icon, title, children, className }) {
    const icons = { info: 'info', warning: 'alert-triangle', danger: 'alert-circle', success: 'check-circle' };

    return (
        <div role={tone === 'danger' ? 'alert' : undefined} className={cn('flex gap-3 rounded-xl p-3.5 text-[13.5px] ring-1 ring-current/15 ring-inset', BADGE_TONES[tone], className)}>
            <Icon name={icon ?? icons[tone]} className="mt-0.5 size-[18px] shrink-0" />
            <div className="leading-relaxed">
                {title && <p className="font-semibold">{title}</p>}
                {children && <div className={cn(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
            </div>
        </div>
    );
}

/** Key/value row for detail panels. */
export function DetailRow({ label, children, ltr = false }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2.5">
            <dt className="shrink-0 text-sm text-muted">{label}</dt>
            <dd className={cn('min-w-0 text-end text-sm font-medium break-words text-ink', ltr && 'ltr')}>{children ?? '—'}</dd>
        </div>
    );
}
