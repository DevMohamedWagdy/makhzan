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

    'reserved_slugs' => ['admin', 'api', 'app', 'makhzan', 'store', 'login', 'register', 'dashboard', 'help', 'affiliate', 'slug-availability'],

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
