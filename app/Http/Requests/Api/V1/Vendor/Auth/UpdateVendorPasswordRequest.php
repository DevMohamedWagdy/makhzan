<?php

namespace App\Http\Requests\Api\V1\Vendor\Auth;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateVendorPasswordRequest extends FormRequest
{
    /**
     * Same password rules as registration; the new one must differ from the current one.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string', 'current_password:sanctum'],
            'password' => ['required', 'string', 'min:8', 'regex:/[A-Za-z]/', 'regex:/\d/', 'confirmed', 'different:current_password'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'current_password.required' => __('forms.current_password_required'),
            'current_password.current_password' => __('forms.current_password_incorrect'),
            'password.required' => __('forms.new_password_required'),
            'password.min' => __('forms.password_rules'),
            'password.regex' => __('forms.password_rules'),
            'password.confirmed' => __('forms.password_mismatch'),
            'password.different' => __('forms.password_same_as_current'),
        ];
    }
}
