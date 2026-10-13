import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { useClickOutside, useEscapeKey } from '@/hooks/common';
import { t } from '@/i18n';
import { NotificationItem } from './NotificationItem';

/**
 * Header bell: unread badge and a panel with the latest notifications. Shared by the vendor
 * dashboard and the affiliate portal; `target(notification)` is where opening one leads.
 */
export function NotificationsMenu({ notifications, unreadCount, markRead, markAllRead, target, allHref }) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    useClickOutside(containerRef, () => setOpen(false), open);
    useEscapeKey(() => setOpen(false), open);

    const openNotification = (notification) => {
        setOpen(false);
        markRead(notification);
        navigate(target(notification));
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="relative grid size-10 place-items-center rounded-xl border border-line text-ink-2 hover:text-ink"
                aria-label={unreadCount ? t('الإشعارات، {unreadCount} غير مقروء', { unreadCount }) : t('الإشعارات')}
                aria-expanded={open}
                title={t('الإشعارات')}
            >
                <Icon name="bell" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -end-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-surface">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="mk-card animate-pop fixed inset-x-4 top-[76px] z-50 shadow-pop sm:absolute sm:inset-x-auto sm:end-0 sm:top-12 sm:w-[22rem]">
                    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                        <p className="text-sm font-semibold text-ink">{t('الإشعارات')}</p>
                        {unreadCount > 0 && markAllRead && (
                            <button type="button" onClick={markAllRead} className="text-xs font-medium text-primary hover:underline">
                                {t('تحديد الكل كمقروء')}
                            </button>
                        )}
                    </div>
                    <div className="mk-scroll max-h-96 overflow-y-auto p-1.5">
                        {notifications.length === 0 ? (
                            <p className="p-6 text-center text-sm text-muted">{t('لا توجد إشعارات بعد.')}</p>
                        ) : (
                            notifications.map((notification) => <NotificationItem key={notification.id} notification={notification} onOpen={openNotification} compact />)
                        )}
                    </div>
                    <Link to={allHref} onClick={() => setOpen(false)} className="block border-t border-line px-4 py-3 text-center text-sm font-medium text-primary hover:bg-surface-2">
                        {t('عرض كل الإشعارات')}
                    </Link>
                </div>
            )}
        </div>
    );
}
