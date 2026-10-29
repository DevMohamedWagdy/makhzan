import { PageHeader } from '@/components/layout/DashboardLayout';
import { StoreActivityTimeline } from '@/features/activity/StoreActivityTimeline';
import { t } from '@/i18n';

/** What the store's team did: who changed what, and when. */
export function StoreActivityPage() {
    return (
        <>
            <PageHeader title={t('سجل النشاط')} description={t('إجراءات فريق عملك في المتجر: من نفّذها ومتى وما الذي تغيّر')} breadcrumbs={[t('لوحة التحكم'), t('الإدارة'), t('سجل النشاط')]} icon="nav-activity" />
            <StoreActivityTimeline />
        </>
    );
}
