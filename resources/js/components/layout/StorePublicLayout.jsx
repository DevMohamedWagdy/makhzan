import { LogoMark } from '@/components/brand/Logo';
import { Avatar } from '@/components/ui/Display';
import { Skeleton } from '@/components/ui/Spinner';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/format';

/**
 * Store-branded shell for public pages affiliates see (join, login). The store is the
 * brand here; Makhzan only appears as "powered by". Pass `store={null}` while loading.
 */
export function StorePublicLayout({ store, children, narrow = false }) {
    return (
        <div className="flex min-h-dvh flex-col">
            <header className="border-b border-line bg-surface/80 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        {store ? <Avatar name={store.name} src={store.logo_url} size="sm" /> : <Skeleton className="size-8 rounded-xl" />}
                        <span className="truncate font-semibold text-ink">{store?.name}</span>
                    </div>
                    <ThemeToggle />
                </div>
            </header>
            <main className={cn('mx-auto w-full flex-1 px-4 py-8 sm:px-6 sm:py-12', narrow ? 'max-w-md' : 'max-w-5xl')}>{children}</main>
            <footer className="flex items-center justify-center gap-2 pb-8 text-xs text-muted">
                <LogoMark className="size-5" />
                مدعوم من منصة مخزن
            </footer>
        </div>
    );
}
