<?php

namespace App\Http\Requests\Api\V1\Vendor;

use App\Enums\AffiliateTier;
use App\Enums\PayoutMethod;
use App\Models\Affiliate;
use App\Models\Store;
use App\Support\PhoneNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAffiliateRequest extends FormRequest
{
    /**
     * Normalize the phone before the per-store uniqueness check.
     */
    protected function prepareForValidation(): void
    {
        $this->merge(['phone' => PhoneNumber::normalize($this->input('phone'))]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'min:5', 'max:255'],
            'phone' => [
                'required', 'regex:'.PhoneNumber::PATTERN,
                Rule::unique('affiliates', 'phone')
                    ->where('store_id', $this->targetStore()->id)
                    ->ignore($this->editedAffiliate()?->id),
            ],
            'email' => ['nullable', 'email', 'max:255'],
            'password' => [$this->passwordPresence(), 'string', 'min:8', 'regex:/[A-Za-z]/', 'regex:/\d/', 'confirmed'],
            'avatar' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'tier' => ['required', Rule::enum(AffiliateTier::class)],
            'payout_method' => ['required', 'array:type,account_name,account_number,bank_name,iban'],
            'payout_method.type' => ['required', Rule::enum(PayoutMethod::class)],
            'payout_method.account_name' => ['required', 'string', 'max:255'],
            'payout_method.account_number' => ['required', 'string', 'max:64'],
            'payout_method.bank_name' => ['nullable', 'string', 'max:255', 'required_if:payout_method.type,'.PayoutMethod::BankAccount->value],
            'payout_method.iban' => ['nullable', 'string', 'max:34'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'full_name.required' => 'أدخل اسم المسوق بالكامل',
            'full_name.min' => 'اكتب الاسم الثنائي على الأقل',
            'phone.required' => 'أدخل رقم هاتف المسوق',
            'phone.regex' => 'رقم الهاتف غير صحيح، مثال: 01012345678',
            'phone.unique' => 'رقم الهاتف مسجل لمسوق آخر بالفعل',
            'email.email' => 'صيغة البريد الإلكتروني غير صحيحة',
            'password.required' => 'أدخل كلمة مرور للمسوق',
            'password.min' => 'كلمة المرور يجب أن تكون ٨ أحرف على الأقل وتحتوي على حروف وأرقام',
            'password.regex' => 'كلمة المرور يجب أن تكون ٨ أحرف على الأقل وتحتوي على حروف وأرقام',
            'password.confirmed' => 'كلمتا المرور غير متطابقتين',
            'avatar.image' => 'نوع الملف غير مدعوم',
            'avatar.mimes' => 'نوع الملف غير مدعوم، استخدم PNG أو JPG أو WEBP',
            'avatar.max' => 'حجم الملف يتجاوز ٢ ميجابايت',
            'tier.required' => 'اختر شريحة المسوق',
            'tier.enum' => 'شريحة غير معروفة',
            'payout_method.required' => 'اختر وسيلة السحب',
            'payout_method.type.required' => 'اختر وسيلة السحب',
            'payout_method.type.enum' => 'وسيلة سحب غير معروفة',
            'payout_method.account_name.required' => 'أدخل اسم صاحب الحساب',
            'payout_method.account_number.required' => 'أدخل رقم الحساب أو المحفظة',
            'payout_method.bank_name.required_if' => 'أدخل اسم البنك',
        ];
    }

    /**
     * The store the affiliate joins; phone numbers are unique per store.
     */
    protected function targetStore(): Store
    {
        return $this->user()->store;
    }

    /**
     * The affiliate being edited, or null when creating.
     */
    protected function editedAffiliate(): ?Affiliate
    {
        return null;
    }

    protected function passwordPresence(): string
    {
        return 'required';
    }
}
