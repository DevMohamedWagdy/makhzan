<?php

namespace App\Http\Requests\Api\V1\Vendor;

use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class SaveWarehouseRequest extends FormRequest
{
    /**
     * Editing another store's warehouse is reported as 404 before validation.
     */
    public function authorize(): Response
    {
        $warehouse = $this->route('warehouse');

        return $warehouse ? Gate::inspect('update', $warehouse) : Response::allow();
    }

    /**
     * Names are unique within the store.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100', Rule::unique('warehouses', 'name')->where('store_id', $this->user()->store->id)->ignore($this->route('warehouse'))],
            'address' => ['nullable', 'string', 'max:255'],
            'governorate_id' => ['nullable', 'string', 'max:40'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => __('inventory.warehouse_name_required'),
            'name.unique' => __('inventory.warehouse_name_taken'),
        ];
    }
}
