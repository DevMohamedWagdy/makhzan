<?php

namespace App\Http\Requests\Api\V1\Vendor;

use App\Support\PhoneNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateStoreSettingsRequest extends FormRequest
{
    /**
     * Phones are stored in their normalized form, like the rest of the app.
     */
    protected function prepareForValidation(): void
    {
        foreach (['contact_phone', 'whatsapp'] as $key) {
            if (filled($this->input($key))) {
                $this->merge([$key => PhoneNumber::normalize($this->input($key))]);
            }
        }
    }

    /**
     * Each settings tab sends only its own fields, so every field is optional.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $policy = ['sometimes', 'nullable', 'string', 'max:20000'];
        $url = ['sometimes', 'nullable', 'url:https,http', 'max:255'];

        return [
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'governorate_id' => ['sometimes', 'required', 'string', 'max:40'],
            'city_id' => ['sometimes', 'required', 'string', 'max:40'],

            'contact_phone' => ['sometimes', 'nullable', 'regex:'.PhoneNumber::PATTERN],
            'whatsapp' => ['sometimes', 'nullable', 'regex:'.PhoneNumber::PATTERN],
            'contact_email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'facebook_url' => $url,
            'instagram_url' => $url,
            'tiktok_url' => $url,

            'announcement' => ['sometimes', 'nullable', 'string', 'max:200'],
            'accepting_orders' => ['sometimes', 'boolean'],
            'closed_message' => ['sometimes', 'nullable', 'string', 'max:200'],
            'min_order_total' => ['sometimes', 'nullable', 'numeric', 'gt:0', 'max:10000000'],

            'return_policy' => $policy,
            'shipping_policy' => $policy,
            'privacy_policy' => $policy,
            'terms' => $policy,
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => __('forms.store_name_required'),
            'contact_phone.regex' => __('forms.phone_invalid'),
            'whatsapp.regex' => __('forms.phone_invalid'),
            'facebook_url.url' => __('settings.url_invalid'),
            'instagram_url.url' => __('settings.url_invalid'),
            'tiktok_url.url' => __('settings.url_invalid'),
        ];
    }
}
