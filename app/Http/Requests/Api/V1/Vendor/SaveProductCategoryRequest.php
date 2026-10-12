<?php

namespace App\Http\Requests\Api\V1\Vendor;

use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * Creates or updates a category (POST /product-categories, PUT /product-categories/{category}).
 */
class SaveProductCategoryRequest extends FormRequest
{
    /**
     * Another store's category is reported as 404 before any validation runs.
     */
    public function authorize(): Response
    {
        $category = $this->route('category');

        return $category ? Gate::inspect('update', $category) : Response::allow();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => [
                'required', 'string', 'max:80',
                Rule::unique('product_categories')->where('store_id', $this->user()->store->id)->ignore($this->route('category')),
            ],
            'description' => ['nullable', 'string', 'max:300'],
            'is_active' => ['sometimes', 'boolean'],
            'position' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'remove_image' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => __('products.category_name_required'),
            'name.max' => __('products.category_name_max'),
            'name.unique' => __('products.category_name_taken'),
            'image.image' => __('forms.file_type'),
            'image.mimes' => __('forms.image_type'),
            'image.max' => __('forms.image_too_large', ['size' => 2]),
        ];
    }
}
