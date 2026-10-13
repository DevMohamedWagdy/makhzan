<?php

namespace App\Http\Requests\Api\V1\Vendor;

use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class SavePurchaseOrderRequest extends FormRequest
{
    /**
     * Editing another store's purchase order is reported as 404 before validation.
     */
    public function authorize(): Response
    {
        $purchaseOrder = $this->route('purchaseOrder');

        return $purchaseOrder ? Gate::inspect('update', $purchaseOrder) : Response::allow();
    }

    /**
     * The supplier and every variant must belong to the vendor's store.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $storeId = $this->user()->store->id;

        return [
            'supplier_id' => ['required', 'integer', Rule::exists('suppliers', 'id')->where('store_id', $storeId)],
            'warehouse_id' => ['nullable', 'integer', Rule::exists('warehouses', 'id')->where('store_id', $storeId)],
            'expected_at' => ['nullable', 'date_format:Y-m-d'],
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1', 'max:200'],
            'items.*.variant_id' => [
                'required', 'integer', 'distinct',
                Rule::exists('product_variants', 'id')->where(fn (Builder $query) => $query->whereIn('product_id', fn (Builder $query) => $query->select('id')->from('products')->where('store_id', $storeId))),
            ],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
            'items.*.unit_cost' => ['required', 'numeric', 'min:0', 'max:10000000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'supplier_id.required' => __('purchasing.supplier_required'),
            'supplier_id.exists' => __('purchasing.supplier_not_found'),
            'warehouse_id.exists' => __('inventory.warehouse_not_found'),
            'items.required' => __('purchasing.items_required'),
            'items.min' => __('purchasing.items_required'),
            'items.*.variant_id.exists' => __('purchasing.variant_invalid'),
            'items.*.variant_id.distinct' => __('purchasing.items_distinct'),
            'items.*.quantity.min' => __('purchasing.quantity_min'),
            'items.*.unit_cost.required' => __('purchasing.cost_required'),
        ];
    }
}
