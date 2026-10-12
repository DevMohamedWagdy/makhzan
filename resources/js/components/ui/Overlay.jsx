import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLockBodyScroll } from '@/hooks/common';
import { cn } from '@/lib/format';
import { Icon } from './Icon';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Open dialogs, top-most last, so Escape only closes the dialog on top (e.g. a confirm over a drawer). */
const dialogStack = [];

/** Shared focus trap, Escape handling and focus restore for dialogs. */
function useDialog(open, containerRef, onEscape) {
    const onEscapeRef = useRef(onEscape);
    onEscapeRef.current = onEscape;

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const token = {};
        dialogStack.push(token);

        const onDocumentKeyDown = (event) => {
            if (event.key === 'Escape' && dialogStack.at(-1) === token) {
                event.stopPropagation();
                onEscapeRef.current();
            }
        };

        document.addEventListener('keydown', onDocumentKeyDown);

        const previouslyFocused = document.activeElement;
        const container = containerRef.current;
        const first = container?.querySelector('[data-autofocus]') ?? container?.querySelector(FOCUSABLE);

        first?.focus({ preventScroll: true });

        const onKeyDown = (event) => {
            if (event.key !== 'Tab' || !container) {
                return;
            }

            const items = [...container.querySelectorAll(FOCUSABLE)];

            if (!items.length) {
                return;
            }

            const [head, tail] = [items[0], items.at(-1)];

            if (event.shiftKey && document.activeElement === head) {
                event.preventDefault();
                tail.focus();
            } else if (!event.shiftKey && document.activeElement === tail) {
                event.preventDefault();
                head.focus();
            }
        };

        container?.addEventListener('keydown', onKeyDown);

        return () => {
            dialogStack.splice(dialogStack.indexOf(token), 1);
            document.removeEventListener('keydown', onDocumentKeyDown);
            container?.removeEventListener('keydown', onKeyDown);
            previouslyFocused?.focus?.({ preventScroll: true });
        };
    }, [open, containerRef]);
}

function DialogHeader({ titleId, title, description, icon, iconTone = 'primary', onClose }) {
    const tones = { primary: 'bg-primary-soft text-primary', danger: 'bg-danger-soft text-danger', warning: 'bg-warning-soft text-warning', success: 'bg-success-soft text-success' };

    return (
        <header className="flex items-start gap-3.5 border-b border-line px-6 py-5">
            {icon && (
                <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', tones[iconTone])}>
                    <Icon name={icon} className="size-5" />
                </span>
            )}
            <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-lg font-semibold text-ink">
                    {title}
                </h2>
                {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-3 hover:text-ink" aria-label="إغلاق" title="إغلاق">
                <Icon name="x" />
            </button>
        </header>
    );
}

export function Modal({ open, onClose, title, description, icon, iconTone, size = 'md', footer, children, dismissible = true }) {
    const titleId = useId();
    const panelRef = useRef(null);
    const close = () => dismissible && onClose();

    useLockBodyScroll(open);
    useDialog(open, panelRef, close);

    if (!open) {
        return null;
    }

    const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
            <div className="animate-fade-in absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={close} />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className={cn('mk-card animate-pop relative flex max-h-[92vh] w-full flex-col rounded-b-none shadow-pop sm:rounded-xl', widths[size])}
            >
                <DialogHeader titleId={titleId} title={title} description={description} icon={icon} iconTone={iconTone} onClose={close} />
                <div className="mk-scroll flex-1 overflow-y-auto px-6 py-5">{children}</div>
                {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2 px-6 py-4 sm:rounded-b-xl">{footer}</footer>}
            </div>
        </div>,
        document.body,
    );
}

/** Side panel. In RTL it opens from the left (inline-end) edge, Metronic-style. */
export function Drawer({ open, onClose, title, description, icon, size = 'md', footer, header, children }) {
    const titleId = useId();
    const panelRef = useRef(null);

    useLockBodyScroll(open);
    useDialog(open, panelRef, onClose);

    if (!open) {
        return null;
    }

    const widths = { md: 'max-w-xl', lg: 'max-w-2xl' };

    return createPortal(
        <div className="fixed inset-0 z-50">
            <div className="animate-fade-in absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={onClose} />
            <aside
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className={cn('animate-slide-in absolute inset-y-0 left-0 flex w-full flex-col border-e border-line bg-surface shadow-pop', widths[size])}
            >
                {header ?? <DialogHeader titleId={titleId} title={title} description={description} icon={icon} onClose={onClose} />}
                {header && <h2 id={titleId} className="sr-only">{title}</h2>}
                <div className="mk-scroll flex-1 overflow-y-auto">{children}</div>
                {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2 px-6 py-4">{footer}</footer>}
            </aside>
        </div>,
        document.body,
    );
}
