<?php

namespace App\Http\Requests\Api\V1\Vendor;

use Illuminate\Auth\Access\Response;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Validator;

class StoreProductImagesRequest extends FormRequest
{
    /**
     * Another store's product is reported as 404 before any validation runs.
     */
    public function authorize(): Response
    {
        return Gate::inspect('update', $this->route('product'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'images' => ['required', 'array', 'min:1'],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ];
    }

    /**
     * A product holds at most `makhzan.products.max_images` photos in total.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $max = config('makhzan.products.max_images');
                $total = $this->route('product')->images()->count() + count((array) $this->file('images'));

                if ($total > $max) {
                    $validator->errors()->add('images', "الحد الأقصى {$max} صور للمنتج");
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'images.required' => 'اختر صورة واحدة على الأقل',
            'images.*.image' => 'نوع الملف غير مدعوم',
            'images.*.mimes' => 'نوع الملف غير مدعوم، استخدم PNG أو JPG أو WEBP',
            'images.*.max' => 'حجم الصورة يتجاوز ٤ ميجابايت',
        ];
    }
}
