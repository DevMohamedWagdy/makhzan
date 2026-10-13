<?php

namespace App\Http\Resources;

use App\Enums\PaymentMethod;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The store's payment settings. Secrets are never sent back, only their last characters.
 *
 * @mixin Store
 */
class PaymentSettingsResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $paymob = $this->paymentGateway;

        return [
            'cod_enabled' => $this->cod_enabled,
            'methods' => array_map(fn (PaymentMethod $method): string => $method->value, $this->paymentMethods()),
            'paymob' => $paymob ? [
                'is_live' => $paymob->is_live,
                'public_key' => $paymob->credential('public_key'),
                'secret_key_hint' => self::hint($paymob->credential('secret_key')),
                'hmac_secret_hint' => self::hint($paymob->credential('hmac_secret')),
                'card_integration_id' => $paymob->credential('card_integration_id'),
                'wallet_integration_id' => $paymob->credential('wallet_integration_id'),
                'verified_at' => $paymob->verified_at?->toIso8601String(),
            ] : null,
            // Paste into each Paymob integration's "Transaction processed callback" (needed for wallets).
            'webhook_url' => route('api.v1.payments.paymob.webhook', $this->resource),
        ];
    }

    private static function hint(?string $secret): ?string
    {
        return $secret ? '••••'.mb_substr($secret, -4) : null;
    }
}
