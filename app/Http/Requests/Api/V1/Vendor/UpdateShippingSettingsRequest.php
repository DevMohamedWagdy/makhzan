<?php

namespace App\Http\Requests\Api\V1\Vendor;

use App\Support\Locations;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateShippingSettingsRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'default_shipping_price' => ['nullable', 'numeric', 'min:0', 'max:100000'],
            'free_shipping_threshold' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'rates' => ['present', 'array'],
            'rates.*.governorate_id' => ['required', 'distinct', Rule::in(Locations::activeGovernorateIds())],
            'rates.*.is_enabled' => ['required', 'boolean'],
            'rates.*.price' => ['nullable', 'numeric', 'min:0', 'max:100000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'default_shipping_price.numeric' => __('orders.price_invalid'),
            'default_shipping_price.min' => __('orders.price_invalid'),
            'free_shipping_threshold.numeric' => __('orders.price_invalid'),
            'free_shipping_threshold.min' => __('orders.price_invalid'),
            'rates.*.price.numeric' => __('orders.price_invalid'),
            'rates.*.price.min' => __('orders.price_invalid'),
        ];
    }
}
