<?php

namespace App\Http\Controllers\Api\V1\Vendor;

use App\Enums\PlanFeature;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Vendor\UpdatePaymentSettingsRequest;
use App\Http\Resources\PaymentSettingsResource;
use App\Models\StorePaymentGateway;
use App\Support\Payments\PaymentGateways;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PaymentSettingsController extends Controller
{
    public function show(Request $request): PaymentSettingsResource
    {
        return new PaymentSettingsResource($request->user()->store->load('paymentGateway'));
    }

    /**
     * Saves cash on delivery and the Paymob account. New Paymob credentials are checked
     * against Paymob before they're saved, so a typo shows up here and not at checkout.
     *
     * @throws ValidationException
     */
    public function update(UpdatePaymentSettingsRequest $request, PaymentGateways $gateways): PaymentSettingsResource
    {
        $store = $request->user()->store->load('paymentGateway');
        $account = null;

        if ($request->has('paymob')) {
            if (! $store->hasFeature(PlanFeature::OnlinePayments)) {
                throw ValidationException::withMessages(['paymob' => __('billing.feature_unavailable')]);
            }

            $paymob = $request->validated('paymob');
            $account = $store->paymentGateway ?? new StorePaymentGateway(['gateway' => StorePaymentGateway::PAYMOB]);
            $secretKey = $paymob['secret_key'] ?? $account->credential('secret_key');

            $account->fill([
                'credentials' => [
                    'secret_key' => $secretKey,
                    'public_key' => $paymob['public_key'],
                    'hmac_secret' => $paymob['hmac_secret'] ?? $account->credential('hmac_secret'),
                    'card_integration_id' => $paymob['card_integration_id'] ?? null,
                    'wallet_integration_id' => $paymob['wallet_integration_id'] ?? null,
                ],
                'is_live' => UpdatePaymentSettingsRequest::mode($secretKey, 'sk') === 'live',
            ]);

            $gateways->for($account)->verify();
            $account->verified_at = now();
            $store->setRelation('paymentGateway', $account);
        }

        if ($request->has('cod_enabled')) {
            $store->cod_enabled = $request->boolean('cod_enabled');
        }

        if ($store->paymentMethods() === []) {
            throw ValidationException::withMessages(['cod_enabled' => __('payments.no_method_enabled')]);
        }

        $account && $store->paymentGateway()->save($account);
        $store->save();

        return new PaymentSettingsResource($store);
    }

    /**
     * Removes the Paymob account; cash on delivery is turned back on so the store keeps
     * taking orders. Unpaid online orders expire as usual.
     */
    public function disconnect(Request $request): PaymentSettingsResource
    {
        $store = $request->user()->store;
        $store->paymentGateway()->delete();
        $store->update(['cod_enabled' => true]);

        return new PaymentSettingsResource($store->load('paymentGateway'));
    }
}
