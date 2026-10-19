<?php

namespace App\Http\Requests\Api\V1\Affiliate\Auth;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AffiliateForgotPasswordRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'store_slug' => ['required', 'string', Rule::exists('stores', 'slug')],
            'email' => ['required', 'string', 'email', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'store_slug.required' => __('forms.store_missing'),
            'store_slug.exists' => __('forms.store_not_found'),
            'email.required' => __('forms.email_required'),
            'email.email' => __('forms.email_invalid'),
        ];
    }
}
