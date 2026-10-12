import { useEffect, useState } from 'react';
import { t } from '@/i18n';
import { Button } from './Button';
import { Field, Input } from './Form';
import { Modal } from './Overlay';

/**
 * Confirmation modal. Pass `confirmPhrase` to require typing a word before
 * destructive actions are enabled.
 */
export function ConfirmDialog({ open, onClose, onConfirm, title, description, icon = 'alert-triangle', tone = 'danger', confirmLabel = t('تأكيد'), confirmPhrase, loading = false, children }) {
    const [typed, setTyped] = useState('');

    useEffect(() => {
        if (open) {
            setTyped('');
        }
    }, [open]);

    const blocked = Boolean(confirmPhrase) && typed.trim() !== confirmPhrase;

    return (
        <Modal
            open={open}
            onClose={onClose}
            dismissible={!loading}
            size="sm"
            icon={icon}
            iconTone={tone}
            title={title}
            description={description}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={loading}>
                        {t('إلغاء')}
                    </Button>
                    <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading} disabled={blocked}>
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                {children}
                {confirmPhrase && (
                    <Field label={t('للتأكيد، اكتب «{confirmPhrase}» في الحقل التالي', { confirmPhrase })}>
                        {(props) => <Input {...props} data-autofocus value={typed} onChange={(event) => setTyped(event.target.value)} placeholder={confirmPhrase} autoComplete="off" />}
                    </Field>
                )}
            </div>
        </Modal>
    );
}
