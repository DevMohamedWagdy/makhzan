import { PageHeader } from '@/components/layout/DashboardLayout';
import { ActivityLogList } from '@/features/activity/ActivityLogList';
import { t } from '@/i18n';
import { adminApi } from '@/services/adminApi';

/** Everything that happened on the platform: who did what, where, and what changed. */
export function AdminLogsPage() {
    return (
        <>
            <PageHeader title={t('سجل النشاط')} description={t('كل ما يحدث على المنصة: من نفّذه، وفي أي متجر، وما الذي تغيّر')} />
            <section className="mk-card overflow-hidden">
                <ActivityLogList load={adminApi.logs} showStore />
            </section>
        </>
    );
}
