<?php

namespace App\Http\Middleware;

use App\Models\Vendor;
use App\Support\StorePermissions;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Limits a dashboard route to staff whose role allows it (`permission:orders`: the action
 * comes from the HTTP method or the route's `_permission` default, see StorePermissions),
 * or to the store owner alone (`permission:owner`, `permission:billing`). Owners pass every check; nobody passes while the
 * platform has suspended the store, or while its trial or subscription has ended.
 */
class EnsureVendorPermission
{
    public const OWNER = 'owner';

    /** Owner-only, and still reachable while the store is suspended (to renew or pay). */
    public const BILLING = 'billing';

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        /** @var Vendor $vendor */
        $vendor = $request->user();
        $store = $vendor->store;

        if ($store?->isSuspended() && $permission !== self::BILLING) {
            abort(Response::HTTP_FORBIDDEN, __('billing.vendor_suspended', ['reason' => $store->suspension_reason ?: '—']));
        }

        if ($store && $permission !== self::BILLING && ! $store->hasBillingAccess()) {
            abort(Response::HTTP_PAYMENT_REQUIRED, __('billing.subscription_required'));
        }

        $allowed = in_array($permission, [self::OWNER, self::BILLING], true)
            ? $vendor->isOwner()
            : collect(explode('|', StorePermissions::forRequest($permission, $request->method(), $request->route()?->defaults['_permission'] ?? null)))
                ->contains(fn (string $needed): bool => $vendor->hasPermission($needed));

        abort_unless($allowed, Response::HTTP_FORBIDDEN, __('auth.staff_forbidden'));

        return $next($request);
    }
}
