<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="rtl">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>مخزن | Makhzan</title>
        <link rel="icon" type="image/svg+xml" href="/makhzan-icon.svg">

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
