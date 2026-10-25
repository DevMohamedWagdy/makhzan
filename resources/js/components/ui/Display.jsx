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

/**
 * KPI card: tone icon tile and an optional status pill on top, the figure, then its label.
 * A plain-text hint renders as a neutral pill; a node (e.g. TrendBadge) renders as given.
 */
export function StatCard({ label, value, icon, tone = 'primary', hint }) {
    return (
        <div className="mk-card flex min-w-0 flex-col p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', ICON_TONES[tone])}>
                    <Icon name={icon} className="size-5" />
                </span>
                {hint && (
                    <div className="min-w-0 truncate">
                        {typeof hint === 'string' ? <span className="inline-flex h-6 max-w-full items-center truncate rounded-full bg-surface-3 px-2.5 text-[11px] font-medium text-ink-2">{hint}</span> : hint}
                    </div>
                )}
            </div>
            <p className="mk-num mt-4 truncate text-[20px] leading-7 font-bold text-ink sm:text-[24px] sm:leading-8">{value}</p>
            <p className="mt-0.5 truncate text-[12.5px] leading-5 text-muted sm:text-[13px]">{label}</p>
        </div>
    );
}

/** A page's key figures as a row of KPI cards under its header, sharing the width evenly. */
export function StatStrip({ className, children }) {
    return <div className={cn('mk-stat-strip', className)}>{children}</div>;
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
