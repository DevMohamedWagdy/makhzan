<?php

namespace App\Http\Requests\Api\V1\Vendor;

use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class UpdateInventoryItemRequest extends FormRequest
{
    /**
     * Another store's variant is reported as 404 before any validation runs.
     */
    public function authorize(): Response
    {
        return Gate::inspect('update', $this->route('variant'));
    }

    /**
     * Cost and the variant's own low-stock threshold (null falls back to the store's).
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'cost' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:10000000'],
            'low_stock_threshold' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'cost.numeric' => __('products.cost_numeric'),
            'cost.min' => __('products.cost_min'),
        ];
    }
}
