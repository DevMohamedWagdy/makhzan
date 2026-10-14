<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="rtl">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>مخزن | Makhzan</title>
        <link rel="icon" type="image/svg+xml" href="/makhzan-icon.svg">

        @unless ($storeDomainSlug ?? null)
            <meta name="description" content="مخزن منصة متكاملة لإدارة تجارتك: المخزون، الطلبات، الشحن، المسوقين والتقارير، مع متجر إلكتروني جاهز متصل بمخزونك.">
            <meta name="theme-color" content="#2c2c54">
            <link rel="canonical" href="{{ url()->current() }}">
            <meta property="og:type" content="website">
            <meta property="og:site_name" content="مخزن | Makhzan">
            <meta property="og:title" content="مخزن | كل ما يحتاجه متجرك في مخزن واحد">
            <meta property="og:description" content="المخزون، الطلبات، المسوقين والتقارير — نظام متكامل مصمم للتاجر العربي.">
            <meta property="og:url" content="{{ url()->current() }}">
            <meta property="og:image" content="{{ asset('makhzan-icon.svg') }}">
            <meta property="og:locale" content="ar_EG">
            <meta name="twitter:card" content="summary">
        @endunless

        @if ($storeDomainSlug ?? null)
            <script>window.__MAKHZAN_STORE_DOMAIN__ = @js($storeDomainSlug);</script>
        @endif
        <script>
            (function () {
                // Applied before first paint (mirrors resources/js/i18n): language and direction, then theme.
                try {
                    var locale = localStorage.getItem('makhzan.locale') === 'en' ? 'en' : 'ar';
                    document.documentElement.lang = locale;
                    document.documentElement.dir = locale === 'en' ? 'ltr' : 'rtl';
                } catch (e) {}
                try {
                    var stored = localStorage.getItem('makhzan.theme');
                    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    if (stored === 'dark' || (!stored && prefersDark)) {
                        document.documentElement.classList.add('dark');
                    }
                } catch (e) {}
            })();
        </script>

        @fonts
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.jsx'])
    </head>
    <body class="antialiased">
        <div id="app"></div>
    </body>
</html>
