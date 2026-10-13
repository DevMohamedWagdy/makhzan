<?php

namespace App\Http\Controllers\Api\V1\Storefront;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\JsonResponse;

class PolicyController extends Controller
{
    /**
     * One of the store's policy pages (returns, shipping, privacy, terms); 404 when unset.
     */
    public function __invoke(Store $store, string $policy): JsonResponse
    {
        $column = Store::POLICIES[$policy] ?? null;

        abort_unless($column && filled($store->{$column}), 404, __('settings.policy_not_found'));

        return response()->json([
            'key' => $policy,
            'title' => __("settings.policies.{$policy}"),
            'body' => $store->{$column},
        ]);
    }
}
