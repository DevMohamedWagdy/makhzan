<?php

namespace App\Http\Requests\Api\V1\Storefront\Customer;

use App\Support\PhoneNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterCustomerRequest extends FormRequest
{
    /**
     * Normalize the phone before the per-store uniqueness check.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'phone' => PhoneNumber::normalize($this->input('phone')),
            'email' => $this->filled('email') ? mb_strtolower(trim($this->input('email'))) : null,
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $storeId = $this->route('store')->id;

        return [
            'full_name' => ['required', 'string', 'min:3', 'max:100'],
            'phone' => ['required', 'regex:'.PhoneNumber::PATTERN, Rule::unique('customers', 'phone')->where('store_id', $storeId)],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('customers', 'email')->where('store_id', $storeId)],
            'password' => ['required', 'string', 'min:8', 'regex:/[A-Za-z]/', 'regex:/\d/', 'confirmed'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'full_name.required' => __('forms.full_name_required'),
            'full_name.min' => __('forms.full_name_min'),
            'phone.required' => __('forms.phone_required'),
            'phone.regex' => __('forms.phone_invalid'),
            'phone.unique' => __('orders.customer_phone_taken'),
            'email.email' => __('forms.email_invalid'),
            'email.unique' => __('orders.customer_email_taken'),
            'password.required' => __('forms.password_required'),
            'password.min' => __('forms.password_rules'),
            'password.regex' => __('forms.password_rules'),
            'password.confirmed' => __('forms.password_mismatch'),
        ];
    }
}
