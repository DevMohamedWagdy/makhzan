<?php

namespace App\Http\Requests\Api\V1\Vendor;

use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * Creates or updates a collection (POST /collections, PUT /collections/{collection}).
 */
class SaveProductCollectionRequest extends FormRequest
{
    /**
     * Another store's collection is reported as 404 before any validation runs.
     */
    public function authorize(): Response
    {
        $collection = $this->route('collection');

        return $collection ? Gate::inspect('update', $collection) : Response::allow();
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
                Rule::unique('product_collections')->where('store_id', $this->user()->store->id)->ignore($this->route('collection')),
            ],
            'name_en' => ['nullable', 'string', 'max:80'],
            'is_active' => ['sometimes', 'boolean'],
            'position' => ['sometimes', 'integer', 'min:0', 'max:65535'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => __('products.collection_name_required'),
            'name.max' => __('products.collection_name_max'),
            'name.unique' => __('products.collection_name_taken'),
        ];
    }
}
