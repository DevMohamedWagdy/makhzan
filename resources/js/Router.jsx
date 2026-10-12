import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StorePublicLayout } from '@/components/layout/StorePublicLayout';
import { Icon } from '@/components/ui/Icon';
import { AffiliateAuthProvider, useAffiliateAuth } from '@/context/AffiliateAuthContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { AffiliateJoinPage } from '@/pages/affiliate-join/AffiliateJoinPage';
import { AffiliateDashboardPage } from '@/pages/affiliate/AffiliateDashboardPage';
import { AffiliateForgotPasswordPage } from '@/pages/affiliate/AffiliateForgotPasswordPage';
import { AffiliateLoginPage } from '@/pages/affiliate/AffiliateLoginPage';
import { AffiliateResetPasswordPage } from '@/pages/affiliate/AffiliateResetPasswordPage';
import { AffiliatesPage } from '@/pages/affiliates/AffiliatesPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';

function RequireVendor() {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
}

/** Affiliate portal guard: own session or a vendor's impersonation session. */
function RequireAffiliate() {
    const { isAuthenticated, storeSlug } = useAffiliateAuth();
    const { isAuthenticated: isVendor } = useAuth();

    if (isAuthenticated) {
        return <Outlet />;
    }

    // A vendor whose impersonation just ended (or expired) belongs back on their dashboard.
    if (isVendor) {
        return <Navigate to="/dashboard/affiliates" replace />;
    }

    if (storeSlug) {
        return <Navigate to={`/${storeSlug}/affiliates/login`} replace />;
    }

    // Login is per store, and we don't know which one: point them to their store's link.
    return (
        <StorePublicLayout narrow>
            <div className="text-center">
                <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary">
                    <Icon name="log-in" className="size-8" />
                </span>
                <h1 className="mt-6 text-2xl font-bold text-ink">سجّل دخولك من رابط متجرك</h1>
                <p className="mt-3 text-sm leading-relaxed text-muted">لكل متجر صفحة دخول خاصة بمسوقيه. استخدم رابط الدخول الذي أرسله لك المتجر.</p>
            </div>
        </StorePublicLayout>
    );
}

function GuestOnly() {
    const { isAuthenticated } = useAuth();

    return isAuthenticated ? <Navigate to="/dashboard/affiliates" replace /> : <Outlet />;
}

export function App() {
    return (
        <ThemeProvider>
            <ToastProvider>
                <AuthProvider>
                    <AffiliateAuthProvider>
                    <BrowserRouter>
                        <Routes>
                            <Route element={<GuestOnly />}>
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/register" element={<RegisterPage />} />
                                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                                <Route path="/reset-password" element={<ResetPasswordPage />} />
                            </Route>
                            <Route element={<RequireVendor />}>
                                <Route path="/dashboard" element={<DashboardLayout />}>
                                    <Route index element={<Navigate to="affiliates" replace />} />
                                    <Route path="affiliates" element={<AffiliatesPage />} />
                                </Route>
                            </Route>
                            <Route element={<RequireAffiliate />}>
                                <Route path="/affiliate" element={<AffiliateDashboardPage />} />
                            </Route>
                            <Route path="/affiliate-portal" element={<Navigate to="/affiliate" replace />} />
                            {/* Public: reachable logged in or out (vendors preview their own link). */}
                            <Route path="/:storeSlug/affiliates/join" element={<AffiliateJoinPage />} />
                            <Route path="/:storeSlug/affiliates/login" element={<AffiliateLoginPage />} />
                            <Route path="/:storeSlug/affiliates/forgot-password" element={<AffiliateForgotPasswordPage />} />
                            <Route path="/:storeSlug/affiliates/reset-password" element={<AffiliateResetPasswordPage />} />
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                    </BrowserRouter>
                    </AffiliateAuthProvider>
                </AuthProvider>
            </ToastProvider>
        </ThemeProvider>
    );
}
