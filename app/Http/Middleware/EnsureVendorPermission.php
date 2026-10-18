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
 * or to the store owner alone (`permission:owner`). Owners pass every check; nobody passes
 * while the platform has suspended the store.
 */
class EnsureVendorPermission
{
    public const OWNER = 'owner';

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

        if ($store?->isSuspended()) {
            abort(Response::HTTP_FORBIDDEN, __('settings.vendor_suspended', ['reason' => $store->suspension_reason ?: '—']));
        }

        $allowed = $permission === self::OWNER
            ? $vendor->isOwner()
            : collect(explode('|', StorePermissions::forRequest($permission, $request->method(), $request->route()?->defaults['_permission'] ?? null)))
                ->contains(fn (string $needed): bool => $vendor->hasPermission($needed));

        abort_unless($allowed, Response::HTTP_FORBIDDEN, __('auth.staff_forbidden'));

        return $next($request);
    }
}
