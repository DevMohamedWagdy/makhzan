<?php

namespace App\Http\Requests\Api\V1\Vendor;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/**
 * Cash on delivery on/off and the store's Paymob account. Once connected, the secret key and
 * HMAC secret may be left out to keep the saved ones.
 */
class UpdatePaymentSettingsRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        // Sent as a whole (even empty) whenever the Paymob form is saved.
        $required = $this->has('paymob') ? 'required' : 'nullable';
        $secret = $this->user()->store->paymentGateway()->exists() ? 'nullable' : $required;
        $integrationId = ['nullable', 'regex:/^\d{1,12}$/'];

        return [
            'cod_enabled' => ['sometimes', 'boolean'],
            'paymob' => ['sometimes', 'array'],
            'paymob.secret_key' => [$secret, 'string', 'max:255'],
            'paymob.public_key' => [$required, 'string', 'max:255'],
            'paymob.hmac_secret' => [$secret, 'string', 'max:255'],
            'paymob.card_integration_id' => $integrationId,
            'paymob.wallet_integration_id' => $integrationId,
        ];
    }

    /**
     * At least one payment method, and keys from the same mode (both test or both live).
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if (! $this->has('paymob') || $validator->errors()->isNotEmpty()) {
                    return;
                }

                if (blank($this->input('paymob.card_integration_id')) && blank($this->input('paymob.wallet_integration_id'))) {
                    $validator->errors()->add('paymob.card_integration_id', __('payments.integration_required'));
                }

                $secretMode = self::mode($this->input('paymob.secret_key') ?? $this->user()->store->paymentGateway?->credential('secret_key'), 'sk');
                $publicMode = self::mode($this->input('paymob.public_key'), 'pk');

                if ($secretMode && $publicMode && $secretMode !== $publicMode) {
                    $validator->errors()->add('paymob.public_key', __('payments.keys_mode_mismatch'));
                }
            },
        ];
    }

    /**
     * "test" or "live" from a Paymob key such as egy_sk_test_…, or null if it doesn't say.
     */
    public static function mode(?string $key, string $kind): ?string
    {
        return preg_match('/_'.$kind.'_(test|live)_/', (string) $key, $matches) ? $matches[1] : null;
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'paymob.secret_key.required' => __('payments.secret_key_required'),
            'paymob.public_key.required' => __('payments.public_key_required'),
            'paymob.hmac_secret.required' => __('payments.hmac_secret_required'),
            'paymob.card_integration_id.regex' => __('payments.integration_id_invalid'),
            'paymob.wallet_integration_id.regex' => __('payments.integration_id_invalid'),
        ];
    }
}
