import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, unstable_HistoryRouter as HistoryRouter, useLocation } from 'react-router-dom';
import { StorePublicLayout } from '@/components/layout/StorePublicLayout';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Display';
import { PageLoader } from '@/components/ui/Spinner';
import { Icon } from '@/components/ui/Icon';
import { AdminAuthProvider, useAdminAuth } from '@/context/AdminAuthContext';
import { AffiliateAuthProvider, useAffiliateAuth } from '@/context/AffiliateAuthContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { t } from '@/i18n';
import { createStoreDomainHistory } from '@/lib/storeDomainHistory';

/* Pages and layouts load on demand: the storefront, dashboard, admin panel and affiliate portal each ship only what they use. */
const DashboardLayout = lazy(() => import('@/components/layout/DashboardLayout').then((module) => ({ default: module.DashboardLayout })));
const AdminLayout = lazy(() => import('@/components/layout/AdminLayout').then((module) => ({ default: module.AdminLayout })));
const AffiliatePortalLayout = lazy(() => import('@/features/affiliate-portal/AffiliatePortalLayout').then((module) => ({ default: module.AffiliatePortalLayout })));
const StorefrontLayout = lazy(() => import('@/features/storefront/StorefrontLayout').then((module) => ({ default: module.StorefrontLayout })));
const AdminLoginPage = lazy(() => import('@/pages/admin/AdminLoginPage').then((module) => ({ default: module.AdminLoginPage })));
const StoreActivityPage = lazy(() => import('@/pages/activity/StoreActivityPage').then((module) => ({ default: module.StoreActivityPage })));
const ImpersonatePage = lazy(() => import('@/pages/admin/ImpersonatePage').then((module) => ({ default: module.ImpersonatePage })));
const AdminVendorsPage = lazy(() => import('@/pages/admin/AdminVendorsPage').then((module) => ({ default: module.AdminVendorsPage })));
const AdminTeamPage = lazy(() => import('@/pages/admin/AdminTeamPage').then((module) => ({ default: module.AdminTeamPage })));
const AdminStorePage = lazy(() => import('@/pages/admin/AdminStorePage').then((module) => ({ default: module.AdminStorePage })));
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage').then((module) => ({ default: module.AdminOrdersPage })));
const AdminNotificationsPage = lazy(() => import('@/pages/admin/AdminNotificationsPage').then((module) => ({ default: module.AdminNotificationsPage })));
const AdminLogsPage = lazy(() => import('@/pages/admin/AdminLogsPage').then((module) => ({ default: module.AdminLogsPage })));
const AdminOverviewPage = lazy(() => import('@/pages/admin/AdminOverviewPage').then((module) => ({ default: module.AdminOverviewPage })));
const AdminPaymentsPage = lazy(() => import('@/pages/admin/AdminPaymentsPage').then((module) => ({ default: module.AdminPaymentsPage })));
const AdminPlansPage = lazy(() => import('@/pages/admin/AdminPlansPage').then((module) => ({ default: module.AdminPlansPage })));
const AdminRequestsPage = lazy(() => import('@/pages/admin/AdminRequestsPage').then((module) => ({ default: module.AdminRequestsPage })));
const AdminStoresPage = lazy(() => import('@/pages/admin/AdminStoresPage').then((module) => ({ default: module.AdminStoresPage })));
const AffiliateJoinPage = lazy(() => import('@/pages/affiliate-join/AffiliateJoinPage').then((module) => ({ default: module.AffiliateJoinPage })));
const AffiliateAccountPage = lazy(() => import('@/pages/affiliate/AffiliateAccountPage').then((module) => ({ default: module.AffiliateAccountPage })));
const AffiliateDashboardPage = lazy(() => import('@/pages/affiliate/AffiliateDashboardPage').then((module) => ({ default: module.AffiliateDashboardPage })));
const AffiliateLinksPage = lazy(() => import('@/pages/affiliate/AffiliateLinksPage').then((module) => ({ default: module.AffiliateLinksPage })));
const AffiliateNotificationsPage = lazy(() => import('@/pages/affiliate/AffiliateNotificationsPage').then((module) => ({ default: module.AffiliateNotificationsPage })));
const AffiliateOrdersPage = lazy(() => import('@/pages/affiliate/AffiliateOrdersPage').then((module) => ({ default: module.AffiliateOrdersPage })));
const AffiliatePayoutsPage = lazy(() => import('@/pages/affiliate/AffiliatePayoutsPage').then((module) => ({ default: module.AffiliatePayoutsPage })));
const AffiliateForgotPasswordPage = lazy(() => import('@/pages/affiliate/AffiliateForgotPasswordPage').then((module) => ({ default: module.AffiliateForgotPasswordPage })));
const AffiliateLoginPage = lazy(() => import('@/pages/affiliate/AffiliateLoginPage').then((module) => ({ default: module.AffiliateLoginPage })));
const AffiliateResetPasswordPage = lazy(() => import('@/pages/affiliate/AffiliateResetPasswordPage').then((module) => ({ default: module.AffiliateResetPasswordPage })));
const AffiliatesPage = lazy(() => import('@/pages/affiliates/AffiliatesPage').then((module) => ({ default: module.AffiliatesPage })));
const CategoriesPage = lazy(() => import('@/pages/categories/CategoriesPage').then((module) => ({ default: module.CategoriesPage })));
const LoyaltyPage = lazy(() => import('@/pages/loyalty/LoyaltyPage').then((module) => ({ default: module.LoyaltyPage })));
const CouponsPage = lazy(() => import('@/pages/coupons/CouponsPage').then((module) => ({ default: module.CouponsPage })));
const CustomersPage = lazy(() => import('@/pages/customers/CustomersPage').then((module) => ({ default: module.CustomersPage })));
const DashboardHomePage = lazy(() => import('@/pages/dashboard/DashboardHomePage').then((module) => ({ default: module.DashboardHomePage })));
const InventoryPage = lazy(() => import('@/pages/inventory/InventoryPage').then((module) => ({ default: module.InventoryPage })));
const StockMovementsPage = lazy(() => import('@/pages/inventory/StockMovementsPage').then((module) => ({ default: module.StockMovementsPage })));
const WarehousesPage = lazy(() => import('@/pages/inventory/WarehousesPage').then((module) => ({ default: module.WarehousesPage })));
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage').then((module) => ({ default: module.NotificationsPage })));
const OrderPrintPage = lazy(() => import('@/pages/orders/OrderPrintPage').then((module) => ({ default: module.OrderPrintPage })));
const OrdersPage = lazy(() => import('@/pages/orders/OrdersPage').then((module) => ({ default: module.OrdersPage })));
const ShippingPage = lazy(() => import('@/pages/shipping/ShippingPage').then((module) => ({ default: module.ShippingPage })));
const StoreAuthPage = lazy(() => import('@/pages/storefront/StoreAuthPage').then((module) => ({ default: module.StoreAuthPage })));
const StoreCartPage = lazy(() => import('@/pages/storefront/StoreCartPage').then((module) => ({ default: module.StoreCartPage })));
const StoreCheckoutPage = lazy(() => import('@/pages/storefront/StoreCheckoutPage').then((module) => ({ default: module.StoreCheckoutPage })));
const StoreCatalogPage = lazy(() => import('@/pages/storefront/StoreCatalogPage').then((module) => ({ default: module.StoreCatalogPage })));
const StoreHomePage = lazy(() => import('@/pages/storefront/StoreHomePage').then((module) => ({ default: module.StoreHomePage })));
const StoreWishlistPage = lazy(() => import('@/pages/storefront/StoreWishlistPage').then((module) => ({ default: module.StoreWishlistPage })));
const StorePointsPage = lazy(() => import('@/pages/storefront/StorePointsPage').then((module) => ({ default: module.StorePointsPage })));
const StoreOrderPage = lazy(() => import('@/pages/storefront/StoreOrderPage').then((module) => ({ default: module.StoreOrderPage })));
const StoreOrdersPage = lazy(() => import('@/pages/storefront/StoreOrdersPage').then((module) => ({ default: module.StoreOrdersPage })));
const StoreForgotPasswordPage = lazy(() => import('@/pages/storefront/StorePasswordPages').then((module) => ({ default: module.StoreForgotPasswordPage })));
const StoreResetPasswordPage = lazy(() => import('@/pages/storefront/StorePasswordPages').then((module) => ({ default: module.StoreResetPasswordPage })));
const StorePolicyPage = lazy(() => import('@/pages/storefront/StorePolicyPage').then((module) => ({ default: module.StorePolicyPage })));
const StoreProductPage = lazy(() => import('@/pages/storefront/StoreProductPage').then((module) => ({ default: module.StoreProductPage })));
const ProductFormPage = lazy(() => import('@/pages/products/ProductFormPage').then((module) => ({ default: module.ProductFormPage })));
const ProductsPage = lazy(() => import('@/pages/products/ProductsPage').then((module) => ({ default: module.ProductsPage })));
const PaymentsPage = lazy(() => import('@/pages/payments/PaymentsPage').then((module) => ({ default: module.PaymentsPage })));
const PayoutRequestsPage = lazy(() => import('@/pages/payouts/PayoutRequestsPage').then((module) => ({ default: module.PayoutRequestsPage })));
const PurchaseOrderFormPage = lazy(() => import('@/pages/purchasing/PurchaseOrderFormPage').then((module) => ({ default: module.PurchaseOrderFormPage })));
const PurchaseOrderPage = lazy(() => import('@/pages/purchasing/PurchaseOrderPage').then((module) => ({ default: module.PurchaseOrderPage })));
const PurchaseOrdersPage = lazy(() => import('@/pages/purchasing/PurchaseOrdersPage').then((module) => ({ default: module.PurchaseOrdersPage })));
const SuppliersPage = lazy(() => import('@/pages/purchasing/SuppliersPage').then((module) => ({ default: module.SuppliersPage })));
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage').then((module) => ({ default: module.ReportsPage })));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const StaffPage = lazy(() => import('@/pages/staff/StaffPage').then((module) => ({ default: module.StaffPage })));
const SubscriptionPage = lazy(() => import('@/pages/subscription/SubscriptionPage').then((module) => ({ default: module.SubscriptionPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })));
const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })));

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
                <h1 className="mt-6 text-2xl font-bold text-ink">{t('سجّل دخولك من رابط متجرك')}</h1>
                <p className="mt-3 text-sm leading-relaxed text-muted">{t('لكل متجر صفحة دخول خاصة بمسوقيه. استخدم رابط الدخول الذي أرسله لك المتجر.')}</p>
            </div>
        </StorePublicLayout>
    );
}

