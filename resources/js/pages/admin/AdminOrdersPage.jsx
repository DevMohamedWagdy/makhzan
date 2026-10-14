import { PageHeader } from '@/components/layout/DashboardLayout';
import { AdminOrdersTable } from '@/features/admin/AdminOrders';
import { t } from '@/i18n';

/** Every order on the platform. */
export function AdminOrdersPage() {
    return (
        <>
            <PageHeader title={t('الطلبات')} description={t('كل طلبات المتاجر على المنصة')} />
            <section className="mk-card overflow-hidden">
                <AdminOrdersTable />
            </section>
        </>
    );
}
