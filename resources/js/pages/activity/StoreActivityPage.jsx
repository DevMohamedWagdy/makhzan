import { PageHeader } from '@/components/layout/DashboardLayout';
import { ActivityLogList } from '@/features/activity/ActivityLogList';
import { t } from '@/i18n';
import { request } from '@/services/client';

const loadActivity = (filters) => request('GET', '/api/v1/vendor/activity', { query: filters });

/** The owner's view of what happened in the store: the team's actions, orders, customers… */
export function StoreActivityPage() {
    return (
        <>
            <PageHeader title={t('سجل النشاط')} description={t('كل ما حدث في متجرك: من نفّذه ومتى وما الذي تغيّر')} breadcrumbs={[t('لوحة التحكم'), t('الإدارة'), t('سجل النشاط')]} />
            <section className="mk-card overflow-hidden">
                <ActivityLogList load={loadActivity} />
            </section>
        </>
    );
}
