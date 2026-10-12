import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/format';
import { Icon } from './Icon';

export function ThemeToggle({ className }) {
    const { isDark, toggleTheme } = useTheme();
    const label = isDark ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن';

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={label}
            title={label}
            className={cn('relative grid size-10 place-items-center overflow-hidden rounded-xl border border-line bg-surface text-ink-2 transition hover:border-line-strong hover:text-ink', className)}
        >
            <Icon name="sun" className={cn('absolute size-5 transition duration-300', isDark ? 'translate-y-6 rotate-90 opacity-0' : 'translate-y-0 opacity-100')} />
            <Icon name="moon" className={cn('absolute size-5 transition duration-300', isDark ? 'translate-y-0 opacity-100' : '-translate-y-6 -rotate-90 opacity-0')} />
        </button>
    );
}
