import { PageHeader } from '@/components/layout/DashboardLayout';
import { AdminReviewsTable } from '@/features/admin/AdminCatalog';
import { t } from '@/i18n';

/** Product reviews across stores. */
export function AdminReviewsPage() {
    return (
        <>
            <PageHeader title={t('التقييمات')} description={t('تقييمات العملاء في كل المتاجر: انشرها أو أخفِها أو احذفها')} />
            <section className="mk-card overflow-hidden">
                <AdminReviewsTable />
            </section>
        </>
    );
}
