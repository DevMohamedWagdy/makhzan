import { Link } from 'react-router-dom';
import { Logo } from '@/components/brand/Logo';
import { t } from '@/i18n';

/** Footer of the platform's public pages (landing, terms, privacy). */
export function SiteFooter() {
    return (
        <footer className="border-t border-line bg-surface">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
                <Link to="/" aria-label={t('الصفحة الرئيسية لمخزن')}>
                    <Logo className="h-8" />
                </Link>
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted">
                    <span>
                        {t('© {value} مخزن. جميع الحقوق محفوظة.', {
                            value: new Date().getFullYear(),
                        })}
                    </span>
                    <Link to="/terms" className="hover:text-primary">
                        {t('الشروط والأحكام')}
                    </Link>
                    <Link to="/privacy" className="hover:text-primary">
                        {t('سياسة الخصوصية')}
                    </Link>
                    <a href="#" className="hover:text-primary">
                        {t('مركز المساعدة')}
                    </a>
                </div>
            </div>
        </footer>
    );
}
