<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Route::pattern('affiliate', '[0-9]+');
        Route::pattern('product', '[0-9]+');
        Route::pattern('category', '[0-9]+');

        $this->configureRateLimiting();
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('vendor-register', fn (Request $request) => Limit::perHour(10)->by($request->ip()));
        RateLimiter::for('affiliate-password', fn (Request $request) => [
            Limit::perMinute(3)->by('affiliate-identifier:'.mb_strtolower($request->input('store_slug').'|'.$request->input('identifier', $request->input('affiliate_id')))),
            Limit::perMinute(10)->by('affiliate-ip:'.$request->ip()),
        ]);
        RateLimiter::for('affiliate-registration', fn (Request $request) => Limit::perHour(10)->by($request->ip()));

        // Per identifier and per IP, so one address can't spray reset emails across accounts.
        RateLimiter::for('vendor-password', fn (Request $request) => [
            Limit::perMinute(3)->by('identifier:'.mb_strtolower((string) $request->input('identifier', $request->input('email')))),
            Limit::perMinute(10)->by('ip:'.$request->ip()),
        ]);
    }
}
