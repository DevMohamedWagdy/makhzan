<?php

namespace App\Http\Requests\Api\V1\Vendor;

use App\Enums\AffiliateStatus;
use App\Enums\AffiliateTier;
use App\Enums\PayoutMethod;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListAffiliatesRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:100'],
            'tier' => ['nullable', Rule::enum(AffiliateTier::class)],
            'status' => ['nullable', Rule::enum(AffiliateStatus::class)],
            'payout_method' => ['nullable', Rule::enum(PayoutMethod::class)],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', Rule::in([10, 20, 50])],
        ];
    }
}
