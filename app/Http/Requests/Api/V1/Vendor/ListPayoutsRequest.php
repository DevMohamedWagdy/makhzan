<?php

namespace App\Http\Requests\Api\V1\Vendor;

use App\Enums\PayoutStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListPayoutsRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'status' => ['nullable', Rule::enum(PayoutStatus::class)],
            'page' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
