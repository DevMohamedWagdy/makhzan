<?php

namespace App\Http\Requests\Api\V1\Vendor\Auth;

use App\Support\Locations;
use App\Support\PhoneNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class RegisterVendorRequest extends FormRequest
{
    /**
     * Normalize identifiers before uniqueness checks.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'vendor' => [
                ...(array) $this->input('vendor', []),
                'phone' => PhoneNumber::normalize($this->input('vendor.phone')),
                'email' => Str::lower(trim((string) $this->input('vendor.email'))),
            ],
            'store' => [
                ...(array) $this->input('store', []),
                'slug' => Str::lower(trim((string) $this->input('store.slug'))),
            ],
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'vendor.full_name' => ['required', 'string', 'min:5', 'max:255'],
            'vendor.phone' => ['required', 'regex:'.PhoneNumber::PATTERN, Rule::unique('vendors', 'phone')],
            'vendor.email' => ['required', 'email', 'max:255', Rule::unique('vendors', 'email')],
            'vendor.password' => ['required', 'string', 'min:8', 'regex:/[A-Za-z]/', 'regex:/\d/', 'confirmed'],

            'store.name' => ['required', 'string', 'min:2', 'max:255'],
            'store.slug' => [
                'required', 'string', 'min:3', 'max:40', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::notIn(config('makhzan.reserved_slugs')), Rule::unique('stores', 'slug'),
            ],
            // SVG is deliberately excluded: it can carry scripts and is served from the public disk.
            'store.logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'store.governorate_id' => ['required', 'string', Rule::in(Locations::activeGovernorateIds())],
            'store.city_id' => ['required', 'string', Rule::in(Locations::activeCityIds($this->input('store.governorate_id')))],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'vendor.full_name.required' => __('forms.full_name_required'),
            'vendor.full_name.min' => __('forms.full_name_min'),
            'vendor.phone.required' => __('forms.vendor_phone_required'),
            'vendor.phone.regex' => __('forms.phone_invalid'),
            'vendor.phone.unique' => __('forms.phone_taken'),
            'vendor.email.required' => __('forms.email_required'),
            'vendor.email.email' => __('forms.email_invalid'),
            'vendor.email.unique' => __('forms.email_taken'),
            'vendor.password.required' => __('forms.password_required'),
            'vendor.password.min' => __('forms.password_rules'),
            'vendor.password.regex' => __('forms.password_rules'),
            'vendor.password.confirmed' => __('forms.password_mismatch'),
            'store.name.required' => __('forms.store_name_required'),
            'store.name.min' => __('forms.store_name_min'),
            'store.slug.required' => __('forms.slug_required'),
            'store.slug.min' => __('forms.slug_format'),
            'store.slug.max' => __('forms.slug_format'),
            'store.slug.regex' => __('forms.slug_format'),
            'store.slug.not_in' => __('forms.slug_taken'),
            'store.slug.unique' => __('forms.slug_taken'),
            'store.logo.image' => __('forms.file_type'),
            'store.logo.mimes' => __('forms.image_type'),
            'store.logo.max' => __('forms.file_too_large', ['size' => 2]),
            'store.governorate_id.required' => __('forms.governorate_required'),
            'store.governorate_id.in' => __('forms.governorate_required'),
            'store.city_id.required' => __('forms.city_required'),
            'store.city_id.in' => __('forms.city_mismatch'),
        ];
    }
}
