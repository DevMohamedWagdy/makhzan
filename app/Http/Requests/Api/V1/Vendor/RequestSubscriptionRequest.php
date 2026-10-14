<?php

namespace App\Http\Requests\Api\V1\Vendor;

use App\Enums\BillingMethod;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RequestSubscriptionRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'plan_id' => ['required', 'integer', Rule::exists('plans', 'id')->where('is_active', true)],
            'months' => ['required', 'integer', Rule::in([1, 3, 6, 12])],
            'method' => ['required', Rule::enum(BillingMethod::class)->except([BillingMethod::Cash])],
            'reference' => ['required', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
