<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Http\Middleware\ResolveStoreDomain;
use App\Models\Store;
use App\Support\DomainVerifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * The store's own domain: save it, point its DNS at the platform, then verify.
 */
class StoreDomainController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return $this->domain($request->user()->store);
    }

    /**
     * Saves a new domain (unverified until DNS is checked). Changing it starts over.
     */
    public function update(Request $request): JsonResponse
    {
        $store = $request->user()->store;
        $request->merge(['domain' => Str::of((string) $request->input('domain'))->lower()->trim()->replaceMatches('#^https?://#', '')->before('/')->rtrim('.')->toString()]);

        $domain = $request->validate([
            'domain' => [
                'required', 'string', 'max:253',
                'regex:/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/',
                Rule::notIn(ResolveStoreDomain::platformHosts()),
                Rule::unique('stores', 'custom_domain')->ignore($store->id),
            ],
        ], ['domain.regex' => __('settings.domain_invalid'), 'domain.unique' => __('settings.domain_taken'), 'domain.not_in' => __('settings.domain_invalid')])['domain'];

        if ($domain !== $store->custom_domain) {
            $store->forceFill(['custom_domain' => $domain, 'custom_domain_verified_at' => null])->save();
        }

        return $this->domain($store);
    }

    public function verify(Request $request, DomainVerifier $verifier): JsonResponse
    {
        $store = $request->user()->store;

        if (! $store->custom_domain) {
            throw ValidationException::withMessages(['domain' => __('settings.domain_missing')]);
        }

        if (! $verifier->pointsToUs($store->custom_domain)) {
            throw ValidationException::withMessages(['domain' => __('settings.domain_not_pointing', ['target' => config('makhzan.custom_domains.cname_target')])]);
        }

        $store->forceFill(['custom_domain_verified_at' => now()])->save();

        return $this->domain($store);
    }

    public function destroy(Request $request): JsonResponse
    {
        $store = $request->user()->store;
        $store->forceFill(['custom_domain' => null, 'custom_domain_verified_at' => null])->save();

        return $this->domain($store);
    }

    private function domain(Store $store): JsonResponse
    {
        return response()->json(['data' => [
            'domain' => $store->custom_domain,
            'verified_at' => $store->custom_domain_verified_at?->toIso8601String(),
            'cname_target' => config('makhzan.custom_domains.cname_target'),
            'ip' => config('makhzan.custom_domains.ip'),
        ]]);
    }
}
