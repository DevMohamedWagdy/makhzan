<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="rtl">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>{{ $meta['title'] }}</title>
        <link rel="icon" type="image/svg+xml" href="/sellygrow-icon.svg">
        <link rel="icon" href="/favicon.ico" sizes="48x48">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        {{-- Filled per page by App\Support\PageMeta, so shared store and product links preview correctly. --}}
        <meta name="description" content="{{ $meta['description'] }}">
        <meta name="theme-color" content="#2c2c54">
        <link rel="canonical" href="{{ $meta['url'] }}">
        <meta property="og:type" content="{{ $meta['type'] }}">
        <meta property="og:site_name" content="{{ $meta['site_name'] }}">
        <meta property="og:title" content="{{ $meta['title'] }}">
        <meta property="og:description" content="{{ $meta['description'] }}">
        <meta property="og:url" content="{{ $meta['url'] }}">
        <meta property="og:image" content="{{ $meta['image'] }}">
        <meta property="og:locale" content="ar_EG">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="{{ $meta['title'] }}">
        <meta name="twitter:description" content="{{ $meta['description'] }}">
        <meta name="twitter:image" content="{{ $meta['image'] }}">

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
