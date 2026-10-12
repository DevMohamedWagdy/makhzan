<?php

namespace App\Http\Middleware;

use App\Models\Customer;
use App\Models\Store;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restricts storefront account routes to customer tokens of the store in the URL: an
 * account in one store can't be used on another store's routes.
 */
class EnsureCustomerToken
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $customer = $request->user();
        // Route model binding may not have run yet, so {store} can still be the slug.
        $store = $request->route('store');
        $storeId = $store instanceof Store ? $store->id : Store::query()->where('slug', $store)->value('id');

        abort_unless(
            $customer instanceof Customer && $customer->tokenCan(Customer::TOKEN_ABILITY) && $storeId !== null && $customer->store_id === $storeId,
            Response::HTTP_UNAUTHORIZED,
            __('orders.sign_in_required'),
        );

        $customer->rememberLocale();

        return $next($request);
    }
}
