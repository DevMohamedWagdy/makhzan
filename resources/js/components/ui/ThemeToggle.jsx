import { useTheme } from '@/context/ThemeContext';
import { t } from '@/i18n';
import { cn } from '@/lib/format';
import { Icon } from './Icon';

export function ThemeToggle({ className }) {
    const { isDark, toggleTheme } = useTheme();
    const label = isDark ? t('التبديل إلى الوضع الفاتح') : t('التبديل إلى الوضع الداكن');

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={label}
            title={label}
            className={cn('relative grid size-9 place-items-center overflow-hidden rounded-lg text-ink-2 transition hover:bg-surface-3 hover:text-ink', className)}
        >
            <Icon name="sun" className={cn('absolute size-[18px] transition duration-300', isDark ? 'translate-y-6 rotate-90 opacity-0' : 'translate-y-0 opacity-100')} />
            <Icon name="moon" className={cn('absolute size-[18px] transition duration-300', isDark ? 'translate-y-0 opacity-100' : '-translate-y-6 -rotate-90 opacity-0')} />
        </button>
    );
}
