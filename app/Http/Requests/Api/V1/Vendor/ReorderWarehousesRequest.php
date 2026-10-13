<?php

namespace App\Http\Requests\Api\V1\Vendor;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class ReorderWarehousesRequest extends FormRequest
{
    /**
     * Every one of the store's warehouses, in the new fulfilment order.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'warehouse_ids' => ['required', 'array'],
            'warehouse_ids.*' => ['integer', 'distinct'],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $ids = $this->user()->store->warehouses()->pluck('id')->sort()->values()->all();
                $given = collect($this->input('warehouse_ids', []))->map(fn ($id): int => (int) $id)->sort()->values()->all();

                if ($ids !== $given) {
                    $validator->errors()->add('warehouse_ids', __('inventory.warehouse_order_invalid'));
                }
            },
        ];
    }
}
