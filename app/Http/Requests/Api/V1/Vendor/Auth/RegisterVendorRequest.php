<?php

namespace App\Http\Requests\Api\V1\Vendor\Auth;

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
        $governorates = config('makhzan.governorates');

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
            'store.governorate_id' => ['required', 'string', Rule::in(array_keys($governorates))],
            'store.city_id' => ['required', 'string', Rule::in($governorates[$this->input('store.governorate_id')] ?? [])],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'vendor.full_name.required' => 'أدخل اسمك بالكامل',
            'vendor.full_name.min' => 'اكتب الاسم الثنائي على الأقل',
            'vendor.phone.required' => 'أدخل رقم الهاتف / الواتساب',
            'vendor.phone.regex' => 'رقم الهاتف غير صحيح، مثال: 01012345678',
            'vendor.phone.unique' => 'رقم الهاتف مسجل بالفعل',
            'vendor.email.required' => 'أدخل البريد الإلكتروني',
            'vendor.email.email' => 'صيغة البريد الإلكتروني غير صحيحة',
            'vendor.email.unique' => 'البريد الإلكتروني مسجل بالفعل',
            'vendor.password.required' => 'أدخل كلمة المرور',
            'vendor.password.min' => 'كلمة المرور يجب أن تكون ٨ أحرف على الأقل وتحتوي على حروف وأرقام',
            'vendor.password.regex' => 'كلمة المرور يجب أن تكون ٨ أحرف على الأقل وتحتوي على حروف وأرقام',
            'vendor.password.confirmed' => 'كلمتا المرور غير متطابقتين',
            'store.name.required' => 'أدخل اسم المتجر',
            'store.name.min' => 'اسم المتجر قصير جداً',
            'store.slug.required' => 'اختر رابطاً لمتجرك',
            'store.slug.min' => 'استخدم حروفاً إنجليزية صغيرة وأرقاماً وشرطة (-) فقط، من ٣ إلى ٤٠ حرفاً',
            'store.slug.max' => 'استخدم حروفاً إنجليزية صغيرة وأرقاماً وشرطة (-) فقط، من ٣ إلى ٤٠ حرفاً',
            'store.slug.regex' => 'استخدم حروفاً إنجليزية صغيرة وأرقاماً وشرطة (-) فقط، من ٣ إلى ٤٠ حرفاً',
            'store.slug.not_in' => 'هذا الرابط محجوز، جرّب اسماً آخر',
            'store.slug.unique' => 'هذا الرابط محجوز، جرّب اسماً آخر',
            'store.logo.image' => 'نوع الملف غير مدعوم',
            'store.logo.mimes' => 'نوع الملف غير مدعوم، استخدم PNG أو JPG أو WEBP',
            'store.logo.max' => 'حجم الملف يتجاوز ٢ ميجابايت',
            'store.governorate_id.required' => 'اختر المحافظة',
            'store.governorate_id.in' => 'اختر المحافظة',
            'store.city_id.required' => 'اختر المدينة',
            'store.city_id.in' => 'المدينة لا تتبع المحافظة المختارة',
        ];
    }
}
