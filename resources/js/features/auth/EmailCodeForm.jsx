import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Display';
import { t } from '@/i18n';

const CODE_LENGTH = 6;

/** Six boxes for the emailed code: typing moves forward, backspace moves back, pasting fills them all. */
function CodeInput({ value, onChange, onComplete, disabled }) {
    const inputs = useRef([]);
    const digits = Array.from({ length: CODE_LENGTH }, (_, index) => value[index] ?? '');

    const update = (next, focusIndex) => {
        const code = next.join('').slice(0, CODE_LENGTH);

        onChange(code);
        inputs.current[Math.min(focusIndex, CODE_LENGTH - 1)]?.focus();

        if (code.length === CODE_LENGTH) {
            onComplete(code);
        }
    };

    const onInput = (index, event) => {
        const typed = event.target.value.replace(/\D/g, '');

        if (!typed) {
            return;
        }

        const next = [...digits];

        // Several digits at once: autofill or a paste into one box.
        typed.split('').forEach((digit, offset) => {
            if (index + offset < CODE_LENGTH) {
                next[index + offset] = digit;
            }
        });
        update(next, index + typed.length);
    };

    const onKeyDown = (index, event) => {
        if (event.key === 'Backspace' && !digits[index] && index > 0) {
            event.preventDefault();
            const next = [...digits];

            next[index - 1] = '';
            update(next, index - 1);
        }
    };

    const onPaste = (event) => {
        const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);

        if (pasted) {
            event.preventDefault();
            update(pasted.split(''), pasted.length);
        }
    };

    return (
        <div dir="ltr" className="flex justify-center gap-2 sm:gap-3" onPaste={onPaste}>
            {digits.map((digit, index) => (
                <input
                    key={index}
                    ref={(element) => (inputs.current[index] = element)}
                    value={digit}
                    onChange={(event) => onInput(index, event)}
                    onKeyDown={(event) => onKeyDown(index, event)}
                    onFocus={(event) => event.target.select()}
                    disabled={disabled}
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    autoFocus={index === 0}
                    maxLength={CODE_LENGTH}
                    aria-label={t('الرقم {number} من الكود', { number: index + 1 })}
                    className="mk-input size-12 p-0 text-center text-xl font-bold tabular-nums sm:size-14 sm:text-2xl"
                />
            ))}
        </div>
    );
}

/**
 * The emailed 6-digit code step shared by vendor and affiliate sign-in.
 *
 * @param {{
 *   verification: { challenge: string, email: string, resend_in: number },
 *   onVerify: (code: string) => Promise<void>,
 *   onResend: () => Promise<{ resend_in: number, message: string }>,
 *   onBack?: () => void,
 * }} props
 */
export function EmailCodeForm({ verification, onVerify, onResend, onBack }) {
    const [code, setCode] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);
    const [resendIn, setResendIn] = useState(verification.resend_in ?? 60);

    useEffect(() => {
        if (resendIn <= 0) {
            return undefined;
        }

        const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);

        return () => clearTimeout(timer);
    }, [resendIn]);

    const submit = async (submittedCode = code) => {
        if (submitting) {
            return;
        }

        if (submittedCode.length !== CODE_LENGTH) {
            setError(t('أدخل الكود المكون من 6 أرقام'));

            return;
        }

        setError(null);
        setSubmitting(true);

        try {
            await onVerify(submittedCode);
        } catch (verifyError) {
            setError(verifyError.errors?.code ?? verifyError.message);
            setCode('');
            setSubmitting(false);
        }
    };

    const resend = async () => {
        setError(null);
        setNotice(null);
        setResending(true);

        try {
            const result = await onResend();

            setResendIn(result.resend_in);
            setNotice(result.message);
            setCode('');
        } catch (resendError) {
            setError(resendError.errors?.code ?? resendError.message);
        } finally {
            setResending(false);
        }
    };

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
            noValidate
            className="flex flex-col gap-5"
        >
            <p className="text-center text-sm leading-relaxed text-muted">
                {t('أرسلنا كوداً من 6 أرقام إلى {email}. أدخله لتأكيد حسابك.', { email: verification.email })}
            </p>

            {error && <Alert tone="danger">{error}</Alert>}
            {notice && !error && <Alert tone="success">{notice}</Alert>}

            <CodeInput value={code} onChange={setCode} onComplete={submit} disabled={submitting} />

            <Button type="submit" size="lg" loading={submitting} className="w-full">
                {submitting ? t('جارٍ التحقق...') : t('تأكيد')}
            </Button>

            <p className="text-center text-sm text-muted">
                {t('لم يصلك الكود؟ تأكد من مجلد الرسائل غير المرغوب فيها (Spam)، أو ')}
                {resendIn > 0 ? (
                    <span>{t('اطلب كوداً جديداً بعد {seconds} ثانية', { seconds: resendIn })}</span>
                ) : (
                    <button type="button" onClick={resend} disabled={resending} className="font-semibold text-primary hover:underline disabled:opacity-60">
                        {resending ? t('جارٍ الإرسال...') : t('أرسل كوداً جديداً')}
                    </button>
                )}
            </p>

            {onBack && (
                <button type="button" onClick={onBack} className="text-center text-sm font-medium text-muted hover:text-ink">
                    {t('الرجوع لتسجيل الدخول')}
                </button>
            )}
        </form>
    );
}
