<?php

namespace App\Http\Requests\Api\V1\Storefront\Customer;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreProductReviewRequest extends FormRequest
{
    /** Photos a shopper can attach to one review. */
    public const MAX_IMAGES = 3;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'rating' => ['required', 'integer', 'between:1,5'],
            'body' => ['nullable', 'string', 'max:1000'],
            'images' => ['nullable', 'array', 'max:'.self::MAX_IMAGES],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'rating.required' => __('reviews.rating_required'),
            'rating.between' => __('reviews.rating_required'),
            'images.max' => __('reviews.images_max', ['max' => self::MAX_IMAGES]),
            'images.*.image' => __('forms.image_type'),
            'images.*.mimes' => __('forms.image_type'),
            'images.*.max' => __('forms.image_too_large', ['size' => 4]),
        ];
    }
}
