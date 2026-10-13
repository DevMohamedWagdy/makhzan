<?php

namespace App\Http\Requests\Api\V1\Vendor;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UploadStoreLogoRequest extends FormRequest
{
    /**
     * Same limits as the logo picked at registration.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'logo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'logo.image' => __('forms.file_type'),
            'logo.mimes' => __('forms.image_type'),
            'logo.max' => __('forms.file_too_large', ['size' => 2]),
        ];
    }
}
