<?php

namespace App\Http\Middleware;

use App\Models\Store;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Closes the storefront of a store the platform suspended.
 */
class EnsureStoreIsActive
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $store = $request->route('store');

        abort_if($store instanceof Store && $store->isSuspended(), Response::HTTP_FORBIDDEN, __('billing.store_suspended'));

        return $next($request);
    }
}
