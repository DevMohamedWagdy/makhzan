<?php

namespace App\Http\Requests\Api\V1\Vendor;

use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * Adds products to a collection (POST /collections/{collection}/products).
 */
class AttachCollectionProductsRequest extends FormRequest
{
    /**
     * Another store's collection is reported as 404 before any validation runs.
     */
    public function authorize(): Response
    {
        return Gate::inspect('update', $this->route('collection'));
    }

    /**
     * Only the store's own (non-deleted) products can be added.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'product_ids' => ['required', 'array', 'max:100'],
            'product_ids.*' => [
                'integer', 'distinct',
                Rule::exists('products', 'id')->where('store_id', $this->route('collection')->store_id)->whereNull('deleted_at'),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'product_ids.required' => __('products.collection_products_required'),
            'product_ids.*.exists' => __('products.not_found'),
        ];
    }
}
