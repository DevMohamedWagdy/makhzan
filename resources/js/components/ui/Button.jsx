import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/format';
import { Icon } from './Icon';
import { Spinner } from './Spinner';

const VARIANTS = {
    primary: 'bg-primary text-white hover:bg-primary-hover',
    secondary: 'border border-line bg-surface text-ink hover:bg-surface-3',
    soft: 'bg-primary-soft text-primary hover:bg-primary/15',
    ghost: 'text-ink-2 hover:bg-surface-3 hover:text-ink',
    danger: 'bg-danger text-white hover:opacity-90',
    'danger-soft': 'bg-danger-soft text-danger hover:bg-danger/15',
    success: 'bg-success text-white hover:opacity-90',
    // Marketing bands on Ink (bg-brand) only: Sprout is unreadable on light surfaces.
    sprout: 'bg-sprout font-semibold text-brand hover:bg-sprout/90',
    'outline-light': 'border border-white/30 text-white hover:bg-white/10',
};

const SIZES = {
    sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
    md: 'h-10 px-4 text-sm gap-2 rounded-lg',
    lg: 'h-12 px-6 text-sm gap-2 rounded-xl',
    xl: 'h-14 px-7 text-[15px] gap-2 rounded-xl',
    icon: 'size-9 rounded-lg',
};

export const Button = forwardRef(function Button(
    { variant = 'primary', size = 'md', icon, iconEnd, loading = false, disabled, className, children, type = 'button', to, ...props },
    ref,
) {
    const classes = cn(
        'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition select-none',
        'focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55',
        VARIANTS[variant],
        SIZES[size],
        className,
    );
    const content = (
        <>
            {loading ? <Spinner className="size-4" /> : icon && <Icon name={icon} className="size-4" />}
            {children}
            {iconEnd && !loading && <Icon name={iconEnd} className="size-4" />}
        </>
    );

    // `to` renders a router link styled as a button (avoids nesting <button> inside <a>).
    if (to) {
        return (
            <Link ref={ref} to={to} className={classes} {...props}>
                {content}
            </Link>
        );
    }

    return (
        <button ref={ref} type={type} disabled={disabled || loading} className={classes} {...props}>
            {content}
        </button>
    );
});
