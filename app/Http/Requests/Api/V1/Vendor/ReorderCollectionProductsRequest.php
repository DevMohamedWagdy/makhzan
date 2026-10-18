<?php

namespace App\Http\Requests\Api\V1\Vendor;

use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ReorderCollectionProductsRequest extends FormRequest
{
    /**
     * Another store's collection is reported as 404 before any validation runs.
     */
    public function authorize(): Response
    {
        return Gate::inspect('update', $this->route('collection'));
    }

    /**
     * The collection's product ids in their new order.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'product_ids' => ['required', 'array'],
            'product_ids.*' => ['integer', 'distinct', Rule::exists('collection_products', 'product_id')->where('collection_id', $this->route('collection')->id)],
        ];
    }

    /**
     * The list must hold every product of the collection, so no two end up on the same position.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isEmpty() && count($this->input('product_ids')) !== $this->route('collection')->products()->count()) {
                    $validator->errors()->add('product_ids', __('products.collection_order_incomplete'));
                }
            },
        ];
    }
}
