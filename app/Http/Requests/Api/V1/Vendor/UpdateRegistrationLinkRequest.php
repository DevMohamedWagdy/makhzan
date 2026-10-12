<?php

namespace App\Http\Requests\Api\V1\Vendor;

use App\Enums\AffiliateTier;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRegistrationLinkRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'is_enabled' => ['sometimes', 'boolean'],
            'auto_approve' => ['sometimes', 'boolean'],
            'default_tier' => ['sometimes', Rule::enum(AffiliateTier::class)],
        ];
    }
}
