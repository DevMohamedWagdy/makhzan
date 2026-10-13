<?php

namespace App\Http\Requests\Api\V1\Vendor;

use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class ReceivePurchaseOrderRequest extends FormRequest
{
    /**
     * Another store's purchase order is reported as 404 before validation.
     */
    public function authorize(): Response
    {
        return Gate::inspect('update', $this->route('purchaseOrder'));
    }

    /**
     * `items` maps purchase order item ids to the quantity that arrived now.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:0', 'max:1000000'],
            'note' => ['nullable', 'string', 'max:150'],
        ];
    }

    /**
     * @return array<int, int>
     */
    public function quantities(): array
    {
        return collect($this->validated('items'))->mapWithKeys(fn (array $item): array => [(int) $item['item_id'] => (int) $item['quantity']])->all();
    }
}
