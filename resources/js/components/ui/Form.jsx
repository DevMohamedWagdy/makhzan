import { forwardRef, useId, useState } from 'react';
import { isRtl, t } from '@/i18n';
import { cn } from '@/lib/format';
import { passwordStrength } from '@/lib/validators';
import { Icon } from './Icon';

/** Label + control + hint/error. Pass a render function to receive the generated id. */
export function Field({ label, hint, error, required, optional, className, children, action }) {
    const id = useId();
    const describedBy = error || hint ? `${id}-help` : undefined;

    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            {label && (
                <div className="flex items-center justify-between gap-2">
                    <label htmlFor={id} className="text-sm font-medium text-ink">
                        {label}
                        {required && <span className="ms-0.5 text-danger">*</span>}
                        {optional && <span className="ms-1.5 text-xs font-normal text-muted">{t('(اختياري)')}</span>}
                    </label>
                    {action}
                </div>
            )}
            {typeof children === 'function' ? children({ id, 'aria-describedby': describedBy }) : children}
            {(error || hint) && (
                <p id={describedBy} className={cn('flex items-start gap-1 text-xs leading-relaxed', error ? 'text-danger' : 'text-muted')}>
                    {error && <Icon name="alert-circle" className="mt-px size-3.5 shrink-0" />}
                    {error || hint}
                </p>
            )}
        </div>
    );
}

export const Input = forwardRef(function Input({ icon, suffix, className, ...props }, ref) {
    return (
        <div className="relative flex items-center">
            {icon && <Icon name={icon} className={cn('pointer-events-none absolute size-[18px] text-muted', isRtl ? 'right-3.5' : 'left-3.5')} />}
            {/* Physical sides from the app language on purpose: an LTR input (email, phone) inside the Arabic shell would flip logical ps/pe away from the icon. */}
            <input ref={ref} className={cn('mk-input', icon && (isRtl ? 'pr-10' : 'pl-10'), suffix && (isRtl ? 'pl-11' : 'pr-11'), className)} {...props} />
            {suffix && <div className={cn('absolute flex items-center', isRtl ? 'left-1.5' : 'right-1.5')}>{suffix}</div>}
        </div>
    );
});

export const PasswordInput = forwardRef(function PasswordInput({ showStrength = false, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    const strength = passwordStrength(props.value ?? '');
    const colors = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-success', 'bg-success'];

    return (
        <div className="flex flex-col gap-2">
            <Input
                ref={ref}
                type={visible ? 'text' : 'password'}
                icon="lock"
                dir="ltr"
                className="text-start"
                autoComplete="new-password"
                suffix={
                    <button
                        type="button"
                        onClick={() => setVisible((value) => !value)}
                        className="grid size-8 place-items-center rounded-md text-muted transition hover:bg-surface-3 hover:text-ink"
                        aria-label={visible ? t('إخفاء كلمة المرور') : t('إظهار كلمة المرور')}
                        title={visible ? t('إخفاء كلمة المرور') : t('إظهار كلمة المرور')}
                    >
                        <Icon name={visible ? 'eye-off' : 'eye'} className="size-[18px]" />
                    </button>
                }
                {...props}
            />
            {showStrength && props.value && (
                <div className="flex items-center gap-3">
                    <div className="flex flex-1 gap-1">
                        {[0, 1, 2, 3].map((index) => (
                            <span key={index} className={cn('h-1 flex-1 rounded-full transition', index < strength.score ? colors[strength.score] : 'bg-surface-3')} />
                        ))}
                    </div>
                    <span className="text-xs text-muted">{t('قوة كلمة المرور: {label}', { label: strength.label })}</span>
                </div>
            )}
        </div>
    );
});

export const Select = forwardRef(function Select({ options, placeholder, className, icon, ...props }, ref) {
    return (
        <div className="relative flex items-center">
            {icon && <Icon name={icon} className="pointer-events-none absolute start-3.5 size-[18px] text-muted" />}
            <select ref={ref} className={cn('mk-input cursor-pointer appearance-none pe-10', icon && 'ps-10', className)} {...props}>
                {placeholder !== undefined && <option value="">{placeholder}</option>}
                {options.map((option) => (
                    <option key={option.value} value={option.value} disabled={option.disabled}>
                        {option.label}
                    </option>
                ))}
            </select>
            <Icon name="chevron-down" className="pointer-events-none absolute end-3.5 size-4 text-muted" />
        </div>
    );
});

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn('mk-input h-auto min-h-[88px] py-2.5 leading-relaxed', className)} {...props} />;
});

export function Checkbox({ label, description, className, ...props }) {
    return (
        <label className={cn('group inline-flex cursor-pointer items-start gap-2.5 select-none', className)}>
            <span className="relative mt-0.5 grid size-[18px] shrink-0 place-items-center">
                <input type="checkbox" className="peer absolute inset-0 cursor-pointer appearance-none rounded-[5px] border-2 border-line-strong bg-surface transition checked:border-primary checked:bg-primary" {...props} />
                <Icon name="check" strokeWidth={3} className="pointer-events-none relative size-3 text-white opacity-0 peer-checked:opacity-100" />
            </span>
            <span className="flex flex-col">
                <span className="text-sm text-ink">{label}</span>
                {description && <span className="text-xs text-muted">{description}</span>}
            </span>
        </label>
    );
}

export function Switch({ checked, onChange, label, description, disabled, id }) {
    return (
        <label className={cn('flex items-center justify-between gap-4', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}>
            {(label || description) && (
                <span className="flex flex-col gap-0.5">
                    {label && <span className="text-sm font-medium text-ink">{label}</span>}
                    {description && <span className="text-xs leading-relaxed text-muted">{description}</span>}
                </span>
            )}
            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:outline-none',
                    checked ? 'bg-primary' : 'bg-line-strong',
                )}
            >
                <span className={cn('absolute size-5 rounded-full bg-white shadow transition-all', checked ? 'start-[22px]' : 'start-0.5')} />
            </button>
        </label>
    );
}

/** Segmented radio cards, e.g. tier or payout selection. */
export function OptionCards({ options, value, onChange, columns = 3, name }) {
    return (
        <div role="radiogroup" className={cn('grid gap-2.5', columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-2' : columns === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3')}>
            {options.map((option) => {
                const selected = option.value === value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        name={name}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'relative flex flex-col items-start gap-1 rounded-xl border p-3 text-start transition',
                            selected ? 'border-primary bg-primary-soft ring-4 ring-primary/10' : 'border-line bg-surface hover:border-line-strong',
                        )}
                    >
                        <span className="flex w-full items-center gap-2">
                            {option.icon && <Icon name={option.icon} className={cn('size-[18px]', selected ? 'text-primary' : 'text-muted')} />}
                            <span className={cn('text-sm font-semibold', selected ? 'text-primary' : 'text-ink')}>{option.label}</span>
                            <span className={cn('ms-auto grid size-4 place-items-center rounded-full border-2', selected ? 'border-primary' : 'border-line-strong')}>
                                {selected && <span className="size-1.5 rounded-full bg-primary" />}
                            </span>
                        </span>
                        {option.description && <span className="text-xs leading-relaxed text-muted">{option.description}</span>}
                    </button>
                );
            })}
        </div>
    );
}
