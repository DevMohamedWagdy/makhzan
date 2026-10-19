<?php

namespace App\Providers;

use App\Support\CurrentStore;
use App\Support\MailSettings;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Mail\MailManager;
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
        $this->app->scoped(CurrentStore::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Route::pattern('affiliate', '[0-9]+');
        Route::pattern('product', '[0-9]+');
        Route::pattern('category', '[0-9]+');
        Route::pattern('collection', '[0-9]+');
        Route::pattern('order', '[0-9]+');
        Route::pattern('address', '[0-9]+');
        Route::pattern('ticket', '[0-9]+');

        $this->configureRateLimiting();

        $this->app->afterResolving(MailManager::class, fn () => MailSettings::apply());
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('vendor-register', fn (Request $request) => Limit::perHour(10)->by($request->ip()));
        RateLimiter::for('affiliate-password', fn (Request $request) => [
            Limit::perMinute(3)->by('affiliate-identifier:'.mb_strtolower($request->input('store_slug').'|'.$request->input('email', $request->input('affiliate_id')))),
            Limit::perMinute(10)->by('affiliate-ip:'.$request->ip()),
        ]);
        RateLimiter::for('customer-password', fn (Request $request) => [
            Limit::perMinute(3)->by('customer-identifier:'.mb_strtolower($request->route()?->originalParameter('store').'|'.$request->input('identifier', $request->input('customer_id')))),
            Limit::perMinute(10)->by('customer-ip:'.$request->ip()),
        ]);
        RateLimiter::for('affiliate-registration', fn (Request $request) => Limit::perHour(10)->by($request->ip()));

        // Per identifier and per IP, so one address can't spray reset emails across accounts.
        RateLimiter::for('vendor-password', fn (Request $request) => [
            Limit::perMinute(3)->by('identifier:'.mb_strtolower((string) $request->input('email'))),
            Limit::perMinute(10)->by('ip:'.$request->ip()),
        ]);
    }
}
