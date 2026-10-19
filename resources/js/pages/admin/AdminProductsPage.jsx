import { PageHeader } from '@/components/layout/DashboardLayout';
import { AdminProductsTable } from '@/features/admin/AdminCatalog';
import { t } from '@/i18n';

/** Every store's products. */
export function AdminProductsPage() {
    return (
        <>
            <PageHeader title={t('المنتجات')} description={t('منتجات كل المتاجر بأسعارها ومخزونها')} />
            <section className="mk-card overflow-hidden">
                <AdminProductsTable />
            </section>
        </>
    );
}
