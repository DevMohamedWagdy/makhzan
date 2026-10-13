<?php

namespace App\Http\Requests\Api\V1\Vendor;

use App\Enums\StockMovementType;
use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class StoreStockMovementRequest extends FormRequest
{
    /**
     * Another store's variant is reported as 404 before any validation runs.
     */
    public function authorize(): Response
    {
        return Gate::inspect('update', $this->route('variant'));
    }

    /**
     * Restock and damage take the number of units added or written off; a stock count
     * (adjustment) takes the counted quantity, which may be zero.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $isCount = $this->input('type') === StockMovementType::Adjustment->value;

        return [
            'type' => ['required', Rule::in(array_map(fn (StockMovementType $type): string => $type->value, StockMovementType::manual()))],
            'quantity' => ['required', 'integer', $isCount ? 'min:0' : 'min:1', 'max:1000000'],
            'warehouse_id' => ['nullable', 'integer', Rule::exists('warehouses', 'id')->where('store_id', $this->user()->store->id)],
            'unit_cost' => ['nullable', 'numeric', 'min:0', 'max:10000000'],
            'note' => ['nullable', 'string', 'max:200'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'type.required' => __('inventory.type_invalid'),
            'type.in' => __('inventory.type_invalid'),
            'quantity.required' => __('inventory.quantity_required'),
            'quantity.min' => $this->input('type') === StockMovementType::Adjustment->value ? __('inventory.counted_min') : __('inventory.quantity_min'),
            'warehouse_id.exists' => __('inventory.warehouse_not_found'),
            'unit_cost.numeric' => __('products.cost_numeric'),
            'unit_cost.min' => __('products.cost_min'),
        ];
    }
}
