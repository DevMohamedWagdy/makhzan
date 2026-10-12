<?php

namespace App\Http\Requests\Api\V1\Vendor;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListCustomersRequest extends FormRequest
{
    /**
     * Sort keys accepted by the customers list.
     *
     * @var list<string>
     */
    public const SORTS = ['recent', 'last_order', 'orders', 'spent'];

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', Rule::in(self::SORTS)],
            'buyers' => ['nullable', 'boolean'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', Rule::in([10, 20, 50])],
        ];
    }
}
