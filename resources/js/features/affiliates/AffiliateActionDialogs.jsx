import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Alert, Avatar } from '@/components/ui/Display';
import { Field, Textarea } from '@/components/ui/Form';
import { formatMoney, formatNumber } from '@/lib/format';

function AffiliateSummary({ affiliate }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3">
            <Avatar name={affiliate.full_name} src={affiliate.avatar_url} />
            <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{affiliate.full_name}</p>
                <p className="ltr text-start text-xs text-muted">{affiliate.phone}</p>
            </div>
        </div>
    );
}

export function FreezeDialog({ affiliate, open, onClose, onConfirm, loading }) {
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (open) {
            setReason('');
        }
    }, [open]);

    if (!affiliate) {
        return null;
    }

    return (
        <ConfirmDialog
            open={open}
            onClose={onClose}
            onConfirm={() => onConfirm(reason.trim())}
            loading={loading}
            tone="warning"
            icon="snowflake"
            title="تجميد حساب المسوق"
            description="سيتم إيقاف الحساب مؤقتاً دون حذف أي بيانات."
            confirmLabel="تجميد الحساب"
        >
            <AffiliateSummary affiliate={affiliate} />
            <ul className="flex list-disc flex-col gap-1.5 ps-5 text-sm leading-relaxed text-ink-2">
                <li>لن يتمكن المسوق من تسجيل الدخول، وستتوقف روابط الإحالة الخاصة به.</li>
                <li>سجل الطلبات والعمولات السابقة يبقى محفوظاً كما هو.</li>
                <li>يمكنك إلغاء التجميد في أي وقت.</li>
            </ul>
            <Field label="سبب التجميد" optional hint="يظهر في ملف المسوق كمرجع لفريقك">
                {(props) => <Textarea {...props} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="مثال: مخالفة سياسة الإعلانات" maxLength={200} />}
            </Field>
        </ConfirmDialog>
    );
}

export function DeleteDialog({ affiliate, open, onClose, onConfirm, loading, rejecting = false }) {
    if (!affiliate) {
        return null;
    }

    if (rejecting) {
        return (
            <ConfirmDialog open={open} onClose={onClose} onConfirm={onConfirm} loading={loading} icon="x" title="رفض طلب الانضمام؟" description="سيتم حذف طلب التسجيل، ويمكن للمسوق التقديم مرة أخرى عبر الرابط." confirmLabel="رفض الطلب">
                <AffiliateSummary affiliate={affiliate} />
            </ConfirmDialog>
        );
    }

    const hasBalance = affiliate.stats.pending_balance > 0;

    return (
        <ConfirmDialog
            open={open}
            onClose={onClose}
            onConfirm={onConfirm}
            loading={loading}
            icon="trash"
            title="حذف المسوق نهائياً"
            description="لا يمكن التراجع عن هذا الإجراء. سيتم حذف الحساب وكل أكواد الإحالة المرتبطة به."
            confirmLabel="حذف نهائي"
            confirmPhrase="حذف"
        >
            <AffiliateSummary affiliate={affiliate} />
            {hasBalance && (
                <Alert tone="danger" title="لدى المسوق رصيد غير مسحوب">
                    رصيد معلق بقيمة {formatMoney(affiliate.stats.pending_balance)}. تأكد من تسويته قبل الحذف.
                </Alert>
            )}
            {affiliate.stats.orders_count > 0 && (
                <Alert tone="warning">
                    لهذا المسوق {formatNumber(affiliate.stats.orders_count)} طلب مسجل. إذا كنت تريد إيقافه فقط مع الاحتفاظ بالسجلات، استخدم <strong>«تجميد الحساب»</strong> بدلاً من الحذف.
                </Alert>
            )}
        </ConfirmDialog>
    );
}

export function ImpersonateDialog({ affiliate, open, onClose, onConfirm, loading }) {
    if (!affiliate) {
        return null;
    }

    return (
        <ConfirmDialog
            open={open}
            onClose={onClose}
            onConfirm={onConfirm}
            loading={loading}
            tone="primary"
            icon="log-in"
            title="الدخول بصفة المسوق"
            description="ستشاهد لوحة المسوق تماماً كما يراها، لمساعدته أو للتحقق من مشكلة."
            confirmLabel="الدخول الآن"
        >
            <AffiliateSummary affiliate={affiliate} />
            <Alert tone="info" icon="shield-check">
                الجلسة صالحة لمدة ٣٠ دقيقة، وكل إجراء تقوم به يُسجل في سجل النشاط باسمك كصاحب المتجر. لن تتمكن من رؤية كلمة مرور المسوق.
            </Alert>
        </ConfirmDialog>
    );
}
