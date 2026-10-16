<?php

use App\Http\Controllers\Api\V1\Admin\ActivityLogController as AdminActivityLogController;
use App\Http\Controllers\Api\V1\Admin\AdminRoleController;
use App\Http\Controllers\Api\V1\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Api\V1\Admin\NotificationController as AdminNotificationController;
use App\Http\Controllers\Api\V1\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\V1\Admin\OverviewController as AdminOverviewController;
use App\Http\Controllers\Api\V1\Admin\PlanController as AdminPlanController;
use App\Http\Controllers\Api\V1\Admin\StoreController as AdminStoreController;
use App\Http\Controllers\Api\V1\Admin\SubscriptionPaymentController as AdminSubscriptionPaymentController;
use App\Http\Controllers\Api\V1\Admin\SubscriptionRequestController as AdminSubscriptionRequestController;
use App\Http\Controllers\Api\V1\Admin\TeamController as AdminTeamController;
use App\Http\Controllers\Api\V1\Admin\VendorController as AdminVendorController;
use App\Http\Controllers\Api\V1\Affiliate\Auth\AffiliateAuthController;
use App\Http\Controllers\Api\V1\Affiliate\Auth\AffiliatePasswordController;
use App\Http\Controllers\Api\V1\Affiliate\Auth\AffiliatePasswordResetController;
use App\Http\Controllers\Api\V1\Affiliate\NotificationController as AffiliateNotificationController;
use App\Http\Controllers\Api\V1\Affiliate\OrderController as AffiliateOrderController;
use App\Http\Controllers\Api\V1\Affiliate\PayoutController;
use App\Http\Controllers\Api\V1\Payments\PaymobCallbackController;
use App\Http\Controllers\Api\V1\Public\AffiliateRegistrationController;
use App\Http\Controllers\Api\V1\Public\StoreController;
use App\Http\Controllers\Api\V1\Shipping\BostaWebhookController;
use App\Http\Controllers\Api\V1\Storefront\CartController;
use App\Http\Controllers\Api\V1\Storefront\Customer\AddressController as CustomerAddressController;
use App\Http\Controllers\Api\V1\Storefront\Customer\AuthController as CustomerAuthController;
use App\Http\Controllers\Api\V1\Storefront\Customer\CouponController as CustomerCouponController;
use App\Http\Controllers\Api\V1\Storefront\Customer\LoyaltyController as CustomerLoyaltyController;
use App\Http\Controllers\Api\V1\Storefront\Customer\OrderController as CustomerOrderController;
use App\Http\Controllers\Api\V1\Storefront\Customer\PasswordResetController as CustomerPasswordResetController;
use App\Http\Controllers\Api\V1\Storefront\Customer\ProductReviewController as CustomerProductReviewController;
use App\Http\Controllers\Api\V1\Storefront\Customer\WishlistController as CustomerWishlistController;
use App\Http\Controllers\Api\V1\Storefront\PolicyController;
use App\Http\Controllers\Api\V1\Storefront\ProductController as StorefrontProductController;
use App\Http\Controllers\Api\V1\Storefront\ProductReviewController as StorefrontProductReviewController;
use App\Http\Controllers\Api\V1\Storefront\ReferralClickController;
use App\Http\Controllers\Api\V1\Storefront\ShippingController;
use App\Http\Controllers\Api\V1\Storefront\StorefrontController;
use App\Http\Controllers\Api\V1\Vendor\ActivityLogController as VendorActivityLogController;
use App\Http\Controllers\Api\V1\Vendor\AffiliateCommissionController;
use App\Http\Controllers\Api\V1\Vendor\AffiliateController;
use App\Http\Controllers\Api\V1\Vendor\AffiliateImpersonationController;
use App\Http\Controllers\Api\V1\Vendor\AffiliateImportController;
use App\Http\Controllers\Api\V1\Vendor\AffiliatePayoutController;
use App\Http\Controllers\Api\V1\Vendor\AffiliateReferralCodeController;
use App\Http\Controllers\Api\V1\Vendor\AffiliateRegistrationLinkController;
use App\Http\Controllers\Api\V1\Vendor\AffiliateStatusController;
use App\Http\Controllers\Api\V1\Vendor\AffiliateSummaryController;
use App\Http\Controllers\Api\V1\Vendor\Auth\PasswordResetController;
use App\Http\Controllers\Api\V1\Vendor\Auth\VendorAccountController;
use App\Http\Controllers\Api\V1\Vendor\Auth\VendorAuthController;
use App\Http\Controllers\Api\V1\Vendor\CouponController;
use App\Http\Controllers\Api\V1\Vendor\CustomerController;
use App\Http\Controllers\Api\V1\Vendor\CustomerPointsController;
use App\Http\Controllers\Api\V1\Vendor\CustomerSummaryController;
use App\Http\Controllers\Api\V1\Vendor\InventoryController;
use App\Http\Controllers\Api\V1\Vendor\InventoryImportController;
use App\Http\Controllers\Api\V1\Vendor\InventorySettingsController;
use App\Http\Controllers\Api\V1\Vendor\InventorySummaryController;
use App\Http\Controllers\Api\V1\Vendor\LoyaltySettingsController;
use App\Http\Controllers\Api\V1\Vendor\NotificationController;
use App\Http\Controllers\Api\V1\Vendor\OrderController as VendorOrderController;
use App\Http\Controllers\Api\V1\Vendor\OrderShipmentController;
use App\Http\Controllers\Api\V1\Vendor\OrderSummaryController;
use App\Http\Controllers\Api\V1\Vendor\PaymentSettingsController;
use App\Http\Controllers\Api\V1\Vendor\PaymentTransactionController;
use App\Http\Controllers\Api\V1\Vendor\PayoutController as VendorPayoutController;
use App\Http\Controllers\Api\V1\Vendor\ProductCategoryController;
use App\Http\Controllers\Api\V1\Vendor\ProductController;
use App\Http\Controllers\Api\V1\Vendor\ProductImageController;
use App\Http\Controllers\Api\V1\Vendor\ProductReviewController;
use App\Http\Controllers\Api\V1\Vendor\ProductSummaryController;
use App\Http\Controllers\Api\V1\Vendor\PurchaseOrderController;
use App\Http\Controllers\Api\V1\Vendor\ReportController;
use App\Http\Controllers\Api\V1\Vendor\ShippingCarrierController;
use App\Http\Controllers\Api\V1\Vendor\ShippingSettingsController;
use App\Http\Controllers\Api\V1\Vendor\StaffController;
use App\Http\Controllers\Api\V1\Vendor\StockMovementController;
use App\Http\Controllers\Api\V1\Vendor\StockTransferController;
use App\Http\Controllers\Api\V1\Vendor\StoreDomainController;
use App\Http\Controllers\Api\V1\Vendor\StoreRoleController;
use App\Http\Controllers\Api\V1\Vendor\StoreSettingsController;
use App\Http\Controllers\Api\V1\Vendor\StoreSlugAvailabilityController;
use App\Http\Controllers\Api\V1\Vendor\SubscriptionController;
use App\Http\Controllers\Api\V1\Vendor\SupplierController;
use App\Http\Controllers\Api\V1\Vendor\TrackingPixelController;
use App\Http\Controllers\Api\V1\Vendor\WarehouseController;
use App\Models\Store;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function () {
    /*
    | Vendor authentication (public)
    */
    Route::prefix('vendor/auth')->name('vendor.auth.')->group(function () {
        // Login is throttled per identifier + IP inside LoginRequest.
        Route::post('login', [VendorAuthController::class, 'login'])->name('login');
        Route::post('register', [VendorAuthController::class, 'register'])->middleware('throttle:vendor-register')->name('register');
        Route::post('forgot-password', [PasswordResetController::class, 'store'])->middleware('throttle:vendor-password')->name('forgot-password');
        Route::post('reset-password', [PasswordResetController::class, 'update'])->middleware('throttle:vendor-password')->name('reset-password');
    });

    Route::get('stores/slug-availability', StoreSlugAvailabilityController::class)
        ->middleware('throttle:60,1')
        ->name('stores.slug-availability');

    Route::get('stores/{store:slug}', [StoreController::class, 'show'])
        ->middleware('throttle:60,1')
        ->missing(fn () => abort(404, 'المتجر غير موجود'))
        ->name('stores.show');

    /*
    | Storefront (public, for shoppers)
    */
    Route::prefix('storefront/{store:slug}')
        ->name('storefront.')
        ->middleware(['throttle:120,1', 'store.active'])
        ->missing(fn () => abort(404, __('forms.store_not_found')))
        ->group(function () {
            Route::get('/', [StorefrontController::class, 'show'])->name('show');
            Route::get('products', [StorefrontProductController::class, 'index'])->name('products.index');
            Route::get('products/{productSlug}', [StorefrontProductController::class, 'show'])->name('products.show');
            Route::get('products/{productSlug}/reviews', [StorefrontProductReviewController::class, 'index'])->name('products.reviews.index');
            Route::post('referral-clicks', ReferralClickController::class)->middleware('throttle:30,1')->name('referral-clicks.store');
            Route::post('cart/quote', [CartController::class, 'quote'])->name('cart.quote');
            Route::get('shipping', ShippingController::class)->name('shipping');
            Route::get('policies/{policy}', PolicyController::class)->whereIn('policy', array_keys(Store::POLICIES))->name('policies.show');

            // Shopper accounts (one per store).
            Route::post('customer/register', [CustomerAuthController::class, 'register'])->middleware('throttle:10,1')->name('customer.register');
            Route::post('customer/login', [CustomerAuthController::class, 'login'])->name('customer.login');
            Route::post('customer/forgot-password', [CustomerPasswordResetController::class, 'store'])->middleware('throttle:customer-password')->name('customer.forgot-password');
            Route::post('customer/reset-password', [CustomerPasswordResetController::class, 'update'])->middleware('throttle:customer-password')->name('customer.reset-password');

            Route::middleware(['auth:sanctum', 'customer'])->prefix('customer')->name('customer.')->group(function () {
                Route::get('me', [CustomerAuthController::class, 'me'])->name('me');
                Route::post('logout', [CustomerAuthController::class, 'logout'])->name('logout');
                Route::apiResource('addresses', CustomerAddressController::class)->except('show');
                Route::post('coupon', CustomerCouponController::class)->middleware('throttle:30,1')->name('coupon');
                Route::get('orders', [CustomerOrderController::class, 'index'])->name('orders.index');
                Route::post('orders', [CustomerOrderController::class, 'store'])->middleware('throttle:10,1')->name('orders.store');
                Route::get('orders/{number}', [CustomerOrderController::class, 'show'])->whereNumber('number')->name('orders.show');
                Route::post('orders/{number}/cancel', [CustomerOrderController::class, 'cancel'])->whereNumber('number')->name('orders.cancel');
                Route::post('orders/{number}/pay', [CustomerOrderController::class, 'pay'])->whereNumber('number')->middleware('throttle:10,1')->name('orders.pay');
                Route::get('products/{productSlug}/review', [CustomerProductReviewController::class, 'show'])->name('products.review.show');
                Route::post('products/{productSlug}/review', [CustomerProductReviewController::class, 'store'])->middleware('throttle:10,1')->name('products.review.store');
                Route::get('points', CustomerLoyaltyController::class)->name('points');
                Route::get('wishlist', [CustomerWishlistController::class, 'index'])->name('wishlist.index');
                Route::post('wishlist', [CustomerWishlistController::class, 'store'])->middleware('throttle:60,1')->name('wishlist.store');
                Route::delete('wishlist/{productId}', [CustomerWishlistController::class, 'destroy'])->whereNumber('productId')->name('wishlist.destroy');
            });
        });

    /*
    | Payment gateway callbacks (public, verified by the store's signing secret)
    */
    Route::prefix('payments/paymob/{store:slug}')
        ->name('payments.paymob.')
        ->middleware('throttle:120,1')
        ->group(function () {
            Route::post('webhook', [PaymobCallbackController::class, 'webhook'])->name('webhook');
            Route::get('return', [PaymobCallbackController::class, 'return'])->name('return');
        });

    /*
    | Shipping company webhooks (public, verified by the store's shared secret)
    */
    Route::post('shipping/bosta/{store:slug}/orders/{order}/webhook', BostaWebhookController::class)
        ->middleware('throttle:240,1')
        ->name('shipping.bosta.webhook');

    /*
    | Affiliate portal
    */
    Route::prefix('affiliate')->name('affiliate.')->group(function () {
        // Login is throttled per store + identifier + IP inside AffiliateLoginRequest.
        Route::post('auth/login', [AffiliateAuthController::class, 'login'])->name('auth.login');
        Route::post('auth/forgot-password', [AffiliatePasswordResetController::class, 'store'])->middleware('throttle:affiliate-password')->name('auth.forgot-password');
        Route::post('auth/reset-password', [AffiliatePasswordResetController::class, 'update'])->middleware('throttle:affiliate-password')->name('auth.reset-password');

        Route::middleware(['auth:sanctum', 'affiliate'])->group(function () {
            Route::get('auth/me', [AffiliateAuthController::class, 'me'])->name('auth.me');
            Route::post('auth/logout', [AffiliateAuthController::class, 'logout'])->name('auth.logout');
            Route::get('payouts', [PayoutController::class, 'index'])->name('payouts.index');
            Route::get('orders', [AffiliateOrderController::class, 'index'])->name('orders.index');
            Route::get('notifications', [AffiliateNotificationController::class, 'index'])->name('notifications.index');
        });

        // The affiliate acting as themselves only — never through a vendor's impersonation token.
        Route::middleware(['auth:sanctum', 'affiliate:self'])->group(function () {
            Route::put('auth/password', [AffiliatePasswordController::class, 'update'])->name('auth.password');
            Route::post('payouts', [PayoutController::class, 'store'])->middleware('throttle:10,1')->name('payouts.store');
            // A vendor looking around as the affiliate leaves their notifications unread.
            Route::post('notifications/read-all', [AffiliateNotificationController::class, 'readAll'])->name('notifications.read-all');
            Route::post('notifications/{notification}/read', [AffiliateNotificationController::class, 'read'])->name('notifications.read');
        });
    });

    /*
    | Affiliate self-registration through a store's public link (no auth)
    */
    Route::prefix('affiliate-registration/{registrationLink:token}')
        ->name('affiliate-registration.')
        ->missing(fn () => abort(404, 'رابط التسجيل غير صالح أو متوقف حالياً'))
        ->group(function () {
            Route::get('/', [AffiliateRegistrationController::class, 'show'])->middleware('throttle:60,1')->name('show');
            Route::post('/', [AffiliateRegistrationController::class, 'store'])->middleware('throttle:affiliate-registration')->name('store');
        });

    /*
    | Platform admin panel (admin bearer token required)
    */
    Route::prefix('admin')->name('admin.')->group(function () {
        Route::post('auth/login', [AdminAuthController::class, 'login'])->middleware('throttle:10,1')->name('auth.login');

        Route::middleware(['auth:sanctum', 'admin'])->group(function () {
            Route::get('auth/me', [AdminAuthController::class, 'me'])->name('auth.me');
            Route::post('auth/logout', [AdminAuthController::class, 'logout'])->name('auth.logout');

            Route::get('notifications', [AdminNotificationController::class, 'index'])->name('notifications.index');
            Route::post('notifications/read-all', [AdminNotificationController::class, 'readAll'])->name('notifications.read-all');
            Route::post('notifications/{notification}/read', [AdminNotificationController::class, 'read'])->name('notifications.read');

            Route::get('overview', AdminOverviewController::class)->middleware('admin.can:overview.view')->name('overview');

            Route::middleware('admin.can:stores.view')->group(function () {
                Route::get('stores', [AdminStoreController::class, 'index'])->name('stores.index');
                Route::get('stores/{store}', [AdminStoreController::class, 'show'])->name('stores.show');
                Route::get('stores/{store}/products', [AdminStoreController::class, 'products'])->name('stores.products');
                Route::get('stores/{store}/customers', [AdminStoreController::class, 'customers'])->name('stores.customers');
            });
            Route::patch('stores/{store}', [AdminStoreController::class, 'update'])->middleware('admin.can:stores.update')->name('stores.update');
            Route::post('stores/{store}/suspend', [AdminStoreController::class, 'suspend'])->middleware('admin.can:stores.suspend')->name('stores.suspend');
            Route::post('stores/{store}/unsuspend', [AdminStoreController::class, 'unsuspend'])->middleware('admin.can:stores.suspend')->name('stores.unsuspend');
            Route::post('stores/{store}/impersonate', [AdminStoreController::class, 'impersonate'])->middleware(['admin.can:stores.impersonate', 'throttle:20,1'])->name('stores.impersonate');

            Route::middleware('admin.can:subscriptions.manage')->group(function () {
                Route::post('stores/{store}/subscription', [AdminStoreController::class, 'activateSubscription'])->name('stores.subscription');
                Route::post('stores/{store}/trial', [AdminStoreController::class, 'extendTrial'])->name('stores.trial');
                Route::post('subscription-requests/{subscriptionRequest}/approve', [AdminSubscriptionRequestController::class, 'approve'])->name('subscription-requests.approve');
                Route::post('subscription-requests/{subscriptionRequest}/reject', [AdminSubscriptionRequestController::class, 'reject'])->name('subscription-requests.reject');
            });
            Route::middleware('admin.can:subscriptions.view')->group(function () {
                Route::get('subscription-requests', [AdminSubscriptionRequestController::class, 'index'])->name('subscription-requests.index');
                Route::get('subscription-payments', [AdminSubscriptionPaymentController::class, 'index'])->name('subscription-payments.index');
            });

            Route::get('plans', [AdminPlanController::class, 'index'])->middleware('admin.can:plans.view')->name('plans.index');
            Route::apiResource('plans', AdminPlanController::class)->except(['index', 'show'])->middleware('admin.can:plans.manage');

            Route::get('vendors', [AdminVendorController::class, 'index'])->middleware('admin.can:vendors.view')->name('vendors.index');
            Route::patch('vendors/{vendor}', [AdminVendorController::class, 'update'])->middleware('admin.can:vendors.update')->name('vendors.update');

            Route::middleware('admin.can:orders.view')->group(function () {
                Route::get('orders', [AdminOrderController::class, 'index'])->name('orders.index');
                Route::get('orders/{order}', [AdminOrderController::class, 'show'])->name('orders.show');
            });

            Route::get('logs', AdminActivityLogController::class)->middleware('admin.can:logs.view')->name('logs');

            Route::middleware('admin.can:team.manage')->group(function () {
                Route::apiResource('team', AdminTeamController::class)->except('show')->parameters(['team' => 'admin']);
                Route::apiResource('roles', AdminRoleController::class)->except('show')->parameters(['roles' => 'role']);
            });
        });
    });

    /*
    | Vendor dashboard (vendor bearer token required)
    */
    Route::middleware(['auth:sanctum', 'vendor'])->prefix('vendor')->name('vendor.')->group(function () {
        Route::get('auth/me', [VendorAuthController::class, 'me'])->name('auth.me');
        Route::post('auth/logout', [VendorAuthController::class, 'logout'])->name('auth.logout');
        Route::put('auth/profile', [VendorAccountController::class, 'updateProfile'])->name('auth.profile');
        Route::put('auth/password', [VendorAccountController::class, 'updatePassword'])->middleware('throttle:10,1')->name('auth.password');

        Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
        Route::post('notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');
        Route::post('notifications/{notification}/read', [NotificationController::class, 'read'])->name('notifications.read');

        Route::middleware('permission:owner')->group(function () {
            Route::apiResource('staff', StaffController::class)->except('show')->parameters(['staff' => 'staffMember']);
            Route::apiResource('roles', StoreRoleController::class)->except('show')->parameters(['roles' => 'role']);
            Route::get('activity', VendorActivityLogController::class)->name('activity');
        });

        Route::middleware('permission:billing')->group(function () {
            Route::get('subscription', [SubscriptionController::class, 'show'])->name('subscription.show');
            Route::post('subscription/requests', [SubscriptionController::class, 'requestPlan'])->middleware('throttle:10,1')->name('subscription.requests.store');
        });

        Route::middleware('permission:settings')->group(function () {
            Route::get('tracking-pixels', [TrackingPixelController::class, 'show'])->name('tracking-pixels.show');
            Route::put('tracking-pixels', [TrackingPixelController::class, 'update'])->middleware('throttle:20,1')->name('tracking-pixels.update');
            Route::get('store', [StoreSettingsController::class, 'show'])->name('store.show');
            Route::patch('store', [StoreSettingsController::class, 'update'])->name('store.update');
            Route::post('store/logo', [StoreSettingsController::class, 'uploadLogo'])->middleware('throttle:20,1')->name('store.logo')->defaults('_permission', 'settings.update');
            Route::delete('store/logo', [StoreSettingsController::class, 'removeLogo'])->name('store.logo.remove')->defaults('_permission', 'settings.update');

            Route::get('store/domain', [StoreDomainController::class, 'show'])->name('store.domain.show');
            Route::middleware('plan.feature:custom_domain')->group(function () {
                Route::put('store/domain', [StoreDomainController::class, 'update'])->name('store.domain.update');
                Route::post('store/domain/verify', [StoreDomainController::class, 'verify'])->middleware('throttle:10,1')->name('store.domain.verify')->defaults('_permission', 'settings.update');
            });
            Route::delete('store/domain', [StoreDomainController::class, 'destroy'])->name('store.domain.destroy')->defaults('_permission', 'settings.update');

            Route::get('shipping/bosta', [ShippingCarrierController::class, 'show'])->name('shipping.bosta.show');
            Route::put('shipping/bosta', [ShippingCarrierController::class, 'update'])->middleware('throttle:10,1')->name('shipping.bosta.update');
            Route::delete('shipping/bosta', [ShippingCarrierController::class, 'destroy'])->name('shipping.bosta.destroy')->defaults('_permission', 'settings.update');

            Route::get('shipping', [ShippingSettingsController::class, 'show'])->name('shipping.show');
            Route::put('shipping', [ShippingSettingsController::class, 'update'])->name('shipping.update');
        });

        Route::middleware('permission:payments')->group(function () {
            Route::get('payments', [PaymentSettingsController::class, 'show'])->name('payments.show');
            Route::put('payments', [PaymentSettingsController::class, 'update'])->middleware('throttle:20,1')->name('payments.update')->defaults('_permission', 'payments.settings');
            Route::delete('payments/paymob', [PaymentSettingsController::class, 'disconnect'])->name('payments.disconnect')->defaults('_permission', 'payments.settings');

            Route::get('payment-transactions/summary', [PaymentTransactionController::class, 'summary'])->name('payment-transactions.summary');
            Route::get('payment-transactions/export', [PaymentTransactionController::class, 'export'])->middleware('throttle:10,1')->name('payment-transactions.export')->defaults('_permission', 'payments.view');
            Route::get('payment-transactions', [PaymentTransactionController::class, 'index'])->name('payment-transactions.index');
            Route::post('orders/{order}/refunds', [VendorOrderController::class, 'refund'])->middleware('throttle:20,1')->name('orders.refunds.store')->defaults('_permission', 'payments.refund');
        });

        Route::middleware('permission:reports')->group(function () {
            Route::get('reports', ReportController::class)->name('reports');
        });

        Route::middleware('permission:marketing')->group(function () {
            Route::get('loyalty', [LoyaltySettingsController::class, 'show'])->name('loyalty.show');
            Route::put('loyalty', [LoyaltySettingsController::class, 'update'])->name('loyalty.update');
            Route::post('customers/{customer}/points', [CustomerPointsController::class, 'store'])->middleware('throttle:30,1')->name('customers.points.store')->defaults('_permission', 'marketing.update');
            Route::patch('coupons/{coupon}/status', [CouponController::class, 'updateStatus'])->name('coupons.status');
            Route::apiResource('coupons', CouponController::class);

            Route::prefix('affiliates')->name('affiliates.')->group(function () {
                Route::get('summary', AffiliateSummaryController::class)->name('summary');
                Route::post('import', AffiliateImportController::class)->middleware(['throttle:10,1', 'plan.feature:affiliates'])->name('import')->defaults('_permission', 'marketing.create');

                Route::get('registration-link', [AffiliateRegistrationLinkController::class, 'show'])->name('registration-link.show');
                Route::patch('registration-link', [AffiliateRegistrationLinkController::class, 'update'])->name('registration-link.update');
                Route::post('registration-link/regenerate', [AffiliateRegistrationLinkController::class, 'regenerate'])->name('registration-link.regenerate')->defaults('_permission', 'marketing.update');

                Route::patch('{affiliate}/status', AffiliateStatusController::class)->name('status.update');
                Route::put('{affiliate}/commission', AffiliateCommissionController::class)->name('commission.update');
                Route::post('{affiliate}/referral-codes', [AffiliateReferralCodeController::class, 'store'])->name('referral-codes.store')->defaults('_permission', 'marketing.update');
                Route::get('{affiliate}/payouts', [AffiliatePayoutController::class, 'index'])->name('payouts.index');
                Route::post('{affiliate}/payouts', [AffiliatePayoutController::class, 'store'])->name('payouts.store')->defaults('_permission', 'marketing.payouts');
                Route::post('{affiliate}/payouts/{payout}/reject', [AffiliatePayoutController::class, 'reject'])->scopeBindings()->name('payouts.reject')->defaults('_permission', 'marketing.payouts');
                Route::post('{affiliate}/impersonate', [AffiliateImpersonationController::class, 'store'])->middleware('throttle:20,1')->name('impersonate')->defaults('_permission', 'marketing.impersonate');
            });

            Route::post('affiliates', [AffiliateController::class, 'store'])->middleware('plan.feature:affiliates')->name('affiliates.store');
            Route::apiResource('affiliates', AffiliateController::class)->except('store');

            Route::get('payouts', [VendorPayoutController::class, 'index'])->name('payouts.index');
        });

        Route::middleware('permission:reviews')->group(function () {
            Route::get('reviews', [ProductReviewController::class, 'index'])->name('reviews.index');
            Route::patch('reviews/{review}', [ProductReviewController::class, 'update'])->name('reviews.update');
            Route::delete('reviews/{review}', [ProductReviewController::class, 'destroy'])->name('reviews.destroy');
        });

        Route::middleware('permission:customers')->group(function () {
            Route::get('customers/summary', CustomerSummaryController::class)->name('customers.summary');
            Route::get('customers', [CustomerController::class, 'index'])->name('customers.index');
            Route::get('customers/{customer}', [CustomerController::class, 'show'])->name('customers.show');
            Route::get('customers/{customer}/points', [CustomerPointsController::class, 'index'])->name('customers.points.index');
        });

        Route::middleware('permission:orders')->group(function () {
            Route::get('orders/summary', OrderSummaryController::class)->name('orders.summary');
            Route::get('orders/airway-bills', [OrderShipmentController::class, 'airwayBills'])->middleware('throttle:20,1')->name('orders.airway-bills')->defaults('_permission', 'orders.view');
            Route::post('orders/{order}/shipment', [OrderShipmentController::class, 'store'])->middleware('throttle:30,1')->name('orders.shipment.store')->defaults('_permission', 'orders.ship');
            Route::put('orders/{order}/tracking', [OrderShipmentController::class, 'updateTracking'])->name('orders.tracking.update')->defaults('_permission', 'orders.update');
            Route::get('orders', [VendorOrderController::class, 'index'])->name('orders.index');
            Route::post('orders', [VendorOrderController::class, 'store'])->middleware('throttle:60,1')->name('orders.store');
            Route::get('orders/{order}', [VendorOrderController::class, 'show'])->name('orders.show');
            Route::patch('orders/{order}/status', [VendorOrderController::class, 'updateStatus'])->name('orders.status');
        });

        Route::middleware('permission:inventory')->group(function () {
            Route::prefix('inventory')->name('inventory.')->group(function () {
                Route::get('/', [InventoryController::class, 'index'])->name('index');
                Route::get('summary', InventorySummaryController::class)->name('summary');
                Route::put('settings', [InventorySettingsController::class, 'update'])->name('settings.update')->defaults('_permission', 'inventory.update');
                Route::get('movements', [StockMovementController::class, 'index'])->name('movements.index');
                Route::get('export', [InventoryImportController::class, 'export'])->name('export');
                Route::post('import', [InventoryImportController::class, 'import'])->middleware('throttle:10,1')->name('import')->defaults('_permission', 'inventory.update');
                Route::patch('{variant}', [InventoryController::class, 'update'])->name('update');
                Route::post('{variant}/movements', [StockMovementController::class, 'store'])->middleware('throttle:60,1')->name('movements.store')->defaults('_permission', 'inventory.update');
            });

            Route::put('warehouses/order', [WarehouseController::class, 'reorder'])->name('warehouses.reorder')->defaults('_permission', 'inventory.warehouses');
            Route::get('warehouses', [WarehouseController::class, 'index'])->name('warehouses.index');
            Route::post('warehouses', [WarehouseController::class, 'store'])->defaults('_permission', 'inventory.warehouses')->name('warehouses.store');
            Route::match(['put', 'patch'], 'warehouses/{warehouse}', [WarehouseController::class, 'update'])->defaults('_permission', 'inventory.warehouses')->name('warehouses.update');
            Route::delete('warehouses/{warehouse}', [WarehouseController::class, 'destroy'])->defaults('_permission', 'inventory.warehouses')->name('warehouses.destroy');
            Route::get('stock-transfers', [StockTransferController::class, 'index'])->name('stock-transfers.index');
            Route::get('stock-transfers/{transfer}', [StockTransferController::class, 'show'])->name('stock-transfers.show');
            Route::post('stock-transfers', [StockTransferController::class, 'store'])->defaults('_permission', 'inventory.transfer')->name('stock-transfers.store');
        });

        Route::middleware('permission:purchasing')->group(function () {
            Route::apiResource('suppliers', SupplierController::class)->except('show');

            Route::prefix('purchase-orders/{purchaseOrder}')->name('purchase-orders.')->group(function () {
                Route::post('order', [PurchaseOrderController::class, 'markOrdered'])->name('order')->defaults('_permission', 'purchasing.update');
                Route::post('receive', [PurchaseOrderController::class, 'receive'])->name('receive')->defaults('_permission', 'purchasing.update');
                Route::post('cancel', [PurchaseOrderController::class, 'cancel'])->name('cancel')->defaults('_permission', 'purchasing.update');
                Route::post('close', [PurchaseOrderController::class, 'close'])->name('close')->defaults('_permission', 'purchasing.update');
            });
            Route::apiResource('purchase-orders', PurchaseOrderController::class)->parameters(['purchase-orders' => 'purchaseOrder']);
        });

        Route::middleware('permission:products')->group(function () {
            Route::apiResource('product-categories', ProductCategoryController::class)
                ->except('show')
                ->parameters(['product-categories' => 'category']);

            Route::get('products/summary', ProductSummaryController::class)->name('products.summary');
            Route::post('products/{product}/images', [ProductImageController::class, 'store'])->middleware('throttle:30,1')->name('products.images.store')->defaults('_permission', 'products.update');
            Route::put('products/{product}/images/order', [ProductImageController::class, 'reorder'])->name('products.images.reorder');
            Route::delete('products/{product}/images/{image}', [ProductImageController::class, 'destroy'])->scopeBindings()->name('products.images.destroy')->defaults('_permission', 'products.update');
            Route::apiResource('products', ProductController::class);
        });
    });
});
