<?php

use App\Http\Controllers\Api\V1\Affiliate\Auth\AffiliateAuthController;
use App\Http\Controllers\Api\V1\Affiliate\Auth\AffiliatePasswordController;
use App\Http\Controllers\Api\V1\Affiliate\Auth\AffiliatePasswordResetController;
use App\Http\Controllers\Api\V1\Affiliate\NotificationController as AffiliateNotificationController;
use App\Http\Controllers\Api\V1\Affiliate\OrderController as AffiliateOrderController;
use App\Http\Controllers\Api\V1\Affiliate\PayoutController;
use App\Http\Controllers\Api\V1\Public\AffiliateRegistrationController;
use App\Http\Controllers\Api\V1\Public\StoreController;
use App\Http\Controllers\Api\V1\Storefront\CartController;
use App\Http\Controllers\Api\V1\Storefront\Customer\AddressController as CustomerAddressController;
use App\Http\Controllers\Api\V1\Storefront\Customer\AuthController as CustomerAuthController;
use App\Http\Controllers\Api\V1\Storefront\Customer\OrderController as CustomerOrderController;
use App\Http\Controllers\Api\V1\Storefront\ProductController as StorefrontProductController;
use App\Http\Controllers\Api\V1\Storefront\ReferralClickController;
use App\Http\Controllers\Api\V1\Storefront\ShippingController;
use App\Http\Controllers\Api\V1\Storefront\StorefrontController;
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
use App\Http\Controllers\Api\V1\Vendor\Auth\VendorAuthController;
use App\Http\Controllers\Api\V1\Vendor\CustomerController;
use App\Http\Controllers\Api\V1\Vendor\CustomerSummaryController;
use App\Http\Controllers\Api\V1\Vendor\NotificationController;
use App\Http\Controllers\Api\V1\Vendor\OrderController as VendorOrderController;
use App\Http\Controllers\Api\V1\Vendor\OrderSummaryController;
use App\Http\Controllers\Api\V1\Vendor\PayoutController as VendorPayoutController;
use App\Http\Controllers\Api\V1\Vendor\ProductCategoryController;
use App\Http\Controllers\Api\V1\Vendor\ProductController;
use App\Http\Controllers\Api\V1\Vendor\ProductImageController;
use App\Http\Controllers\Api\V1\Vendor\ProductSummaryController;
use App\Http\Controllers\Api\V1\Vendor\ReportController;
use App\Http\Controllers\Api\V1\Vendor\ShippingSettingsController;
use App\Http\Controllers\Api\V1\Vendor\StoreSlugAvailabilityController;
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
        ->middleware('throttle:120,1')
        ->missing(fn () => abort(404, __('forms.store_not_found')))
        ->group(function () {
            Route::get('/', [StorefrontController::class, 'show'])->name('show');
            Route::get('products', [StorefrontProductController::class, 'index'])->name('products.index');
            Route::get('products/{productSlug}', [StorefrontProductController::class, 'show'])->name('products.show');
            Route::post('referral-clicks', ReferralClickController::class)->middleware('throttle:30,1')->name('referral-clicks.store');
            Route::post('cart/quote', [CartController::class, 'quote'])->name('cart.quote');
            Route::get('shipping', ShippingController::class)->name('shipping');

            // Shopper accounts (one per store).
            Route::post('customer/register', [CustomerAuthController::class, 'register'])->middleware('throttle:10,1')->name('customer.register');
            Route::post('customer/login', [CustomerAuthController::class, 'login'])->name('customer.login');

            Route::middleware(['auth:sanctum', 'customer'])->prefix('customer')->name('customer.')->group(function () {
                Route::get('me', [CustomerAuthController::class, 'me'])->name('me');
                Route::post('logout', [CustomerAuthController::class, 'logout'])->name('logout');
                Route::apiResource('addresses', CustomerAddressController::class)->except('show');
                Route::get('orders', [CustomerOrderController::class, 'index'])->name('orders.index');
                Route::post('orders', [CustomerOrderController::class, 'store'])->middleware('throttle:10,1')->name('orders.store');
                Route::get('orders/{number}', [CustomerOrderController::class, 'show'])->whereNumber('number')->name('orders.show');
                Route::post('orders/{number}/cancel', [CustomerOrderController::class, 'cancel'])->whereNumber('number')->name('orders.cancel');
            });
        });

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
    | Vendor dashboard (vendor bearer token required)
    */
    Route::middleware(['auth:sanctum', 'vendor'])->prefix('vendor')->name('vendor.')->group(function () {
        Route::get('auth/me', [VendorAuthController::class, 'me'])->name('auth.me');
        Route::post('auth/logout', [VendorAuthController::class, 'logout'])->name('auth.logout');

        Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
        Route::post('notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');
        Route::post('notifications/{notification}/read', [NotificationController::class, 'read'])->name('notifications.read');

        Route::get('payouts', [VendorPayoutController::class, 'index'])->name('payouts.index');

        Route::get('reports', ReportController::class)->name('reports');

        Route::get('customers/summary', CustomerSummaryController::class)->name('customers.summary');
        Route::get('customers', [CustomerController::class, 'index'])->name('customers.index');
        Route::get('customers/{customer}', [CustomerController::class, 'show'])->name('customers.show');

        Route::prefix('affiliates')->name('affiliates.')->group(function () {
            Route::get('summary', AffiliateSummaryController::class)->name('summary');
            Route::post('import', AffiliateImportController::class)->middleware('throttle:10,1')->name('import');

            Route::get('registration-link', [AffiliateRegistrationLinkController::class, 'show'])->name('registration-link.show');
            Route::patch('registration-link', [AffiliateRegistrationLinkController::class, 'update'])->name('registration-link.update');
            Route::post('registration-link/regenerate', [AffiliateRegistrationLinkController::class, 'regenerate'])->name('registration-link.regenerate');

            Route::patch('{affiliate}/status', AffiliateStatusController::class)->name('status.update');
            Route::put('{affiliate}/commission', AffiliateCommissionController::class)->name('commission.update');
            Route::post('{affiliate}/referral-codes', [AffiliateReferralCodeController::class, 'store'])->name('referral-codes.store');
            Route::get('{affiliate}/payouts', [AffiliatePayoutController::class, 'index'])->name('payouts.index');
            Route::post('{affiliate}/payouts', [AffiliatePayoutController::class, 'store'])->name('payouts.store');
            Route::post('{affiliate}/payouts/{payout}/reject', [AffiliatePayoutController::class, 'reject'])->scopeBindings()->name('payouts.reject');
            Route::post('{affiliate}/impersonate', [AffiliateImpersonationController::class, 'store'])->middleware('throttle:20,1')->name('impersonate');
        });

        Route::apiResource('affiliates', AffiliateController::class);

        Route::apiResource('product-categories', ProductCategoryController::class)
            ->except('show')
            ->parameters(['product-categories' => 'category']);

        Route::get('orders/summary', OrderSummaryController::class)->name('orders.summary');
        Route::get('orders', [VendorOrderController::class, 'index'])->name('orders.index');
        Route::get('orders/{order}', [VendorOrderController::class, 'show'])->name('orders.show');
        Route::patch('orders/{order}/status', [VendorOrderController::class, 'updateStatus'])->name('orders.status');

        Route::get('shipping', [ShippingSettingsController::class, 'show'])->name('shipping.show');
        Route::put('shipping', [ShippingSettingsController::class, 'update'])->name('shipping.update');

        Route::get('products/summary', ProductSummaryController::class)->name('products.summary');
        Route::post('products/{product}/images', [ProductImageController::class, 'store'])->middleware('throttle:30,1')->name('products.images.store');
        Route::put('products/{product}/images/order', [ProductImageController::class, 'reorder'])->name('products.images.reorder');
        Route::delete('products/{product}/images/{image}', [ProductImageController::class, 'destroy'])->scopeBindings()->name('products.images.destroy');
        Route::apiResource('products', ProductController::class);
    });
});
