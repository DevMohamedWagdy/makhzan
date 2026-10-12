import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Alert, DetailRow } from '@/components/ui/Display';
import { Field, Input, Textarea } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Overlay';
import { useCopy } from '@/hooks/common';
import { CURRENCY, PAYOUT_METHODS } from '@/lib/constants';
import { cn, formatMoney } from '@/lib/format';
import { PayoutMethodLabel } from './AffiliateBadges';

const today = () => new Date().toLocaleDateString('en-CA');

/**
 * Vendor records a commission transfer already sent from their wallet or bank. Opened from
 * an open transfer request, it pre-fills the requested amount and fulfils that request.
 */
export function RecordPayoutModal({ affiliate, open, onClose, onSave, saving }) {
    const { copy, copiedValue } = useCopy();
    const [amount, setAmount] = useState('');
    const [reference, setReference] = useState('');
    const [paidAt, setPaidAt] = useState(today());
    const [note, setNote] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open && affiliate) {
            setAmount(String(affiliate.payout_request?.amount ?? affiliate.stats.pending_balance));
            setReference('');
            setPaidAt(today());
            setNote('');
            setError(null);
        }
    }, [open, affiliate]);

    if (!affiliate) {
        return null;
    }

    const balance = affiliate.stats.pending_balance;
    const numeric = Number(amount);
    const destination = affiliate.payout_method;

    const submit = () => {
        if (Number.isNaN(numeric) || numeric < 1) {
            setError(`أدخل مبلغاً لا يقل عن 1 ${CURRENCY}`);

            return;
        }

        if (numeric > balance) {
            setError('المبلغ أكبر من الرصيد المعلق');

            return;
        }

        onSave({ amount: numeric, reference: reference.trim() || null, note: note.trim() || null, paid_at: paidAt && paidAt !== today() ? paidAt : null });
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            dismissible={!saving}
            icon="wallet"
            iconTone="success"
            title={affiliate.payout_request ? 'تأكيد تحويل العمولة' : 'تسجيل دفعة عمولة'}
            description={`سجّل المبلغ الذي حوّلته لـ ${affiliate.full_name} ليُخصم من رصيده المعلق.`}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={saving}>
                        إلغاء
                    </Button>
                    <Button variant="success" onClick={submit} loading={saving} icon="check">
                        تأكيد التحويل
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-5">
                {affiliate.payout_request?.request_note && (
                    <Alert tone="warning" icon="send" title="ملاحظة المسوق">
                        {affiliate.payout_request.request_note}
                    </Alert>
                )}

                <div className="rounded-xl border border-line bg-surface-2 p-4">
                    <PayoutMethodLabel type={destination.type} />
                    <dl className="mt-2 divide-y divide-line">
                        <DetailRow label="اسم صاحب الحساب">{destination.account_name}</DetailRow>
                        <DetailRow label={PAYOUT_METHODS[destination.type].numberLabel}>
                            <span className="inline-flex items-center gap-1">
                                <span className="ltr font-mono">{destination.account_number}</span>
                                <button
                                    type="button"
                                    onClick={() => copy(destination.account_number)}
                                    className={cn('grid size-8 place-items-center rounded-lg transition', copiedValue === destination.account_number ? 'bg-success-soft text-success' : 'text-muted hover:bg-surface-3 hover:text-ink')}
                                    aria-label="نسخ رقم الحساب"
                                    title="نسخ رقم الحساب"
                                >
                                    <Icon name={copiedValue === destination.account_number ? 'check' : 'copy'} className="size-4" />
                                </button>
                            </span>
                        </DetailRow>
                        {destination.bank_name && <DetailRow label="البنك">{destination.bank_name}</DetailRow>}
                        {destination.iban && (
                            <DetailRow label="IBAN">
                                <span className="ltr font-mono text-xs">{destination.iban}</span>
                            </DetailRow>
                        )}
                    </dl>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="المبلغ المحوَّل" error={error} required hint={`الرصيد المعلق: ${formatMoney(balance)}`}>
                        {(props) => (
                            <Input
                                {...props}
                                data-autofocus
                                type="number"
                                inputMode="decimal"
                                min={1}
                                max={balance}
                                step="0.01"
                                value={amount}
                                onChange={(event) => {
                                    setAmount(event.target.value);
                                    setError(null);
                                }}
                                aria-invalid={error ? 'true' : undefined}
                                suffix={<span className="px-2 text-sm text-muted">{CURRENCY}</span>}
                            />
                        )}
                    </Field>
                    <Field label="تاريخ التحويل">{(props) => <Input {...props} type="date" max={today()} value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />}</Field>
                </div>
                <Field label="رقم العملية / الإيصال" optional hint="يساعد المسوق على مطابقة التحويل">
                    {(props) => <Input {...props} dir="ltr" className="text-start" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="TRX123456" maxLength={100} />}
                </Field>
                <Field label="ملاحظة" optional hint="تظهر للمسوق في سجل تحويلاته">
                    {(props) => <Textarea {...props} value={note} onChange={(event) => setNote(event.target.value)} placeholder="مثال: عمولات شهر سبتمبر" maxLength={200} />}
                </Field>
            </div>
        </Modal>
    );
}

export function RejectPayoutDialog({ affiliate, open, onClose, onConfirm, loading }) {
    const [note, setNote] = useState('');

    useEffect(() => {
        if (open) {
            setNote('');
        }
    }, [open]);

    if (!affiliate?.payout_request) {
        return null;
    }

    return (
        <ConfirmDialog
            open={open}
            onClose={onClose}
            onConfirm={() => onConfirm(note.trim() || null)}
            loading={loading}
            icon="x"
            title="رفض طلب التحويل؟"
            description={`طلب ${affiliate.full_name} تحويل ${formatMoney(affiliate.payout_request.amount)}. سيبقى رصيده المعلق كما هو.`}
            confirmLabel="رفض الطلب"
        >
            <Field label="سبب الرفض" optional hint="يظهر للمسوق">
                {(props) => <Textarea {...props} value={note} onChange={(event) => setNote(event.target.value)} placeholder="مثال: التحويلات تتم يوم 1 من كل شهر" maxLength={200} />}
            </Field>
        </ConfirmDialog>
    );
}
