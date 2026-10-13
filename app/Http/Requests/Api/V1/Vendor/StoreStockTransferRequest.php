<?php

namespace App\Http\Requests\Api\V1\Vendor;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStockTransferRequest extends FormRequest
{
    /**
     * Both warehouses and every variant must belong to the vendor's store.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $storeId = $this->user()->store->id;
        $warehouse = Rule::exists('warehouses', 'id')->where('store_id', $storeId);

        return [
            'from_warehouse_id' => ['required', 'integer', $warehouse],
            'to_warehouse_id' => ['required', 'integer', 'different:from_warehouse_id', $warehouse],
            'note' => ['nullable', 'string', 'max:200'],
            'items' => ['required', 'array', 'min:1', 'max:200'],
            'items.*.variant_id' => [
                'required', 'integer', 'distinct',
                Rule::exists('product_variants', 'id')->where(fn (Builder $query) => $query->whereIn('product_id', fn (Builder $query) => $query->select('id')->from('products')->where('store_id', $storeId))),
            ],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'from_warehouse_id.required' => __('inventory.transfer_from_required'),
            'to_warehouse_id.required' => __('inventory.transfer_to_required'),
            'to_warehouse_id.different' => __('inventory.transfer_same_warehouse'),
            'from_warehouse_id.exists' => __('inventory.warehouse_not_found'),
            'to_warehouse_id.exists' => __('inventory.warehouse_not_found'),
            'items.required' => __('purchasing.items_required'),
            'items.min' => __('purchasing.items_required'),
            'items.*.variant_id.exists' => __('purchasing.variant_invalid'),
            'items.*.variant_id.distinct' => __('purchasing.items_distinct'),
            'items.*.quantity.min' => __('purchasing.quantity_min'),
        ];
    }
}
