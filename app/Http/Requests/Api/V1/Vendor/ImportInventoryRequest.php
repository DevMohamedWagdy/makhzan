<?php

namespace App\Http\Requests\Api\V1\Vendor;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ImportInventoryRequest extends FormRequest
{
    /** Most rows one import may carry. */
    public const MAX_ROWS = 2000;

    /**
     * Rows parsed from the exported CSV. Cells are checked one row at a time by
     * ImportInventory, so a bad row is reported instead of failing the whole file.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'rows' => ['required', 'array', 'min:1', 'max:'.self::MAX_ROWS],
            'rows.*' => ['array'],
            'rows.*.line' => ['nullable', 'integer'],
            'rows.*.variant_id' => ['nullable'],
            'rows.*.sku' => ['nullable', 'string', 'max:60'],
            'rows.*.stock' => ['nullable'],
            'rows.*.cost' => ['nullable'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'rows.required' => __('purchasing.import.empty'),
            'rows.min' => __('purchasing.import.empty'),
            'rows.max' => __('purchasing.import.too_many_rows', ['max' => self::MAX_ROWS]),
        ];
    }
}
