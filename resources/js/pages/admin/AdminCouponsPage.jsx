import { PageHeader } from '@/components/layout/DashboardLayout';
import { AdminCouponsTable } from '@/features/admin/AdminCatalog';
import { t } from '@/i18n';

/** Coupons across stores. */
export function AdminCouponsPage() {
    return (
        <>
            <PageHeader title={t('الكوبونات')} description={t('أكواد الخصم في كل المتاجر ومدى استخدامها')} />
            <section className="mk-card overflow-hidden">
                <AdminCouponsTable />
            </section>
        </>
    );
}
