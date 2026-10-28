import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { Avatar } from '@/components/ui/Display';
import { Dropdown } from '@/components/ui/Dropdown';
import { Icon } from '@/components/ui/Icon';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { isRtl, t } from '@/i18n';
import { cn } from '@/lib/format';

/**
 * The shell every signed-in area shares (merchant dashboard, platform admin, affiliate portal): a light
 * sidebar with the brand, a context card, grouped navigation and the account card at its foot, then a sticky
 * header for the page tools and the page itself. Below `lg` the sidebar becomes a drawer.
 *
 * @param {{
 *   navLabel: string,
 *   brandTag?: string,
 *   contextCard?: import('react').ReactNode,
 *   sections: Array<{ title?: string, items: Array<object> }>,
 *   alerts?: Record<string, number>,
 *   counter?: (item: object) => number,
 *   account?: { name: string, subtitle?: string, avatar?: string, items: Array<object> },
 *   headerTools?: import('react').ReactNode,
 *   banner?: import('react').ReactNode,
 *   children: import('react').ReactNode,
 * }} props
 */
export function AppShell({ navLabel, brandTag, contextCard, sections, alerts, counter, account, headerTools, banner, children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    useEffect(() => setSidebarOpen(false), [location.pathname]);

    return (
        <div className="min-h-dvh">
            {sidebarOpen && <div className="animate-fade-in fixed inset-0 z-30 bg-[#0a1532]/60 backdrop-blur-[2px] lg:hidden" onClick={() => setSidebarOpen(false)} />}
            <aside
                className={cn(
                    'fixed inset-y-0 start-0 z-40 flex w-[264px] flex-col border-e border-line bg-surface transition-transform duration-300 lg:translate-x-0',
                    sidebarOpen ? 'translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full',
                )}
                aria-label={navLabel}
            >
                <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-line px-5">
                    <Logo className="h-[17px]" />
                    {brandTag && <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-2xs font-semibold text-primary">{brandTag}</span>}
                    <button type="button" onClick={() => setSidebarOpen(false)} className="ms-auto grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-3 hover:text-ink lg:hidden" aria-label={t('إغلاق القائمة')}>
                        <Icon name="x" />
                    </button>
                </div>

                {contextCard && <div className="mx-3 mt-3">{contextCard}</div>}

                <SidebarNav sections={sections} alerts={alerts} counter={counter} onNavigate={() => setSidebarOpen(false)} />

                {account && <AccountCard account={account} />}
            </aside>

            <div className="lg:ps-[264px]">
                {banner}
                <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur-xl backdrop-saturate-150 sm:px-8">
                    <button type="button" onClick={() => setSidebarOpen(true)} className="grid size-9 place-items-center rounded-lg border border-line-strong/70 bg-surface text-ink-2 shadow-card lg:hidden" aria-label={t('فتح القائمة')}>
                        <Icon name="menu" className="size-[18px]" />
                    </button>
                    <Logo className="h-4 lg:hidden" />
                    <div className="ms-auto flex items-center gap-1">
                        <LanguageToggle />
                        <ThemeToggle />
                        {headerTools}
                    </div>
                </header>
                <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-8 sm:py-8">{children}</main>
            </div>
        </div>
    );
}

/**
 * The context card under the brand (the store, the affiliate's store): a tile, the name with a status line
 * under it, and an optional row of labeled actions along its foot.
 */
export function SidebarContextCard({ avatar, title, status, statusTone = 'success', actions }) {
    return (
        <div className="rounded-xl border border-line bg-surface-2">
            <div className="flex items-center gap-3 p-3">
                {avatar}
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{title}</p>
                    {status && (
                        <p className="mt-0.5 flex items-center gap-1.5 text-2xs text-muted">
                            <span className={cn('size-1.5 shrink-0 rounded-full', statusTone === 'danger' ? 'bg-danger' : 'bg-success')} />
                            <span className="truncate">{status}</span>
                        </p>
                    )}
                </div>
            </div>
            {actions && <div className="grid grid-cols-2 gap-px overflow-hidden rounded-b-xl border-t border-line bg-line">{actions}</div>}
        </div>
    );
}

/** A labeled action along the foot of the sidebar context card: a link (opens in a new tab) or a button. */
export function SidebarCardAction({ icon, label, href, onClick, isDone = false }) {
    const className = cn('flex h-9 items-center justify-center gap-1.5 bg-surface-2 text-xs font-medium transition hover:bg-surface-3', isDone ? 'text-success' : 'text-ink-2 hover:text-ink');
    const content = (
        <>
            <Icon name={icon} className="size-3.5" />
            {label}
        </>
    );

    return href ? (
        <a href={href} target="_blank" rel="noreferrer" className={className}>
            {content}
        </a>
    ) : (
        <button type="button" onClick={onClick} className={className}>
            {content}
        </button>
    );
}

/** The sidebar's grouped links, every group open under a quiet label. `counter(item)` (or `alerts[item.counter]`) feeds the badges. */
export function SidebarNav({ sections, alerts = {}, counter, onNavigate }) {
    const countOf = (item) => (counter ? counter(item) : item.counter ? (alerts[item.counter] ?? 0) : 0);

    return (
        <nav className="mk-scroll flex-1 overflow-y-auto px-3 pt-4 pb-4">
            {sections.map((section) => (
                <div key={section.title ?? 'main'} className="mt-5 first:mt-0">
                    {section.title && <p className="mb-1.5 px-3 text-2xs font-semibold text-muted">{section.title}</p>}
                    <ul className="flex flex-col gap-0.5">
                        {section.items.map((item) => (
                            <li key={item.label}>
                                <NavItem item={item} count={countOf(item)} onNavigate={onNavigate} />
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </nav>
    );
}

/** `item.except` lists sub-paths with their own nav item, so the parent isn't highlighted there too. */
function NavItem({ item, count, onNavigate }) {
    const { pathname } = useLocation();
    const isShadowed = item.except?.some((path) => pathname.startsWith(path)) ?? false;

    if (item.soon) {
        return (
            <span className="flex h-9 cursor-not-allowed items-center gap-3 rounded-lg px-3 text-sm text-muted" title={t('هذه الوحدة قيد التطوير')}>
                <Icon name={item.icon} className="size-[18px]" />
                {item.label}
                <span className="ms-auto rounded-md bg-surface-3 px-1.5 py-0.5 text-3xs">{t('قريباً')}</span>
            </span>
        );
    }

    return (
        <NavLink
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive: matches }) => {
                const isActive = matches && !isShadowed;

                return cn(
                    'relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-200',
                    'before:absolute before:inset-y-2 before:start-0 before:w-[3px] before:rounded-full before:bg-gold before:transition-transform before:duration-300',
                    isActive ? 'bg-primary-soft font-semibold text-primary before:scale-y-100 [&>svg]:text-primary' : 'text-ink-2 before:scale-y-0 hover:bg-surface-3 hover:text-ink [&>svg]:text-muted hover:[&>svg]:text-ink-2',
                );
            }}
        >
            <Icon name={item.icon} className="size-[18px] shrink-0 transition-colors duration-200" />
            <span className="truncate">{item.label}</span>
            {count > 0 && <span className="mk-num ms-auto grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-2xs font-semibold text-white">{count > 99 ? '99+' : count}</span>}
        </NavLink>
    );
}

/** The signed-in person at the sidebar's foot; opens the account menu upward. */
function AccountCard({ account }) {
    return (
        <div className="shrink-0 border-t border-line p-3">
            <Dropdown
                label={t('قائمة الحساب')}
                trigger={(props) => (
                    <button type="button" {...props} className="flex w-full items-center gap-2.5 rounded-xl p-2 text-start transition hover:bg-surface-3">
                        <Avatar name={account.name} src={account.avatar} size="sm" shape="circle" />
                        <span className="min-w-0 flex-1 leading-tight">
                            <span className="block truncate text-sm font-semibold text-ink">{account.name}</span>
                            {account.subtitle && <span className="block truncate text-2xs text-muted">{account.subtitle}</span>}
                        </span>
                        <Icon name="chevron-down" className="size-4 rotate-180 text-muted" />
                    </button>
                )}
                items={account.items}
            />
        </div>
    );
}
