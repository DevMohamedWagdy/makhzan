<?php

namespace App\Http\Middleware;

use App\Enums\AffiliateStatus;
use App\Models\Affiliate;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restricts affiliate portal routes to affiliate tokens.
 *
 * - The affiliate's own token works only while the account is active.
 * - A vendor's impersonation token may read (even a frozen account, to investigate) but,
 *   with the `self` mode, may never act as the affiliate (e.g. change the password).
 */
class EnsureAffiliateToken
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     * @param  string|null  $mode  "self" to refuse impersonation tokens.
     */
    public function handle(Request $request, Closure $next, ?string $mode = null): Response
    {
        $affiliate = $request->user();

        abort_unless($affiliate instanceof Affiliate, Response::HTTP_FORBIDDEN, __('auth.affiliates_only'));

        $isImpersonation = $affiliate->tokenCan(Affiliate::IMPERSONATION_ABILITY);
        $isOwnSession = $affiliate->tokenCan(Affiliate::TOKEN_ABILITY);

        abort_unless($isImpersonation || $isOwnSession, Response::HTTP_FORBIDDEN, __('auth.affiliates_only'));

        if ($isImpersonation) {
            abort_if($mode === 'self', Response::HTTP_FORBIDDEN, __('auth.not_while_impersonating'));
        } else {
            abort_unless($affiliate->status === AffiliateStatus::Active, Response::HTTP_FORBIDDEN, __('auth.affiliate_inactive'));
            $affiliate->rememberLocale();
        }

        return $next($request);
    }
}
