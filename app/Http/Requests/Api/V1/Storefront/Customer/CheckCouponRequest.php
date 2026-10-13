<?php

namespace App\Http\Requests\Api\V1\Storefront\Customer;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class CheckCouponRequest extends FormRequest
{
    /**
     * The code and the cart it would apply to.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'coupon_code' => ['required', 'string', 'max:32'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.variant_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:99'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'coupon_code.required' => __('coupons.invalid'),
            'items.required' => __('orders.cart_empty'),
            'items.min' => __('orders.cart_empty'),
        ];
    }
}
