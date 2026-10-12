import { useCallback, useState } from 'react';
import { refreshDashboardAlerts } from '@/context/DashboardAlertsContext';
import { useToast } from '@/context/ToastContext';
import { formatMoney } from '@/lib/format';
import { affiliatesApi } from '@/services/affiliatesApi';

/**
 * Vendor control actions on a single affiliate, with consistent toasts and
 * a `pending` flag per action for button spinners.
 */
export function useAffiliateActions({ onChanged, onRemoved }) {
    const toast = useToast();
    const [pending, setPending] = useState(null);

    const run = useCallback(
        async (key, action, successTitle, successDescription) => {
            setPending(key);

            try {
                const result = await action();

                toast.success(successTitle, successDescription);
                refreshDashboardAlerts();

                return result;
            } catch (error) {
                toast.error('تعذر تنفيذ الإجراء', error.message);
                throw error;
            } finally {
                setPending(null);
            }
        },
        [toast],
    );

    const freeze = useCallback(
        async (affiliate, reason) => {
            const updated = await run('freeze', () => affiliatesApi.setStatus(affiliate.affiliate_id, 'frozen', reason), 'تم تجميد الحساب', `تم إيقاف ${affiliate.full_name} وتعطيل روابطه مع الاحتفاظ بكل سجلاته.`);

            onChanged(updated);
        },
        [onChanged, run],
    );

    const activate = useCallback(
        async (affiliate, { approving = false } = {}) => {
            const updated = await run(
                'activate',
                () => affiliatesApi.setStatus(affiliate.affiliate_id, 'active'),
                approving ? 'تم قبول المسوق' : 'تم إلغاء التجميد',
                approving ? `أصبح ${affiliate.full_name} مسوقاً نشطاً وتم إنشاء كود إحالة له.` : `عاد حساب ${affiliate.full_name} للعمل.`,
            );

            onChanged(updated);
        },
        [onChanged, run],
    );

    const remove = useCallback(
        async (affiliate, { rejecting = false } = {}) => {
            await run('delete', () => affiliatesApi.remove(affiliate.affiliate_id), rejecting ? 'تم رفض طلب الانضمام' : 'تم حذف المسوق نهائياً');
            onRemoved(affiliate);
        },
        [onRemoved, run],
    );

    const setCommission = useCallback(
        async (affiliate, payload) => {
            const updated = await run('commission', () => affiliatesApi.setCommission(affiliate.affiliate_id, payload), 'تم تحديث العمولة', payload.use_tier_default ? 'يتبع المسوق الآن عمولة شريحته الافتراضية.' : undefined);

            onChanged(updated);
        },
        [onChanged, run],
    );

    const createReferralCode = useCallback(
        async (affiliate) => {
            const updated = await run('referral', () => affiliatesApi.createReferralCode(affiliate.affiliate_id), 'تم إنشاء كود إحالة جديد');

            onChanged(updated);
        },
        [onChanged, run],
    );

    const recordPayout = useCallback(
        async (affiliate, payload) => {
            const updated = await run('payout', () => affiliatesApi.recordPayout(affiliate.affiliate_id, payload), 'تم تسجيل التحويل', `خُصم ${formatMoney(payload.amount)} من رصيد ${affiliate.full_name}.`);

            onChanged(updated);
        },
        [onChanged, run],
    );

    const rejectPayout = useCallback(
        async (affiliate, note) => {
            const updated = await run('reject-payout', () => affiliatesApi.rejectPayout(affiliate.affiliate_id, affiliate.payout_request.payout_id, note), 'تم رفض طلب التحويل');

            onChanged(updated);
        },
        [onChanged, run],
    );

    return { pending, freeze, activate, remove, setCommission, createReferralCode, recordPayout, rejectPayout };
}
