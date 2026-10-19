import { PageHeader } from '@/components/layout/DashboardLayout';
import { AdminAffiliatesTable } from '@/features/admin/AdminPeople';
import { t } from '@/i18n';

/** Every store's affiliates. */
export function AdminAffiliatesPage() {
    return (
        <>
            <PageHeader title={t('المسوّقين')} description={t('مسوّقو كل المتاجر: مبيعاتهم وعمولاتهم وحالة حساباتهم')} />
            <section className="mk-card overflow-hidden">
                <AdminAffiliatesTable />
            </section>
        </>
    );
}
