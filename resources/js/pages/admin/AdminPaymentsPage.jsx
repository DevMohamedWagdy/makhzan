import { PageHeader } from '@/components/layout/DashboardLayout';
import { AdminPaymentsTable } from '@/features/admin/AdminCatalog';
import { t } from '@/i18n';

/** Online payments across stores. */
export function AdminPaymentsPage() {
    return (
        <>
            <PageHeader title={t('المدفوعات')} description={t('المدفوعات الأونلاين والمبالغ المستردة في كل المتاجر')} />
            <section className="mk-card overflow-hidden">
                <AdminPaymentsTable />
            </section>
        </>
    );
}
