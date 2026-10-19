import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthHeading, AuthLayout } from '@/components/layout/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { EmailCodeForm } from '@/features/auth/EmailCodeForm';
import { t } from '@/i18n';
import { authApi } from '@/services/authApi';

/**
 * Sign-up and first sign-in end here: the vendor types the 6-digit code emailed to them and
 * is signed in. Reached with the challenge in the navigation state.
 */
export function VerifyEmailPage() {
    const { verifyEmail } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const [verification, setVerification] = useState(location.state?.verification ?? null);

    if (!verification) {
        return <Navigate to="/login" replace />;
    }

    const verify = async (code) => {
        const vendor = await verifyEmail({ challenge: verification.challenge, code, remember: verification.remember ?? true });

        if (location.state?.isNewStore) {
            toast.success(t('تم إنشاء متجر «{name}» بنجاح 🎉', { name: vendor.store.name }), t('مرحباً بك في Sellygrow، يمكنك البدء بإضافة مسوقيك الآن.'));
        } else {
            toast.success(t('أهلاً بعودتك يا {value} 👋', { value: vendor.full_name.split(' ')[0] }), t('تم تسجيل الدخول بنجاح'));
        }

        navigate(location.state?.from ?? '/dashboard', { replace: true });
    };

    const resend = async () => {
        const result = await authApi.resendVerification(verification.challenge);

        setVerification((current) => ({ ...current, ...result }));

        return result;
    };

    return (
        <AuthLayout>
            <AuthHeading title={t('تأكيد البريد الإلكتروني')} />
            <EmailCodeForm verification={verification} onVerify={verify} onResend={resend} />
        </AuthLayout>
    );
}
