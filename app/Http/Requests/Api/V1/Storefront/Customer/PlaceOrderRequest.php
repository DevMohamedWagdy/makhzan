<?php

namespace App\Http\Requests\Api\V1\Storefront\Customer;

use App\Enums\PaymentMethod;
use App\Support\PhoneNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Checkout: the cart items, either a saved address (address_id) or a new one (address.*), and
 * how the customer will pay (cash on delivery when not given).
 */
class PlaceOrderRequest extends FormRequest
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
        $presence = 'required_without:address_id';

        return [
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.variant_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:99'],
            'address_id' => ['nullable', 'integer', Rule::exists('customer_addresses', 'id')->where('customer_id', $this->user()->id)],
            'address' => ['nullable', 'array'],
            ...SaveAddressRequest::addressRules($this->input('address.governorate_id'), 'address.', $presence),
            'save_address' => ['sometimes', 'boolean'],
            'referral_code' => ['nullable', 'string', 'max:32'],
            'coupon_code' => ['nullable', 'string', 'max:32'],
            'note' => ['nullable', 'string', 'max:500'],
            'payment_method' => ['nullable', Rule::enum(PaymentMethod::class)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.required' => __('orders.cart_empty'),
            'items.min' => __('orders.cart_empty'),
            'address_id.exists' => __('orders.address_not_found'),
            'payment_method.enum' => __('payments.method_unavailable'),
            ...SaveAddressRequest::addressMessages('address.'),
        ];
    }
}
