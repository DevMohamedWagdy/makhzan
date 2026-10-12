<?php

namespace App\Http\Requests\Api\V1\Storefront\Customer;

use App\Support\PhoneNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * A delivery address, saved to the customer's book (prefix "") or sent inline with an
 * order (prefix "address."), see addressRules().
 */
class SaveAddressRequest extends FormRequest
{
    /**
     * Normalize the phone so it matches what couriers dial.
     */
    protected function prepareForValidation(): void
    {
        $this->merge(['phone' => PhoneNumber::normalize($this->input('phone'))]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...self::addressRules($this->input('governorate_id')),
            'is_default' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, array<mixed>>
     */
    public static function addressRules(?string $governorateId, string $prefix = '', string $presence = 'required'): array
    {
        $governorates = config('makhzan.governorates');

        return [
            "{$prefix}recipient_name" => [$presence, 'string', 'min:3', 'max:100'],
            "{$prefix}phone" => [$presence, 'regex:'.PhoneNumber::PATTERN],
            "{$prefix}governorate_id" => [$presence, 'string', Rule::in(array_keys($governorates))],
            "{$prefix}city_id" => [$presence, 'string', Rule::in($governorates[$governorateId] ?? [])],
            "{$prefix}address_line" => [$presence, 'string', 'min:5', 'max:255'],
            "{$prefix}landmark" => ['nullable', 'string', 'max:150'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function addressMessages(string $prefix = ''): array
    {
        return [
            "{$prefix}recipient_name.required" => __('orders.recipient_required'),
            "{$prefix}recipient_name.required_without" => __('orders.recipient_required'),
            "{$prefix}phone.required" => __('forms.phone_required'),
            "{$prefix}phone.required_without" => __('forms.phone_required'),
            "{$prefix}phone.regex" => __('forms.phone_invalid'),
            "{$prefix}governorate_id.required" => __('forms.governorate_required'),
            "{$prefix}governorate_id.required_without" => __('forms.governorate_required'),
            "{$prefix}governorate_id.in" => __('forms.governorate_required'),
            "{$prefix}city_id.required" => __('forms.city_required'),
            "{$prefix}city_id.required_without" => __('forms.city_required'),
            "{$prefix}city_id.in" => __('forms.city_mismatch'),
            "{$prefix}address_line.required" => __('orders.address_line_required'),
            "{$prefix}address_line.required_without" => __('orders.address_line_required'),
            "{$prefix}address_line.min" => __('orders.address_line_required'),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return self::addressMessages();
    }
}
