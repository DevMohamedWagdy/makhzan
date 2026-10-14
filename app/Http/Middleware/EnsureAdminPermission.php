<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Limits an admin panel route to team members whose role allows it (`admin.can:stores.view`).
 * Super admins pass every check.
 */
class EnsureAdminPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        /** @var Admin $admin */
        $admin = $request->user();

        abort_unless($admin->hasPermission($permission), Response::HTTP_FORBIDDEN, __('auth.staff_forbidden'));

        return $next($request);
    }
}
