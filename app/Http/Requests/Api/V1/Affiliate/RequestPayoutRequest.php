<?php

namespace App\Http\Requests\Api\V1\Affiliate;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class RequestPayoutRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'min:1', 'max:10000000'],
            'note' => ['nullable', 'string', 'max:200'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'amount.required' => 'أدخل المبلغ المطلوب تحويله',
            'amount.numeric' => 'المبلغ يجب أن يكون رقماً',
            'amount.min' => 'أقل مبلغ للتحويل 1 ج.م',
        ];
    }
}
