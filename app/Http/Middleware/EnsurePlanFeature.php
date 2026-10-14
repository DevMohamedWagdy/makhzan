<?php

namespace App\Http\Middleware;

use App\Enums\PlanFeature;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Limits a dashboard route to stores whose current plan includes a feature
 * (`plan.feature:affiliates`).
 */
class EnsurePlanFeature
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $feature): Response
    {
        abort_unless($request->user()->store->hasFeature(PlanFeature::from($feature)), Response::HTTP_PAYMENT_REQUIRED, __('billing.feature_unavailable'));

        return $next($request);
    }
}
