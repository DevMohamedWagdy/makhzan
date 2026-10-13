<?php

namespace App\Http\Requests\Api\V1\Vendor\Auth;

use App\Support\PhoneNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateVendorProfileRequest extends FormRequest
{
    /**
     * Normalize identifiers before uniqueness checks.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'phone' => PhoneNumber::normalize($this->input('phone')),
            'email' => mb_strtolower(trim((string) $this->input('email'))),
        ]);
    }

    /**
     * Phone and email stay unique among vendors (both are sign-in identifiers).
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $vendorId = $this->user()->id;

        return [
            'full_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'regex:'.PhoneNumber::PATTERN, Rule::unique('vendors', 'phone')->ignore($vendorId)],
            'email' => ['required', 'email', 'max:255', Rule::unique('vendors', 'email')->ignore($vendorId)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'full_name.required' => __('forms.full_name_required'),
            'phone.required' => __('forms.vendor_phone_required'),
            'phone.regex' => __('forms.phone_invalid'),
            'phone.unique' => __('forms.phone_taken'),
            'email.unique' => __('forms.email_taken'),
        ];
    }
}
