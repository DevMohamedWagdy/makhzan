<?php

namespace App\Http\Middleware;

use App\Models\Vendor;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restricts vendor dashboard routes to vendor tokens. Affiliate tokens (including
 * "login as affiliate" impersonation tokens) are rejected even though they authenticate.
 */
class EnsureVendorToken
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        abort_unless(
            $user instanceof Vendor && $user->tokenCan(Vendor::TOKEN_ABILITY),
            Response::HTTP_FORBIDDEN,
            __('auth.vendors_only'),
        );

        // Deactivated staff lose their tokens, but a request already in flight is refused too.
        abort_if($user->is_active === false, Response::HTTP_UNAUTHORIZED, __('auth.staff_inactive'));

        $user->rememberLocale();

        return $next($request);
    }
}
