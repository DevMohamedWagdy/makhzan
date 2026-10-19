import { PageHeader } from '@/components/layout/DashboardLayout';
import { AdminCustomersTable } from '@/features/admin/AdminPeople';
import { t } from '@/i18n';

/** Every store's customers. */
export function AdminCustomersPage() {
    return (
        <>
            <PageHeader title={t('العملاء')} description={t('عملاء كل المتاجر: مشترياتهم وعناوينهم ونقاطهم')} />
            <section className="mk-card overflow-hidden">
                <AdminCustomersTable />
            </section>
        </>
    );
}
