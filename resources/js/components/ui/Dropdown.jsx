import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useClickOutside } from '@/hooks/common';
import { t } from '@/i18n';
import { cn } from '@/lib/format';
import { Icon } from './Icon';

const MENU_WIDTH = 224;

/**
 * Action menu rendered in a portal with fixed positioning, so it is never clipped
 * by scrollable table containers.
 * @param {{ trigger: (props: object) => JSX.Element, items: Array<{ label: string, icon?: string, onClick?: Function, tone?: 'danger'|'success', divider?: boolean, hidden?: boolean, disabled?: boolean, hint?: string }> }} props
 */
export function Dropdown({ trigger, items, label = t('الإجراءات') }) {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState(null);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);

    useClickOutside(menuRef, (event) => !triggerRef.current?.contains(event.target) && setOpen(false), open);

    useLayoutEffect(() => {
        if (!open) {
            return undefined;
        }

        const place = () => {
            const rect = triggerRef.current.getBoundingClientRect();
            const menuHeight = menuRef.current?.offsetHeight ?? 280;
            const openUp = rect.bottom + menuHeight + 12 > window.innerHeight && rect.top > menuHeight;
            const left = Math.min(Math.max(8, rect.left), window.innerWidth - MENU_WIDTH - 8);

            setPosition({ left, top: openUp ? rect.top - menuHeight - 6 : rect.bottom + 6 });
        };

        place();
        menuRef.current?.querySelector('button:not([disabled])')?.focus({ preventScroll: true });
        // Follow the trigger when any ancestor scrolls (e.g. the table's horizontal scroller).
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);

        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [open]);

    const onMenuKeyDown = (event) => {
        // Handled here (not on document) so Escape doesn't also close a parent drawer.
        if (event.key === 'Escape' || event.key === 'Tab') {
            event.stopPropagation();
            setOpen(false);
            triggerRef.current?.focus();

            return;
        }

        if (!['ArrowDown', 'ArrowUp'].includes(event.key)) {
            return;
        }

        event.preventDefault();
        const buttons = [...menuRef.current.querySelectorAll('button:not([disabled])')];
        const index = buttons.indexOf(document.activeElement);
        const next = event.key === 'ArrowDown' ? (index + 1) % buttons.length : (index - 1 + buttons.length) % buttons.length;

        buttons[next]?.focus();
    };

    const visibleItems = items.filter((item) => !item.hidden);

    return (
        <>
            {trigger({
                ref: triggerRef,
                onClick: () => setOpen((value) => !value),
                'aria-haspopup': 'menu',
                'aria-expanded': open,
                'aria-label': label,
            })}
            {open &&
                createPortal(
                    <div
                        ref={menuRef}
                        role="menu"
                        onKeyDown={onMenuKeyDown}
                        style={{ width: MENU_WIDTH, left: position?.left ?? -9999, top: position?.top ?? -9999 }}
                        className="mk-card animate-pop fixed z-[60] p-1.5 shadow-pop"
                    >
                        {visibleItems.map((item, index) =>
                            item.divider ? (
                                <div key={`divider-${index}`} className="-mx-1.5 my-1.5 h-px bg-line" />
                            ) : (
                                <button
                                    key={item.label}
                                    type="button"
                                    role="menuitem"
                                    disabled={item.disabled}
                                    title={item.hint}
                                    onClick={() => {
                                        setOpen(false);
                                        item.onClick?.();
                                    }}
                                    className={cn(
                                        'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-start text-[13.5px] transition focus:shadow-none focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                                        item.tone === 'danger'
                                            ? 'text-danger hover:bg-danger-soft focus:bg-danger-soft'
                                            : item.tone === 'success'
                                              ? 'text-success hover:bg-success-soft focus:bg-success-soft'
                                              : 'text-ink-2 hover:bg-surface-3 hover:text-ink focus:bg-surface-3',
                                    )}
                                >
                                    {item.icon && <Icon name={item.icon} className="size-[18px] shrink-0" />}
                                    {item.label}
                                </button>
                            ),
                        )}
                    </div>,
                    document.body,
                )}
        </>
    );
}