/** Platform admin panel guard (its own session, separate from vendors). */
function RequireAdmin() {
    const { isAuthenticated } = useAdminAuth();
    const location = useLocation();

    return isAuthenticated ? <Outlet /> : <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />;
}

/** Admin panel pages a team member's role doesn't cover show a notice. */
function RequireAdminPermission({ permission }) {
    const { can } = useAdminAuth();

    return can(permission) ? <Outlet /> : <EmptyState icon="lock" title={t('ليس لديك صلاحية لهذا القسم')} description={t('اطلب من المدير العام إضافة هذا القسم إلى دورك.')} />;
}

function AdminGuestOnly() {
    const { isAuthenticated } = useAdminAuth();

    return isAuthenticated ? <Navigate to="/admin" replace /> : <Outlet />;
}

/** Dashboard sections a staff member wasn't given show a notice instead of failing requests. */
function RequirePermission({ permission }) {
    const { can, billingExpired, isOwner } = useAuth();

    if (billingExpired && permission !== 'billing') {
        return (
            <EmptyState
                icon="zap"
                title={t('اشتراكك منتهي')}
                description={isOwner ? t('اختر باقة لتستكمل استخدام لوحة التحكم.') : t('اطلب من صاحب المتجر اختيار باقة.')}
                action={isOwner && <Button to="/dashboard/subscription" icon="zap">{t('اختر باقة')}</Button>}
            />
        );
    }

    if (can(permission)) {
        return <Outlet />;
    }

    return (
        <EmptyState
            icon="lock"
            title={t('ليس لديك صلاحية لهذا القسم')}
            description={t('اطلب من صاحب المتجر إضافة هذا القسم إلى صلاحياتك.')}
            action={<Button to="/dashboard" variant="secondary" icon="arrow-right">{t('العودة للرئيسية')}</Button>}
        />
    );
}

