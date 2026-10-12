import { useEffect, useState } from 'react';
import { Drawer } from '@/components/ui/Overlay';
import { Tabs } from '@/components/ui/Navigation';
import { AffiliateForm } from './AffiliateForm';
import { BulkImportPanel } from './BulkImportPanel';
import { RegistrationLinkPanel } from './RegistrationLinkPanel';

const METHODS = [
    { value: 'manual', label: 'إضافة يدوية', icon: 'user-plus' },
    { value: 'link', label: 'رابط التسجيل الذاتي', icon: 'link' },
    { value: 'bulk', label: 'الرفع الجماعي', icon: 'upload-cloud' },
];

/** One entry point, three onboarding methods. */
export function AddAffiliateDrawer({ open, onClose, onCreated, onImported, pendingCount, onReviewPending, initialMethod = 'manual' }) {
    const [method, setMethod] = useState(initialMethod);

    useEffect(() => {
        if (open) {
            setMethod(initialMethod);
        }
    }, [open, initialMethod]);

    return (
        <Drawer open={open} onClose={onClose} size="lg" icon="user-plus" title="إضافة مسوق جديد" description="اختر الطريقة الأنسب لإضافة المسوقين إلى متجرك">
            <Tabs tabs={METHODS} value={method} onChange={setMethod} className="sticky top-0 z-10 bg-surface px-4" />
            {method === 'manual' && <AffiliateForm onSaved={onCreated} onCancel={onClose} />}
            {method === 'link' && <RegistrationLinkPanel pendingCount={pendingCount} onReviewPending={onReviewPending} />}
            {method === 'bulk' && <BulkImportPanel onImported={onImported} />}
        </Drawer>
    );
}
