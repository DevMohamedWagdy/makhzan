<?php

use App\Notifications\AdminMessageNotification;
use App\Notifications\AffiliateResetPasswordNotification;
use App\Notifications\CustomerResetPasswordNotification;
use App\Notifications\EmailVerificationCodeNotification;
use App\Notifications\VendorResetPasswordNotification;

return [

    /*
    |--------------------------------------------------------------------------
    | Public Storefront URL
    |--------------------------------------------------------------------------
    |
    | Base URL for links shared outside the dashboard: affiliate join/login
    | links and referral links, e.g. {url}/{store-slug}/affiliates/join?t=….
    | Defaults to APP_URL so links work wherever the app runs; set it in
    | production if the storefront lives on its own domain.
    |
    */

    'storefront_url' => rtrim((string) env('MAKHZAN_STOREFRONT_URL', env('APP_URL', 'http://localhost')), '/'),

    /*
    |--------------------------------------------------------------------------
    | Supported Languages
    |--------------------------------------------------------------------------
    |
    | The first one is the default (see app.locale). Mirrors resources/js/i18n.
    |
    */

    'locales' => ['ar', 'en'],

    /*
    |--------------------------------------------------------------------------
    | Reserved Store Slugs
    |--------------------------------------------------------------------------
    */

    'reserved_slugs' => ['admin', 'api', 'app', 'makhzan', 'sellygrow', 'store', 'login', 'register', 'dashboard', 'help', 'affiliate', 'slug-availability', 'terms', 'privacy', 'forgot-password', 'reset-password', 'affiliate-portal', 'impersonate'],

    /*
    |--------------------------------------------------------------------------
    | Affiliates
    |--------------------------------------------------------------------------
    */

    'affiliates' => [
        'impersonation_minutes' => 30,
        'password_reset_minutes' => 60,
        // Minimum gap between two reset emails for the same affiliate.
        'password_reset_throttle_seconds' => 60,
        'import_max_rows' => 1000,
    ],

    /*
    |--------------------------------------------------------------------------
    | Support Tickets
    |--------------------------------------------------------------------------
    |
    | Files merchants and the platform team attach to ticket messages: images,
    | PDFs and common office documents, kept on the private disk.
    |
    */

    'support' => [
        'max_attachments' => 5,
        'max_attachment_kb' => 5120,
        'attachment_types' => ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Custom Domains
    |--------------------------------------------------------------------------
    |
    | Vendors point their domain at the platform with a CNAME to cname_target
    | (or an A record to ip). The web server must accept those hosts and issue
    | certificates for them (e.g. Caddy on-demand TLS or Cloudflare for SaaS).
    |
    */

    'custom_domains' => [
        'cname_target' => env('MAKHZAN_CUSTOM_DOMAIN_TARGET', 'stores.'.(parse_url((string) env('MAKHZAN_STOREFRONT_URL', env('APP_URL', 'http://localhost')), PHP_URL_HOST) ?: 'localhost')),
        'ip' => env('MAKHZAN_CUSTOM_DOMAIN_IP'),
        // Extra hosts that belong to the platform (never treated as a store's domain).
        'platform_hosts' => array_filter(explode(',', (string) env('MAKHZAN_PLATFORM_HOSTS', ''))),
    ],

    /*
    |--------------------------------------------------------------------------
    | Storefront Customers
    |--------------------------------------------------------------------------
    */

    'customers' => [
        'password_reset_minutes' => 60,
        // Minimum gap between two reset emails for the same customer.
        'password_reset_throttle_seconds' => 60,
    ],

    /*
    |--------------------------------------------------------------------------
    | Products
    |--------------------------------------------------------------------------
    */

    'products' => [
        // Fallback "only N left" threshold; stores set their own (stores.low_stock_threshold, default 5).
        'low_stock_threshold' => 5,
        'max_images' => 10,
        'max_variants' => 100,
    ],

    /*
    |--------------------------------------------------------------------------
    | Online Payments
    |--------------------------------------------------------------------------
    */

    'payments' => [
        // An online order not paid within this many minutes is cancelled and its stock released.
        'expiry_minutes' => 30,
    ],

    /*
    |--------------------------------------------------------------------------
    | Emailed Notifications
    |--------------------------------------------------------------------------
    |
    | The notifications allowed to go out by email. Any other notification
    | still reaches its dashboard bell but its email is skipped (see
    | App\Listeners\LimitMailNotifications). Add a class here to turn its
    | email on.
    |
    */

    'mail_notifications' => [
        EmailVerificationCodeNotification::class,
        VendorResetPasswordNotification::class,
        AffiliateResetPasswordNotification::class,
        CustomerResetPasswordNotification::class,
        AdminMessageNotification::class,
    ],

];
