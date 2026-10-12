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
        <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap', BADGE_TONES[tone], className)}>
            {dot && <span className="size-1.5 rounded-full bg-current" />}
            {icon && <Icon name={icon} className="size-3.5" />}
            {children}
        </span>
    );
}

const AVATAR_COLORS = ['bg-primary-soft text-primary', 'bg-success-soft text-success', 'bg-warning-soft text-warning', 'bg-info-soft text-info', 'bg-danger-soft text-danger'];
const AVATAR_SIZES = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-lg', xl: 'size-20 text-2xl' };

export function Avatar({ name = '', src, size = 'md', className, ring = false }) {
    const colorIndex = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_COLORS.length;

    return (
        <span
            className={cn(
                'inline-grid shrink-0 place-items-center overflow-hidden rounded-xl font-semibold',
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
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                    <div>
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

export function StatCard({ label, value, icon, tone = 'primary', hint }) {
    return (
        <div className="mk-card flex items-center gap-4 p-5">
            <span className={cn('grid size-12 shrink-0 place-items-center rounded-xl', BADGE_TONES[tone])}>
                <Icon name={icon} className="size-6" />
            </span>
            <div className="min-w-0">
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-1 truncate text-xl font-bold text-ink">{value}</p>
                {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
            </div>
        </div>
    );
}

export function EmptyState({ icon = 'users', title, description, action }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-surface-3 text-muted">
                <Icon name={icon} className="size-8" />
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
        <div role={tone === 'danger' ? 'alert' : undefined} className={cn('flex gap-3 rounded-xl p-3.5 text-sm', BADGE_TONES[tone], className)}>
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
