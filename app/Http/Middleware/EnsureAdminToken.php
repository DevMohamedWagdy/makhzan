<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restricts platform admin routes to admin panel tokens.
 */
class EnsureAdminToken
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        abort_unless($user instanceof Admin && $user->tokenCan(Admin::TOKEN_ABILITY), Response::HTTP_FORBIDDEN, __('auth.admins_only'));
        abort_if($user->is_active === false, Response::HTTP_UNAUTHORIZED, __('auth.staff_inactive'));

        return $next($request);
    }
}
