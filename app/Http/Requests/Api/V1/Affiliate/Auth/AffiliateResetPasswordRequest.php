<?php

namespace App\Http\Requests\Api\V1\Affiliate\Auth;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class AffiliateResetPasswordRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'store_slug' => ['required', 'string'],
            'affiliate_id' => ['required', 'integer'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'regex:/[A-Za-z]/', 'regex:/\d/', 'confirmed'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'password.required' => __('forms.new_password_required'),
            'password.min' => __('forms.password_rules'),
            'password.regex' => __('forms.password_rules'),
            'password.confirmed' => __('forms.password_mismatch'),
        ];
    }
}
