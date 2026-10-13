<?php

namespace App\Http\Requests\Api\V1\Vendor;

use App\Enums\CouponType;
use App\Models\Coupon;
use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class SaveCouponRequest extends FormRequest
{
    /**
     * Editing another store's coupon is reported as 404 before validation.
     */
    public function authorize(): Response
    {
        $coupon = $this->route('coupon');

        return $coupon ? Gate::inspect('update', $coupon) : Response::allow();
    }

    /**
     * Codes are compared upper-case, as they're stored.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('code')) {
            $this->merge(['code' => Coupon::normalize($this->input('code'))]);
        }
    }

    /**
     * Products, categories and the affiliate must belong to the vendor's store.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $storeId = $this->user()->store->id;
        $type = $this->input('type');

        return [
            'code' => ['required', 'string', 'max:32', 'regex:/^[A-Z0-9-]+$/', Rule::unique('coupons', 'code')->where('store_id', $storeId)->ignore($this->route('coupon'))],
            'description' => ['nullable', 'string', 'max:200'],
            'type' => ['required', Rule::enum(CouponType::class)],
            'value' => [
                Rule::requiredIf($type !== CouponType::FreeShipping->value), 'nullable', 'numeric', 'gt:0',
                ...($type === CouponType::Percentage->value ? ['max:100'] : ['max:10000000']),
            ],
            'max_discount' => ['nullable', 'numeric', 'gt:0', 'max:10000000'],
            'min_subtotal' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'applies_to' => ['required', Rule::in([Coupon::APPLIES_TO_ALL, Coupon::APPLIES_TO_PRODUCTS, Coupon::APPLIES_TO_CATEGORIES])],
            'product_ids' => ['required_if:applies_to,products', 'nullable', 'array', 'max:500'],
            'product_ids.*' => ['integer', Rule::exists('products', 'id')->where('store_id', $storeId)],
            'category_ids' => ['required_if:applies_to,categories', 'nullable', 'array', 'max:200'],
            'category_ids.*' => ['integer', Rule::exists('product_categories', 'id')->where('store_id', $storeId)],
            'usage_limit' => ['nullable', 'integer', 'min:1', 'max:1000000'],
            'per_customer_limit' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'first_order_only' => ['boolean'],
            'affiliate_id' => ['nullable', 'integer', Rule::exists('affiliates', 'id')->where('store_id', $storeId)],
            'starts_at' => ['nullable', 'date'],
            // A new coupon can't be born expired; an old one can still be edited as it is.
            'ends_at' => ['nullable', 'date', 'after:starts_at', ...($this->route('coupon') ? [] : ['after:now'])],
            'is_active' => ['boolean'],
        ];
    }

    /**
     * The coupon's attributes: targets cleared for "all", value cleared for free shipping.
     *
     * @return array<string, mixed>
     */
    public function couponAttributes(): array
    {
        $data = $this->validated();
        $appliesTo = $data['applies_to'];

        return [
            ...$data,
            'value' => $data['type'] === CouponType::FreeShipping->value ? null : $data['value'],
            'max_discount' => $data['type'] === CouponType::Percentage->value ? ($data['max_discount'] ?? null) : null,
            'product_ids' => $appliesTo === Coupon::APPLIES_TO_PRODUCTS ? array_map('intval', $data['product_ids']) : null,
            'category_ids' => $appliesTo === Coupon::APPLIES_TO_CATEGORIES ? array_map('intval', $data['category_ids']) : null,
            'first_order_only' => (bool) ($data['first_order_only'] ?? false),
            'is_active' => (bool) ($data['is_active'] ?? true),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.unique' => __('coupons.code_taken'),
            'code.regex' => __('coupons.code_format'),
            'value.required' => __('coupons.value_required'),
            'value.max' => $this->input('type') === CouponType::Percentage->value ? __('coupons.percentage_max') : __('validation.max.numeric', ['attribute' => 'value', 'max' => 10000000]),
            'ends_at.after' => __('coupons.ends_after_start'),
            'product_ids.required_if' => __('coupons.targets_required'),
            'category_ids.required_if' => __('coupons.targets_required'),
            'affiliate_id.exists' => __('coupons.affiliate_invalid'),
        ];
    }
}
