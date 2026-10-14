<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Http\Controllers\Controller;
use App\Models\StoreShippingAccount;
use App\Support\Shipping\BostaClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

/**
 * The store's Bosta connection: API key (checked with Bosta before saving) and options.
 */
class ShippingCarrierController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return $this->connection($request->user()->store->bostaAccount);
    }

    public function update(Request $request): JsonResponse
    {
        $store = $request->user()->store;
        $account = $store->bostaAccount ?? new StoreShippingAccount(['carrier' => StoreShippingAccount::BOSTA]);
        $validated = $request->validate([
            'api_key' => [$account->exists ? 'nullable' : 'required', 'string', 'max:255'],
            'allow_open_package' => ['boolean'],
        ]);

        if (filled($validated['api_key'] ?? null)) {
            $account->credentials = [...($account->credentials ?? []), 'api_key' => trim($validated['api_key'])];

            if (! (new BostaClient($account))->verify()) {
                throw ValidationException::withMessages(['api_key' => __('orders.shipping.bosta_key_invalid')]);
            }

            $account->verified_at = now();
        }

        $account->settings = ['allow_open_package' => (bool) ($validated['allow_open_package'] ?? $account->setting('allow_open_package', false))];
        $store->bostaAccount()->save($account);

        return $this->connection($account);
    }

    public function destroy(Request $request): Response
    {
        $request->user()->store->bostaAccount()->delete();

        return response()->noContent();
    }

    private function connection(?StoreShippingAccount $account): JsonResponse
    {
        return response()->json(['data' => [
            'connected' => (bool) $account,
            'api_key_hint' => $account ? '••••'.mb_substr((string) $account->credential('api_key'), -4) : null,
            'allow_open_package' => (bool) $account?->setting('allow_open_package', false),
            'verified_at' => $account?->verified_at?->toIso8601String(),
        ]]);
    }
}