function GuestOnly() {
    const { isAuthenticated } = useAuth();

    return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

/** On a store's own domain the storefront is served at "/" (see lib/storeDomainHistory). */
const STORE_DOMAIN_SLUG = typeof window !== 'undefined' ? (window.__MAKHZAN_STORE_DOMAIN__ ?? null) : null;
const storeDomainHistory = STORE_DOMAIN_SLUG ? createStoreDomainHistory(STORE_DOMAIN_SLUG) : null;

function AppRouter({ children }) {
    return storeDomainHistory ? <HistoryRouter history={storeDomainHistory}>{children}</HistoryRouter> : <BrowserRouter>{children}</BrowserRouter>;
}

export function App() {
    return (
        <ThemeProvider>
            <ToastProvider>
                <AuthProvider>
                    <AffiliateAuthProvider>
                    <AdminAuthProvider>
                    <AppRouter>
                        <Suspense fallback={<PageLoader fullScreen />}>
                        <Routes>
                            <Route element={<GuestOnly />}>
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/register" element={<RegisterPage />} />
                                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                                <Route path="/reset-password" element={<ResetPasswordPage />} />
                            </Route>
                            <Route element={<RequireVendor />}>
                                <Route element={<RequirePermission permission="orders" />}>
                                    <Route path="/dashboard/orders/print" element={<OrderPrintPage />} />
                                </Route>
                                <Route path="/dashboard" element={<DashboardLayout />}>
                                    <Route element={<RequirePermission permission="any" />}>
                                        <Route index element={<DashboardHomePage />} />
                                    </Route>
                                    <Route path="notifications" element={<NotificationsPage />} />
                                    <Route path="settings" element={<SettingsPage />} />
                                    <Route element={<RequirePermission permission="billing" />}>
                                        <Route path="subscription" element={<SubscriptionPage />} />
                                    </Route>
                                    <Route element={<RequirePermission permission="owner" />}>
                                        <Route path="staff" element={<StaffPage />} />
                                        <Route path="activity" element={<StoreActivityPage />} />
                                    </Route>
                                    <Route element={<RequirePermission permission="reports" />}>
                                        <Route path="reports" element={<ReportsPage />} />
                                    </Route>
                                    <Route element={<RequirePermission permission="customers" />}>
                                        <Route path="customers" element={<CustomersPage />} />
                                    </Route>
                                    <Route element={<RequirePermission permission="marketing" />}>
                                        <Route path="coupons" element={<CouponsPage />} />
                                        <Route path="loyalty" element={<LoyaltyPage />} />
                                        <Route path="affiliates" element={<AffiliatesPage />} />
                                        <Route path="payout-requests" element={<PayoutRequestsPage />} />
                                    </Route>
                                    <Route element={<RequirePermission permission="inventory" />}>
                                        <Route path="inventory" element={<InventoryPage />} />
                                        <Route path="inventory/movements" element={<StockMovementsPage />} />
                                        <Route path="warehouses" element={<WarehousesPage />} />
                                    </Route>
                                    <Route element={<RequirePermission permission="purchasing" />}>
                                        <Route path="suppliers" element={<SuppliersPage />} />
                                        <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
                                        <Route path="purchase-orders/new" element={<PurchaseOrderFormPage />} />
                                        <Route path="purchase-orders/:purchaseOrderId" element={<PurchaseOrderPage />} />
                                        <Route path="purchase-orders/:purchaseOrderId/edit" element={<PurchaseOrderFormPage key="edit" />} />
                                    </Route>
                                    <Route element={<RequirePermission permission="orders" />}>
                                        <Route path="orders" element={<OrdersPage />} />
                                    </Route>
                                    <Route element={<RequirePermission permission="payments" />}>
                                        <Route path="payments" element={<PaymentsPage />} />
                                    </Route>
                                    <Route element={<RequirePermission permission="settings" />}>
                                        <Route path="shipping" element={<ShippingPage />} />
                                    </Route>
                                    <Route element={<RequirePermission permission="products" />}>
                                        <Route path="categories" element={<CategoriesPage />} />
                                        <Route path="products" element={<ProductsPage />} />
                                        <Route path="products/new" element={<ProductFormPage />} />
                                        <Route path="products/:productId" element={<ProductFormPage />} />
                                    </Route>
                                </Route>
                            </Route>
                            <Route element={<AdminGuestOnly />}>
                                <Route path="/admin/login" element={<AdminLoginPage />} />
                            </Route>
                            <Route element={<RequireAdmin />}>
                                <Route path="/admin" element={<AdminLayout />}>
                                    <Route element={<RequireAdminPermission permission="overview.view" />}>
                                        <Route index element={<AdminOverviewPage />} />
                                    </Route>
                                    <Route path="notifications" element={<AdminNotificationsPage />} />
                                    <Route element={<RequireAdminPermission permission="stores.view" />}>
                                        <Route path="stores" element={<AdminStoresPage />} />
                                        <Route path="stores/:storeId" element={<AdminStorePage />} />
                                    </Route>
                                    <Route element={<RequireAdminPermission permission="orders.view" />}>
                                        <Route path="orders" element={<AdminOrdersPage />} />
                                    </Route>
                                    <Route element={<RequireAdminPermission permission="vendors.view" />}>
                                        <Route path="vendors" element={<AdminVendorsPage />} />
                                    </Route>
                                    <Route element={<RequireAdminPermission permission="subscriptions.view" />}>
                                        <Route path="requests" element={<AdminRequestsPage />} />
                                        <Route path="payments" element={<AdminPaymentsPage />} />
                                    </Route>
                                    <Route element={<RequireAdminPermission permission="plans.view" />}>
                                        <Route path="plans" element={<AdminPlansPage />} />
                                    </Route>
                                    <Route element={<RequireAdminPermission permission="logs.view" />}>
                                        <Route path="logs" element={<AdminLogsPage />} />
                                    </Route>
                                    <Route element={<RequireAdminPermission permission="team.manage" />}>
                                        <Route path="team" element={<AdminTeamPage />} />
                                    </Route>
                                </Route>
                            </Route>
                            <Route path="/impersonate" element={<ImpersonatePage />} />
                            <Route element={<RequireAffiliate />}>
                                <Route path="/affiliate" element={<AffiliatePortalLayout />}>
                                    <Route index element={<AffiliateDashboardPage />} />
                                    <Route path="orders" element={<AffiliateOrdersPage />} />
                                    <Route path="payouts" element={<AffiliatePayoutsPage />} />
                                    <Route path="links" element={<AffiliateLinksPage />} />
                                    <Route path="notifications" element={<AffiliateNotificationsPage />} />
                                    <Route path="account" element={<AffiliateAccountPage />} />
                                </Route>
                            </Route>
                            <Route path="/affiliate-portal" element={<Navigate to="/affiliate" replace />} />
                            {/* Public: reachable logged in or out (vendors preview their own link). */}
                            <Route path="/:storeSlug/affiliates/join" element={<AffiliateJoinPage />} />
                            <Route path="/:storeSlug/affiliates/login" element={<AffiliateLoginPage />} />
                            <Route path="/:storeSlug/affiliates/forgot-password" element={<AffiliateForgotPasswordPage />} />
                            <Route path="/:storeSlug/affiliates/reset-password" element={<AffiliateResetPasswordPage />} />
                            {/* Public storefront: /{store-slug}, its categories, products, search and cart. */}
                            <Route path="/:storeSlug" element={<StorefrontLayout />}>
                                <Route index element={<StoreHomePage />} />
                                <Route path="products" element={<StoreCatalogPage />} />
                                <Route path="c/:categorySlug" element={<StoreCatalogPage mode="category" />} />
                                <Route path="search" element={<StoreCatalogPage mode="search" />} />
                                <Route path="p/:productSlug" element={<StoreProductPage />} />
                                <Route path="cart" element={<StoreCartPage />} />
                                <Route path="checkout" element={<StoreCheckoutPage />} />
                                <Route path="account/login" element={<StoreAuthPage mode="login" />} />
                                <Route path="account/register" element={<StoreAuthPage mode="register" />} />
                                <Route path="account/forgot-password" element={<StoreForgotPasswordPage />} />
                                <Route path="account/reset-password" element={<StoreResetPasswordPage />} />
                                <Route path="account/orders" element={<StoreOrdersPage />} />
                                <Route path="account/orders/:number" element={<StoreOrderPage />} />
                                <Route path="account/wishlist" element={<StoreWishlistPage />} />
                                <Route path="account/points" element={<StorePointsPage />} />
                                <Route path="policies/:policy" element={<StorePolicyPage />} />
                            </Route>
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                        </Suspense>
                    </AppRouter>
                    </AdminAuthProvider>
                    </AffiliateAuthProvider>
                </AuthProvider>
            </ToastProvider>
        </ThemeProvider>
    );
}
