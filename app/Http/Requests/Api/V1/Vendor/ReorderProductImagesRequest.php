<?php

namespace App\Http\Requests\Api\V1\Vendor;

use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class ReorderProductImagesRequest extends FormRequest
{
    /**
     * Another store's product is reported as 404 before any validation runs.
     */
    public function authorize(): Response
    {
        return Gate::inspect('update', $this->route('product'));
    }

    /**
     * The product's image ids in their new order (the first becomes the main image).
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'image_ids' => ['required', 'array'],
            'image_ids.*' => ['integer', 'distinct', Rule::exists('product_images', 'id')->where('product_id', $this->route('product')->id)],
        ];
    }
}
