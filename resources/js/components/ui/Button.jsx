import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/format';
import { Icon } from './Icon';
import { Spinner } from './Spinner';

const VARIANTS = {
    primary: 'bg-primary text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.1)] hover:bg-primary-hover active:translate-y-px',
    secondary: 'border border-line-strong/80 bg-surface text-ink hover:border-line-strong hover:bg-surface-2 active:bg-surface-3',
    soft: 'bg-primary-soft text-primary hover:bg-primary/15',
    ghost: 'text-ink-2 hover:bg-surface-3 hover:text-ink',
    danger: 'bg-danger text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12)] hover:brightness-95 active:translate-y-px',
    'danger-soft': 'bg-danger-soft text-danger hover:bg-danger/15',
    success: 'bg-success text-white hover:brightness-95',
    // Growth Gold with night-navy text: the CTA on dark brand bands (bg-brand).
    brand: 'bg-gold font-semibold text-brand shadow-[inset_0_1px_0_rgb(255_255_255/0.3)] hover:brightness-105',
    'outline-light': 'border border-white/20 text-white hover:border-white/35 hover:bg-white/[0.06]',
};

/** Heights sit on the 4px grid: 32 · 40 · 44 · 52, icon buttons 36. */
const SIZES = {
    sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
    md: 'h-10 px-4 text-[13.5px] gap-2 rounded-lg',
    lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
    xl: 'h-[52px] px-7 text-[15px] gap-2.5 rounded-xl',
    icon: 'size-9 rounded-lg',
};

export const Button = forwardRef(function Button(
    { variant = 'primary', size = 'md', icon, iconEnd, loading = false, disabled, className, children, type = 'button', to, ...props },
    ref,
) {
    const classes = cn(
        'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition duration-150 select-none',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
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
