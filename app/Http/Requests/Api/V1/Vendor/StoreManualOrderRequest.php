<?php

namespace App\Http\Requests\Api\V1\Vendor;

use App\Enums\OrderSource;
use App\Http\Requests\Api\V1\Storefront\Customer\SaveAddressRequest;
use App\Support\PhoneNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * An order the vendor took outside the storefront: the channel, the items, the delivery address,
 * an existing customer (optional), the shipping fee and discount they agreed on, and whether to
 * confirm it right away.
 */
class StoreManualOrderRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->has('address.phone')) {
            $this->merge(['address' => [...$this->input('address'), 'phone' => PhoneNumber::normalize($this->input('address.phone'))]]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'source' => ['required', Rule::enum(OrderSource::class)->only(OrderSource::manual())],
            'customer_id' => ['nullable', 'integer', Rule::exists('customers', 'id')->where('store_id', $this->user()->store->id)],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.variant_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
            'address' => ['required', 'array'],
            ...SaveAddressRequest::addressRules($this->input('address.governorate_id'), 'address.'),
            'shipping_fee' => ['nullable', 'numeric', 'min:0', 'max:100000'],
            'discount' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'note' => ['nullable', 'string', 'max:500'],
            'confirm' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'source.required' => __('orders.manual.source_required'),
            'source.enum' => __('orders.manual.source_required'),
            'customer_id.exists' => __('orders.customer_not_found'),
            'items.required' => __('orders.manual.items_required'),
            'items.min' => __('orders.manual.items_required'),
            ...SaveAddressRequest::addressMessages('address.'),
        ];
    }
}
