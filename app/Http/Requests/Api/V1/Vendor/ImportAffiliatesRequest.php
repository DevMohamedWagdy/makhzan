<?php

namespace App\Http\Requests\Api\V1\Vendor;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ImportAffiliatesRequest extends FormRequest
{
    /**
     * Either a CSV upload or pre-parsed rows (same columns as the CSV template).
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $maxRows = config('makhzan.affiliates.import_max_rows');

        return [
            'file' => ['required_without:rows', 'file', 'mimes:csv,txt', 'max:5120'],
            'rows' => ['required_without:file', 'array', 'min:1', "max:{$maxRows}"],
            'rows.*' => ['array'],
            'rows.*.line' => ['nullable', 'integer'],
            // Template columns. Declared so validated() keeps them; each row's values are
            // validated individually by ImportAffiliates so bad rows are skipped, not fatal.
            'rows.*.full_name' => ['nullable', 'string', 'max:255'],
            'rows.*.phone' => ['nullable', 'string', 'max:30'],
            'rows.*.email' => ['nullable', 'string', 'max:255'],
            'rows.*.tier' => ['nullable', 'string', 'max:30'],
            'rows.*.payout_type' => ['nullable', 'string', 'max:30'],
            'rows.*.payout_account_name' => ['nullable', 'string', 'max:255'],
            'rows.*.payout_account_number' => ['nullable', 'string', 'max:64'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        $maxRows = config('makhzan.affiliates.import_max_rows');

        return [
            'file.required_without' => __('affiliates.import.file_required'),
            'file.mimes' => __('affiliates.import.file_type'),
            'file.max' => __('forms.file_too_large', ['size' => 5]),
            'rows.required_without' => __('affiliates.import.no_rows'),
            'rows.min' => __('affiliates.import.no_rows'),
            'rows.max' => __('affiliates.import.too_many_rows', ['max' => $maxRows]),
        ];
    }
}
