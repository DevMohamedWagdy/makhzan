<?php

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

    'reserved_slugs' => ['admin', 'api', 'app', 'makhzan', 'store', 'login', 'register', 'dashboard', 'help', 'affiliate', 'slug-availability', 'terms', 'privacy'],

    /*
    |--------------------------------------------------------------------------
    | Governorates and Cities
    |--------------------------------------------------------------------------
    |
    | Governorate id => city ids. Mirrors resources/js/lib/locations.js, which
    | holds the Arabic display names; keep both lists in sync.
    |
    */

    'governorates' => [
        'cairo' => ['nasr_city', 'heliopolis', 'maadi', 'new_cairo', 'downtown', 'shubra'],
        'giza' => ['dokki', 'mohandessin', 'october', 'sheikh_zayed', 'haram'],
        'alexandria' => ['smouha', 'sidi_gaber', 'miami', 'borg_alarab', 'agami'],
        'qalyubia' => ['banha', 'shubra_elkheima', 'obour', 'qalyub'],
        'dakahlia' => ['mansoura', 'talkha', 'mit_ghamr'],
        'sharqia' => ['zagazig', 'tenth_ramadan', 'belbeis'],
        'gharbia' => ['tanta', 'mahalla', 'kafr_elzayat'],
        'monufia' => ['shebin', 'sadat_city', 'menouf'],
        'beheira' => ['damanhour', 'kafr_eldawar', 'rashid'],
        'ismailia' => ['ismailia_city', 'fayed', 'qantara'],
        'port_said' => ['port_said_city', 'port_fouad'],
        'suez' => ['suez_city', 'ain_sokhna'],
        'faiyum' => ['faiyum_city', 'sinnuris'],
        'minya' => ['minya_city', 'mallawi', 'samalut'],
        'asyut' => ['asyut_city', 'dayrut'],
        'sohag' => ['sohag_city', 'akhmim', 'girga'],
        'qena' => ['qena_city', 'nag_hammadi'],
        'luxor' => ['luxor_city', 'esna'],
        'aswan' => ['aswan_city', 'kom_ombo'],
        'red_sea' => ['hurghada', 'safaga', 'marsa_alam'],
        'south_sinai' => ['sharm', 'dahab'],
        'damietta' => ['damietta_city', 'new_damietta', 'ras_elbar'],
        'kafr_elsheikh' => ['kafr_elsheikh_city', 'desouk'],
        'beni_suef' => ['beni_suef_city', 'el_wasta'],
    ],

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
    | Shipping Companies
    |--------------------------------------------------------------------------
    |
    | Bosta city names for our governorate ids (as Bosta's own plugin sends them).
    |
    */

    'shipping' => [
        'bosta_cities' => [
            'cairo' => 'Cairo', 'giza' => 'Giza', 'alexandria' => 'Alexandria', 'qalyubia' => 'Qalyubia',
            'dakahlia' => 'Dakahlia', 'sharqia' => 'Al Sharqia', 'gharbia' => 'Gharbia', 'monufia' => 'Monufia',
            'beheira' => 'Beheira', 'ismailia' => 'Ismailia', 'port_said' => 'Port Said', 'suez' => 'Suez',
            'faiyum' => 'Faiyum', 'minya' => 'Minya', 'asyut' => 'Asyut', 'sohag' => 'Sohag', 'qena' => 'Qena',
            'luxor' => 'Luxor', 'aswan' => 'Aswan', 'red_sea' => 'Red Sea', 'south_sinai' => 'South Sinai',
            'damietta' => 'Damietta', 'kafr_elsheikh' => 'Kafr el-Sheikh', 'beni_suef' => 'Beni Suef',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Platform Billing
    |--------------------------------------------------------------------------
    |
    | Where vendors transfer subscription fees; a platform admin confirms the
    | transfer and activates the plan. Methods without an account are hidden.
    |
    */

    'billing' => [
        'accounts' => [
            'vodafone_cash' => env('MAKHZAN_BILLING_VODAFONE_CASH'),
            'instapay' => env('MAKHZAN_BILLING_INSTAPAY'),
            'bank_transfer' => env('MAKHZAN_BILLING_BANK_ACCOUNT'),
        ],
        'support_whatsapp' => env('MAKHZAN_SUPPORT_WHATSAPP'),
        // Owners are reminded this many days before their plan (or trial) ends.
        'expiry_reminder_days' => 3,
        // Every new store can use the whole platform for this long before subscribing.
        'trial_days' => (int) env('MAKHZAN_TRIAL_DAYS', 14),
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

];
