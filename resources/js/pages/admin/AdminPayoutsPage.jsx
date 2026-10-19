import { PageHeader } from '@/components/layout/DashboardLayout';
import { AdminPayoutsTable } from '@/features/admin/AdminPeople';
import { t } from '@/i18n';

/** Affiliate payouts across stores. */
export function AdminPayoutsPage() {
    return (
        <>
            <PageHeader title={t('تحويلات المسوّقين')} description={t('طلبات سحب العمولات والتحويلات في كل المتاجر')} />
            <section className="mk-card overflow-hidden">
                <AdminPayoutsTable />
            </section>
        </>
    );
}
