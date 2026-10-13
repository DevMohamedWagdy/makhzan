<?php

namespace App\Http\Requests\Api\V1\Vendor;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListPaymentTransactionsRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'kind' => ['nullable', Rule::in(['payment', 'refund'])],
            'status' => ['nullable', Rule::in([PaymentStatus::Paid->value, PaymentStatus::Failed->value, PaymentStatus::Pending->value])],
            'method' => ['nullable', Rule::in([PaymentMethod::Card->value, PaymentMethod::Wallet->value])],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', Rule::in([10, 20, 50])],
        ];
    }
}
