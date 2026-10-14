import { PageHeader } from '@/components/layout/DashboardLayout';
import { AdminVendorsTable } from '@/features/admin/AdminVendors';
import { t } from '@/i18n';

/** Every dashboard account: store owners and their staff. */
export function AdminVendorsPage() {
    return (
        <>
            <PageHeader title={t('التجار والحسابات')} description={t('أصحاب المتاجر وموظفوهم، وآخر دخول لكل حساب')} />
            <section className="mk-card overflow-hidden">
                <AdminVendorsTable />
            </section>
        </>
    );
}
