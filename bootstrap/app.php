<?php

use App\Http\Middleware\EnsureAdminPermission;
use App\Http\Middleware\EnsureAdminToken;
use App\Http\Middleware\EnsureAffiliateToken;
use App\Http\Middleware\EnsureCustomerToken;
use App\Http\Middleware\EnsureStoreIsActive;
use App\Http\Middleware\EnsureVendorPermission;
use App\Http\Middleware\EnsureVendorToken;
use App\Http\Middleware\ScopeToCurrentStore;
use App\Http\Middleware\SetLocale;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [SetLocale::class]);
        $middleware->api(append: [SetLocale::class]);

        $middleware->alias([
            'vendor' => EnsureVendorToken::class,
            'admin' => EnsureAdminToken::class,
            'admin.can' => EnsureAdminPermission::class,
            'permission' => EnsureVendorPermission::class,
            'store.active' => EnsureStoreIsActive::class,
            'affiliate' => EnsureAffiliateToken::class,
            'customer' => EnsureCustomerToken::class,
            'store.scope' => ScopeToCurrentStore::class,
        ]);

        // The store must be pinned before route model binding loads store-owned models.
        $middleware->prependToPriorityList(before: SubstituteBindings::class, prepend: ScopeToCurrentStore::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
