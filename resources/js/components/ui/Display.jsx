import { intlLocale, t } from '@/i18n';
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
        <span className={cn('inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-2xs leading-none font-medium whitespace-nowrap ring-1 ring-current/12 ring-inset', BADGE_TONES[tone], className)}>
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
                        {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
                        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
                    </div>
                    {actions && <div className="flex items-center gap-2">{actions}</div>}
                </header>
            )}
            <div className={cn('p-5', bodyClassName)}>{children}</div>
        </section>
    );
}

/** Icon tiles carry the logo green; badge text keeps the deeper, readable green. */
const ICON_TONES = { ...BADGE_TONES, primary: 'bg-primary-soft text-brand-accent' };

/**
 * KPI card: the label with a small tone icon tile beside it, the figure, then an optional hint underneath.
 * A plain-text hint renders as a neutral pill; a node (e.g. TrendBadge) renders as given. With `onClick` the
 * card is a quick filter: a button that shows `isActive` with a primary ring.
 */
export function StatCard({ label, value, icon, tone = 'primary', hint, onClick, isActive = false }) {
    const Tag = onClick ? 'button' : 'div';

    return (
        <Tag
            {...(onClick && { type: 'button', onClick, 'aria-pressed': isActive })}
            className={cn(
                'mk-card flex min-w-0 flex-col p-4 text-start sm:p-5',
                onClick && 'mk-card-link cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive && 'border-primary/60 ring-1 ring-primary/40',
            )}
        >
            <span className="flex w-full items-start justify-between gap-3">
                <span className="min-w-0 truncate pt-1 text-xs font-medium text-muted sm:text-sm">{label}</span>
                <span className={cn('grid size-9 shrink-0 place-items-center rounded-lg', ICON_TONES[tone])}>
                    <Icon name={icon} className="size-[18px]" />
                </span>
            </span>
            <span className="mk-num mt-1.5 block truncate text-xl font-semibold tracking-tight text-ink sm:text-[26px] sm:leading-9">{value}</span>
            {hint && (
                <span className="mt-2.5 block min-w-0 truncate">
                    {typeof hint === 'string' ? <span className="inline-flex h-6 max-w-full items-center truncate rounded-full bg-surface-3 px-2.5 text-2xs font-medium text-ink-2">{hint}</span> : hint}
                </span>
            )}
        </Tag>
    );
}

/**
 * Bulk actions for the rows picked in a table: a night-navy bar that floats at the bottom of the page while
 * anything is selected, with the count, the actions and a way to clear the selection.
 */
export function SelectionBar({ count, onClear, children }) {
    if (count === 0) {
        return null;
    }

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-30 flex justify-center px-4 lg:ps-[280px]">
            <div role="region" aria-label={t('إجراءات العناصر المختارة')} className="animate-pop pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-2xl bg-brand py-2 ps-4 pe-2 text-white shadow-[0_20px_40px_-12px_rgb(10_21_50/0.5)]">
                <span className="mk-num me-2 text-sm font-medium">{t('تم اختيار {count}', { count })}</span>
                {children}
                <button type="button" onClick={onClear} className="grid size-9 place-items-center rounded-lg text-panel-muted transition hover:bg-white/10 hover:text-white" aria-label={t('إلغاء الاختيار')} title={t('إلغاء الاختيار')}>
                    <Icon name="x" className="size-[18px]" />
                </button>
            </div>
        </div>
    );
}

const todayLabel = new Intl.DateTimeFormat(intlLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** "Good morning, {name}" before noon, "Good evening, {name}" after: the greeting on home pages. */
export function greetingFor(name) {
    return new Date().getHours() < 12 ? t('صباح الخير، {name}', { name }) : t('مساء الخير، {name}', { name });
}

/**
 * The top of a home page: a light card with today's date, the greeting, a line under it, optional meta
 * (badges), an optional aside (a highlighted figure) and the page's main actions, over a faint navy glow.
 */
export function WelcomeBanner({ title, description, meta, actions, aside, className }) {
    return (
        <section className={cn('relative isolate mb-6 overflow-hidden rounded-2xl border border-line bg-surface px-5 py-5 shadow-card sm:px-7 sm:py-6', className)}>
            <div className="pointer-events-none absolute -start-24 -top-28 -z-10 size-72 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-y-0 start-0 -z-10 w-1 bg-gradient-to-b from-primary to-gold" aria-hidden="true" />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-2xs font-medium text-primary">
                        <Icon name="clock" className="size-3.5" />
                        {todayLabel.format(new Date())}
                    </span>
                    <h1 className="mt-3 text-xl font-semibold text-ink sm:text-2xl">{title}</h1>
                    {description && <p className="mt-1 max-w-xl text-sm text-muted">{description}</p>}
                    {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
                </div>
                {aside}
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
        </section>
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
                <p className="text-base font-semibold text-ink">{title}</p>
                {description && <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">{description}</p>}
            </div>
            {action}
        </div>
    );
}

export function Alert({ tone = 'info', icon, title, children, className }) {
    const icons = { info: 'info', warning: 'alert-triangle', danger: 'alert-circle', success: 'check-circle' };

    return (
        <div role={tone === 'danger' ? 'alert' : undefined} className={cn('flex gap-3 rounded-xl p-3.5 text-sm ring-1 ring-current/15 ring-inset', BADGE_TONES[tone], className)}>
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
