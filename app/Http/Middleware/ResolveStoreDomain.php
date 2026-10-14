<?php

namespace App\Http\Middleware;

use App\Models\Store;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\Response;

/**
 * Serves a store's storefront on its own verified domain: the SPA is told which store to
 * show at "/". Platform hosts pass through untouched; unknown domains get a 404.
 */
class ResolveStoreDomain
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $host = strtolower($request->getHost());

        if (in_array($host, self::platformHosts(), true)) {
            View::share('storeDomainSlug', null);

            return $next($request);
        }

        $store = Store::query()
            ->where('custom_domain', $host)
            ->whereNotNull('custom_domain_verified_at')
            ->whereNull('suspended_at')
            ->first();

        abort_unless($store, Response::HTTP_NOT_FOUND);

        View::share('storeDomainSlug', $store->slug);

        return $next($request);
    }

    /**
     * Hosts of the platform itself (APP_URL, the storefront URL and any extra ones).
     *
     * @return list<string>
     */
    public static function platformHosts(): array
    {
        return array_values(array_unique(array_filter(array_map('strtolower', [
            parse_url((string) config('app.url'), PHP_URL_HOST),
            parse_url((string) config('makhzan.storefront_url'), PHP_URL_HOST),
            'localhost',
            '127.0.0.1',
            ...config('makhzan.custom_domains.platform_hosts', []),
        ]))));
    }
}
